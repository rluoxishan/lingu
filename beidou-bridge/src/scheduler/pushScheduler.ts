import type { AppConfig, BeidouCallbackRegistration, CloudVehicleStatus } from "../models/types.js";
import { getPushTargets } from "../config/pushTargets.js";
import { BeidouClient } from "../clients/beidouClient.js";
import { CloudClient } from "../clients/cloudClient.js";
import { mapStatusToBeidou } from "../mapper/statusMapper.js";
import { CallbackStore } from "../store/callbackStore.js";

export class PushScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** 每次 cancel/restart 递增，用于作废进行中的 tick */
  private generation = 0;

  constructor(
    private readonly config: AppConfig,
    private readonly callbackStore: CallbackStore,
    private readonly cloudClient: CloudClient,
    private readonly beidouClient: BeidouClient,
  ) {}

  /** 停止推送任务（register 前调用，立即中断） */
  stop(): void {
    this.cancelCurrentTask("stop");
  }

  /** 取消旧任务并按最新 register 配置启动新定时器 */
  restart(): void {
    this.cancelCurrentTask("restart");

    const registration = this.callbackStore.get();
    if (!registration || registration.frequency <= 0) {
      console.log("[scheduler] no registration, push loop idle");
      return;
    }

    const gen = this.generation;
    const vehicleCount = getPushTargets(this.config, registration).length;

    console.log(
      `[scheduler] started: url=${registration.url} frequency=${registration.frequency}ms vehicles=${vehicleCount} generation=${gen}`,
    );

    this.timer = setInterval(() => {
      void this.tick(gen);
    }, registration.frequency);

    // 新任务启动后立即推一轮，不必等第一个 interval
    void this.tick(gen);
  }

  private cancelCurrentTask(reason: string): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.generation++;
    console.log(`[scheduler] cancelled (${reason}), generation=${this.generation}`);
  }

  private async tick(expectedGeneration: number): Promise<void> {
    if (expectedGeneration !== this.generation) return;
    if (this.running) return;
    this.running = true;

    try {
      const registration = this.callbackStore.get();
      if (!registration || expectedGeneration !== this.generation) return;

      const vehicles = getPushTargets(this.config, registration);
      const vehicleIds = vehicles.map((v) => v.vehicleId);

      let statusMap: Map<string, CloudVehicleStatus>;
      try {
        statusMap = await this.cloudClient.fetchVehicleStatuses(vehicleIds);
      } catch (error) {
        console.error("[scheduler] batch fetch vehicle statuses failed", error);
        return;
      }

      if (expectedGeneration !== this.generation) {
        console.log("[scheduler] tick aborted: superseded by new registration");
        return;
      }

      for (const vehicle of vehicles) {
        if (expectedGeneration !== this.generation) {
          console.log("[scheduler] tick aborted mid-push: superseded by new registration");
          return;
        }

        const status = statusMap.get(vehicle.vehicleId);
        if (!status) {
          console.warn(`[scheduler] no status for vehicle=${vehicle.vehicleId}`);
          continue;
        }

        try {
          const payload = {
            data: mapStatusToBeidou(status, vehicle, this.config.cloud),
            timestamp: Date.now(),
          };

          const result = await this.beidouClient.pushStatus(registration.url, payload);
          if (result.code !== 1000) {
            console.warn(
              `[scheduler] beidou non-success vehicle=${vehicle.vehicleId} code=${result.code} msg=${result.msg}`,
            );
          } else {
            console.log(`[scheduler] pushed vehicle=${vehicle.vehicleId}`);
          }
        } catch (error) {
          console.error(`[scheduler] push failed vehicle=${vehicle.vehicleId}`, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

/** 请求参数（url + frequency）与已持久化注册一致 */
export function isSameRegisterRequest(
  prev: BeidouCallbackRegistration | null,
  url: string,
  frequency: number,
): boolean {
  return prev !== null && prev.url === url && prev.frequency === frequency;
}

/** 对比两次 register 配置差异，用于日志 */
export function describeRegistrationChanges(
  prev: BeidouCallbackRegistration | null,
  next: BeidouCallbackRegistration,
): string[] {
  if (!prev) return ["initial registration"];

  const changes: string[] = [];
  if (prev.url !== next.url) changes.push("url");
  if (prev.frequency !== next.frequency) changes.push("frequency");
  if (!sameVehicleIds(prev.vehicleIds, next.vehicleIds)) changes.push("vehicleIds");
  return changes.length > 0 ? changes : ["re-register unchanged"];
}

export function sameVehicleIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}
