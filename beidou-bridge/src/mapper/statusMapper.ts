import type { CloudConfig, CloudVehicleStatus, VehicleConfig } from "../models/types.js";
import type { BeidouPushData } from "../models/types.js";

/**
 * 云侧设备详情 → 北斗推送 data。
 * positionMode=lonlat 时 x/y 为经度/纬度（待与北斗确认是否接受）。
 */
export function mapStatusToBeidou(
  status: CloudVehicleStatus,
  vehicle: VehicleConfig,
  cloud: CloudConfig,
): BeidouPushData {
  const { x, y } = resolveXY(status, cloud.positionMode);
  const heading = status.heading ?? 0;
  const hasFault = status.faultSummary?.hasFault ?? false;
  const currentTask = status.taskName ?? status.taskId ?? "";
  const alertMsg = status.alertMsg ?? "";

  return {
    vehicleId: vehicle.vehicleId,
    x,
    y,
    z: 0,
    floor: vehicle.floor,
    state: status.workStatus,
    powerLevel: status.battery,
    currentTask,
    isAlert: hasFault,
    alertList: hasFault ? [{ alertType: 1, alertMsg }] : [],
    direction: Math.round(heading),
  };
}

function resolveXY(
  status: CloudVehicleStatus,
  mode: CloudConfig["positionMode"],
): { x: number; y: number } {
  if (mode === "map_xy" && status.positionXyz) {
    return { x: status.positionXyz.x, y: status.positionXyz.y };
  }
  if (status.positionLonLat) {
    return { x: status.positionLonLat.lon, y: status.positionLonLat.lat };
  }
  if (status.positionXyz) {
    return { x: status.positionXyz.x, y: status.positionXyz.y };
  }
  return { x: 0, y: 0 };
}
