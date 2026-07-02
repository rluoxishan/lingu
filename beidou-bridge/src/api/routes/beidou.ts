import type { FastifyInstance } from "fastify";
import type { AppConfig, BeidouNavigationRequest, RegisterCallbackBody } from "../../models/types.js";
import { getEnabledVehicles } from "../../config/loadConfig.js";
import { isVehicleAllowed } from "../../config/pushTargets.js";
import { CloudApiError } from "../../clients/cloudClient.js";
import { VehicleDataSourceError } from "../../clients/mqttVehicleDataSource.js";
import type { VehicleDataSource } from "../../clients/vehicleDataSource.js";
import { CallbackStore } from "../../store/callbackStore.js";
import { PushScheduler, describeRegistrationChanges, isSameRegisterRequest, sameVehicleIds } from "../../scheduler/pushScheduler.js";
import { fail, ok } from "../response.js";

export interface RouteDeps {
  config: AppConfig;
  callbackStore: CallbackStore;
  vehicleDataSource: VehicleDataSource;
  mqttConnected?: () => boolean | null;
  pushScheduler: PushScheduler;
}

function resolveProjectVehicleIds(config: AppConfig): string[] {
  return getEnabledVehicles(config).map((v) => v.vehicleId);
}

export function registerBeidouRoutes(app: FastifyInstance, deps: RouteDeps): void {
  app.get("/health", async () => ({
    status: "up",
    dataSource: deps.config.dataSource,
    mqttConnected: deps.mqttConnected?.() ?? null,
  }));

  app.post<{ Body: RegisterCallbackBody }>(
    "/api/v1/beidou/callback/register",
    async (request, reply) => {
      const body = request.body as RegisterCallbackBody | undefined;
      const { url, frequency } = body ?? ({} as RegisterCallbackBody);
      const vehicleIds = resolveProjectVehicleIds(deps.config);

      if (!url || typeof url !== "string") {
        return reply.status(400).send(fail(400, "url is required"));
      }
      if (!frequency || frequency <= 0) {
        return reply.status(400).send(fail(400, "frequency must be positive"));
      }

      const { frequencyMinMs, frequencyMaxMs } = deps.config.push;
      if (frequency < frequencyMinMs || frequency > frequencyMaxMs) {
        return reply
          .status(400)
          .send(
            fail(
              400,
              `frequency must be between ${frequencyMinMs} and ${frequencyMaxMs} ms`,
            ),
          );
      }

      if (vehicleIds.length === 0) {
        return reply.status(400).send(fail(400, "no enabled vehicles configured for this project"));
      }

      const prevRegistration = deps.callbackStore.get();
      const refreshOnly = isSameRegisterRequest(prevRegistration, url, frequency);

      if (!refreshOnly) {
        // url 或 frequency 变更：停止旧推送并重建调度
        deps.pushScheduler.stop();
      }

      let vehicles;
      try {
        vehicles = await deps.vehicleDataSource.fetchVehicleInfosForRegister(vehicleIds);
      } catch (error) {
        if (error instanceof CloudApiError || error instanceof VehicleDataSourceError) {
          return reply.status(502).send(fail(502, error.message));
        }
        request.log.error(error);
        return reply.status(500).send(fail(500, "failed to fetch vehicle info"));
      }

      if (refreshOnly && prevRegistration) {
        // 请求参数未变：不重启调度；仅刷新响应中的车辆快照
        if (!sameVehicleIds(prevRegistration.vehicleIds, vehicleIds)) {
          deps.callbackStore.save({ ...prevRegistration, vehicleIds });
        }
        request.log.info("beidou register refresh only (scheduler unchanged)");
        return ok({
          registeredAt: prevRegistration.registeredAt,
          frequency: prevRegistration.frequency,
          vehicleCount: vehicleIds.length,
          vehicleIds,
          vehicles,
          configChanges: [],
        });
      }

      const registeredAt = Date.now();
      const registration = { url, frequency, registeredAt, vehicleIds };
      const configChanges = describeRegistrationChanges(prevRegistration, registration);

      deps.callbackStore.save(registration);
      deps.pushScheduler.restart();

      request.log.info({ configChanges }, "beidou register applied");

      return ok({
        registeredAt,
        frequency,
        vehicleCount: vehicleIds.length,
        vehicleIds,
        vehicles,
        configChanges,
      });
    },
  );

  app.post<{ Body: BeidouNavigationRequest }>(
    "/api/v1/beidou/navigation",
    async (request, reply) => {
      const body = request.body as BeidouNavigationRequest;
      const registration = deps.callbackStore.get();

      if (!body?.vehicleId || !isVehicleAllowed(body.vehicleId, deps.config, registration)) {
        return reply.status(400).send(fail(400, "invalid or unknown vehicleId"));
      }

      const hasTaskPoint = typeof body.taskPoint === "string" && body.taskPoint.length > 0;
      const hasXYZW =
        body.taskPointXYZW &&
        [body.taskPointXYZW.x, body.taskPointXYZW.y, body.taskPointXYZW.z, body.taskPointXYZW.w].every(
          (v) => v !== undefined,
        );
      const hasBeidouCoords =
        body.x !== undefined && body.y !== undefined && body.direction !== undefined;

      const modeCount = [hasTaskPoint, hasXYZW, hasBeidouCoords].filter(Boolean).length;
      if (modeCount === 0) {
        return reply.status(400).send(
          fail(
            400,
            "provide taskPoint (name), taskPointXYZW {x,y,z,w}, or x+y+direction (Beidou coords)",
          ),
        );
      }
      if (modeCount > 1) {
        return reply.status(400).send(fail(400, "provide only one dispatch mode"));
      }

      try {
        const result = await deps.vehicleDataSource.dispatchImmediateNavigation(body);
        return ok({
          vehicleId: body.vehicleId,
          cloudTaskId: result.cloudTaskId,
          acceptedAt: result.acceptedAt,
        });
      } catch (error) {
        if (error instanceof CloudApiError || error instanceof VehicleDataSourceError) {
          if (error.statusCode === 404) {
            return reply.status(404).send(fail(404, error.message));
          }
          if (error.statusCode === 400) {
            return reply.status(400).send(fail(400, error.message));
          }
          return reply.status(502).send(fail(502, error.message));
        }
        request.log.error(error);
        return reply.status(500).send(fail(500, "internal error"));
      }
    },
  );
}
