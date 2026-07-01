import type { AppConfig, BeidouCallbackRegistration, VehicleConfig } from "../models/types.js";
import { getEnabledVehicles } from "./loadConfig.js";

/** 将 vehicleId 解析为推送用的车辆配置（floor 等）；未在 yaml 中则使用默认值 */
export function resolveVehicleConfig(vehicleId: string, config: AppConfig): VehicleConfig {
  const found = config.vehicles.find((v) => v.vehicleId === vehicleId);
  return (
    found ?? {
      vehicleId,
      clientId: vehicleId,
      floor: 1,
      enabled: true,
    }
  );
}

/** 推送目标：register 时快照的项目车辆列表，否则回退 vehicles.yaml */
export function getPushTargets(
  config: AppConfig,
  registration: BeidouCallbackRegistration | null,
): VehicleConfig[] {
  if (registration?.vehicleIds?.length) {
    return registration.vehicleIds.map((id) => resolveVehicleConfig(id, config));
  }
  return getEnabledVehicles(config);
}

/** 反控导航是否允许该 vehicleId */
export function isVehicleAllowed(
  vehicleId: string,
  config: AppConfig,
  registration: BeidouCallbackRegistration | null,
): boolean {
  if (registration?.vehicleIds?.length) {
    return registration.vehicleIds.includes(vehicleId);
  }
  return config.vehicles.some((v) => v.enabled && v.vehicleId === vehicleId);
}
