import type {
  BeidouNavigationRequest,
  CloudVehicleStatus,
  RegisterVehicleInfo,
} from "../models/types.js";

export interface NavigationResult {
  cloudTaskId: string;
  taskId: string;
  acceptedAt: number;
}

export interface VehicleDataSource {
  fetchVehicleInfosForRegister(vehicleIds: string[]): Promise<RegisterVehicleInfo[]>;
  fetchVehicleStatuses(vehicleIds: string[]): Promise<Map<string, CloudVehicleStatus>>;
  dispatchImmediateNavigation(request: BeidouNavigationRequest): Promise<NavigationResult>;
}
