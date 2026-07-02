import { CloudApiError, CloudClient } from "./cloudClient.js";
import type { VehicleDataSource } from "./vehicleDataSource.js";

/** 云平台 HTTP 数据源（实验室 / 有网环境） */
export class CloudVehicleDataSource implements VehicleDataSource {
  constructor(private readonly cloudClient: CloudClient) {}

  fetchVehicleInfosForRegister(vehicleIds: string[]) {
    return this.cloudClient.fetchVehicleInfosForRegister(vehicleIds);
  }

  fetchVehicleStatuses(vehicleIds: string[]) {
    return this.cloudClient.fetchVehicleStatuses(vehicleIds);
  }

  dispatchImmediateNavigation(request: Parameters<CloudClient["dispatchImmediateNavigation"]>[0]) {
    return this.cloudClient.dispatchImmediateNavigation(request);
  }
}

export { CloudApiError };
