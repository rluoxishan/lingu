import type { CloudVehicleStatus, RegisterVehicleInfo, VehicleConfig } from "../models/types.js";

export class VehicleStatusStore {
  private readonly byClientId = new Map<string, CloudVehicleStatus>();

  upsert(status: CloudVehicleStatus, clientId: string): void {
    this.byClientId.set(clientId, {
      ...status,
      clientId,
      vehicleId: status.vehicleId || clientId,
      online: true,
      updatedAt: status.updatedAt || Date.now(),
    });
  }

  getByClientId(clientId: string, staleThresholdMs: number): CloudVehicleStatus | undefined {
    const status = this.byClientId.get(clientId);
    if (!status) return undefined;
    if (Date.now() - status.updatedAt > staleThresholdMs) {
      return { ...status, online: false };
    }
    return status;
  }

  getForVehicle(
    vehicle: VehicleConfig,
    staleThresholdMs: number,
  ): CloudVehicleStatus | undefined {
    return this.getByClientId(vehicle.clientId, staleThresholdMs);
  }

  fetchStatuses(
    vehicles: VehicleConfig[],
    staleThresholdMs: number,
  ): Map<string, CloudVehicleStatus> {
    const result = new Map<string, CloudVehicleStatus>();
    for (const vehicle of vehicles) {
      const status = this.getForVehicle(vehicle, staleThresholdMs);
      if (status) {
        result.set(vehicle.vehicleId, status);
      }
    }
    return result;
  }

  fetchRegisterInfos(
    vehicles: VehicleConfig[],
    staleThresholdMs: number,
  ): RegisterVehicleInfo[] {
    return vehicles.map((vehicle) => {
      const status = this.getForVehicle(vehicle, staleThresholdMs);
      if (!status) {
        return {
          vehicleId: vehicle.vehicleId,
          online: false,
          workStatus: 0,
          battery: 0,
          updatedAt: Date.now(),
          error: "no mqtt 1010001 received yet",
        };
      }
      const position = status.positionLonLat
        ? { x: status.positionLonLat.lon, y: status.positionLonLat.lat }
        : status.positionXyz
          ? { x: status.positionXyz.x, y: status.positionXyz.y }
          : undefined;

      return {
        vehicleId: vehicle.vehicleId,
        online: status.online,
        workStatus: status.workStatus,
        battery: status.battery,
        updatedAt: status.updatedAt,
        position,
        taskId: status.taskId,
        taskName: status.taskName,
      };
    });
  }
}
