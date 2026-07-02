import Fastify from "fastify";
import type { AppConfig } from "../models/types.js";
import { getEnabledVehicles } from "../config/loadConfig.js";
import { BeidouClient } from "../clients/beidouClient.js";
import { CloudClient } from "../clients/cloudClient.js";
import { CloudApiError, CloudVehicleDataSource } from "../clients/cloudVehicleDataSource.js";
import { MqttVehicleDataSource } from "../clients/mqttVehicleDataSource.js";
import type { VehicleDataSource } from "../clients/vehicleDataSource.js";
import { CallbackStore } from "../store/callbackStore.js";
import { PushScheduler } from "../scheduler/pushScheduler.js";
import { registerBeidouRoutes } from "./routes/beidou.js";

export interface AppContext {
  config: AppConfig;
  callbackStore: CallbackStore;
  vehicleDataSource: VehicleDataSource;
  mqttDataSource?: MqttVehicleDataSource;
  beidouClient: BeidouClient;
  pushScheduler: PushScheduler;
}

function createVehicleDataSource(config: AppConfig): {
  vehicleDataSource: VehicleDataSource;
  mqttDataSource?: MqttVehicleDataSource;
} {
  if (config.dataSource === "mqtt") {
    if (!config.mqtt) {
      throw new Error("dataSource=mqtt but mqtt config missing");
    }
    const mqttDataSource = new MqttVehicleDataSource(config.mqtt, config.vehicles);
    return { vehicleDataSource: mqttDataSource, mqttDataSource };
  }

  if (!config.cloud) {
    throw new Error("dataSource=cloud but cloud config missing");
  }
  const cloudClient = new CloudClient(config.cloud);
  return { vehicleDataSource: new CloudVehicleDataSource(cloudClient) };
}

export function createAppContext(config: AppConfig): AppContext {
  const callbackStore = new CallbackStore(config.dataDir);
  const { vehicleDataSource, mqttDataSource } = createVehicleDataSource(config);
  const beidouClient = new BeidouClient(config.push);
  const pushScheduler = new PushScheduler(
    config,
    callbackStore,
    vehicleDataSource,
    beidouClient,
  );

  return {
    config,
    callbackStore,
    vehicleDataSource,
    mqttDataSource,
    beidouClient,
    pushScheduler,
  };
}

export async function createServer(ctx: AppContext) {
  const app = Fastify({ logger: true });

  registerBeidouRoutes(app, {
    config: ctx.config,
    callbackStore: ctx.callbackStore,
    vehicleDataSource: ctx.vehicleDataSource,
    mqttConnected: () => ctx.mqttDataSource?.isConnected() ?? null,
    pushScheduler: ctx.pushScheduler,
  });

  return app;
}

export async function startServer(ctx: AppContext): Promise<void> {
  if (ctx.mqttDataSource) {
    await ctx.mqttDataSource.start();
  }

  const app = await createServer(ctx);
  const { host, port } = ctx.config.server;

  ctx.pushScheduler.restart();

  await app.listen({ host, port });
  console.log(
    `beidou-bridge listening on http://${host}:${port} dataSource=${ctx.config.dataSource}`,
  );
}

export { CloudApiError };
