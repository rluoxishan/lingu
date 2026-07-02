import mqtt, { type MqttClient } from "mqtt";
import type {
  AppConfig,
  BeidouNavigationRequest,
  CloudVehicleStatus,
  MqttConfig,
  RegisterVehicleInfo,
  VehicleConfig,
} from "../models/types.js";
import {
  build2010001CoordinateMessage,
  build2010001TaskPointMessage,
  clientIdFromPubTopic,
  parse1010001Payload,
  topicFromPattern,
} from "../mapper/mqtt1010001Mapper.js";
import { resolveTaskPointXYZW } from "../mapper/taskPointDispatch.js";
import { VehicleStatusStore } from "../store/vehicleStatusStore.js";
import type { NavigationResult, VehicleDataSource } from "./vehicleDataSource.js";

export class MqttVehicleDataSource implements VehicleDataSource {
  private client: MqttClient | null = null;
  private connected = false;
  private readonly store = new VehicleStatusStore();
  private readonly clientIdToVehicle = new Map<string, VehicleConfig>();

  constructor(
    private readonly mqttConfig: MqttConfig,
    private readonly vehicles: VehicleConfig[],
  ) {
    for (const vehicle of vehicles) {
      if (vehicle.enabled) {
        this.clientIdToVehicle.set(vehicle.clientId, vehicle);
      }
    }
  }

  async start(): Promise<void> {
    if (this.client) return;

    const { brokerUrl, clientId, username, password } = this.mqttConfig;
    this.client = mqtt.connect(brokerUrl, {
      clientId,
      username: username || undefined,
      password: password || undefined,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
    });

    this.client.on("connect", () => {
      this.connected = true;
      console.log(`[mqtt] connected broker=${brokerUrl} clientId=${clientId}`);
      this.subscribeAll();
    });

    this.client.on("reconnect", () => {
      this.connected = false;
      console.log("[mqtt] reconnecting...");
    });

    this.client.on("close", () => {
      this.connected = false;
      console.log("[mqtt] connection closed");
    });

    this.client.on("error", (error) => {
      console.error("[mqtt] client error", error);
    });

    this.client.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString("utf8"));
    });
  }

  async stop(): Promise<void> {
    if (!this.client) return;
    await new Promise<void>((resolve) => {
      this.client!.end(false, {}, () => resolve());
    });
    this.client = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async fetchVehicleInfosForRegister(vehicleIds: string[]): Promise<RegisterVehicleInfo[]> {
    const vehicles = this.vehicles.filter(
      (v) => v.enabled && vehicleIds.includes(v.vehicleId),
    );
    return this.store.fetchRegisterInfos(vehicles, this.mqttConfig.staleThresholdMs);
  }

  async fetchVehicleStatuses(vehicleIds: string[]): Promise<Map<string, CloudVehicleStatus>> {
    const vehicles = this.vehicles.filter(
      (v) => v.enabled && vehicleIds.includes(v.vehicleId),
    );
    return this.store.fetchStatuses(vehicles, this.mqttConfig.staleThresholdMs);
  }

  async dispatchImmediateNavigation(request: BeidouNavigationRequest): Promise<NavigationResult> {
    const vehicle = this.vehicles.find((v) => v.vehicleId === request.vehicleId);
    if (!vehicle) {
      throw new VehicleDataSourceError(400, "unknown vehicleId");
    }

    if (!this.client?.connected) {
      throw new VehicleDataSourceError(502, "mqtt broker not connected");
    }

    const taskId = `BD-NAV-${Date.now()}`;
    let message: ReturnType<typeof build2010001CoordinateMessage>;

    if (request.taskPoint) {
      message = build2010001TaskPointMessage(taskId, request.taskPoint);
    } else {
      const xyzw = resolveTaskPointXYZW(request);
      if (!xyzw) {
        throw new VehicleDataSourceError(
          400,
          "provide taskPoint (name) or taskPointXYZW / x,y,direction (coordinates)",
        );
      }
      message = build2010001CoordinateMessage(taskId, xyzw);
    }

    const topic = topicFromPattern(this.mqttConfig.publishTopicPattern, vehicle.clientId);
    await this.publish(topic, message);

    return { taskId, cloudTaskId: taskId, acceptedAt: Date.now() };
  }

  private subscribeAll(): void {
    if (!this.client) return;
    for (const vehicle of this.vehicles) {
      if (!vehicle.enabled) continue;
      const topic = topicFromPattern(this.mqttConfig.subscribeTopicPattern, vehicle.clientId);
      this.client.subscribe(topic, { qos: 0 }, (error) => {
        if (error) {
          console.error(`[mqtt] subscribe failed topic=${topic}`, error);
        } else {
          console.log(`[mqtt] subscribed topic=${topic}`);
        }
      });
    }
  }

  private handleMessage(topic: string, raw: string): void {
    const clientId = clientIdFromPubTopic(topic);
    if (!clientId) return;

    const vehicle = this.clientIdToVehicle.get(clientId);
    if (!vehicle) return;

    const parsed = parse1010001Payload(raw);
    if (!parsed) return;

    this.store.upsert(
      {
        ...parsed,
        vehicleId: vehicle.vehicleId,
        clientId: vehicle.clientId,
      },
      clientId,
    );
  }

  private publish(topic: string, message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error("mqtt client not started"));
        return;
      }
      this.client.publish(topic, JSON.stringify(message), { qos: 2 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

export class VehicleDataSourceError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "VehicleDataSourceError";
  }
}
