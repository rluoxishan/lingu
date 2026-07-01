export interface VehicleConfig {
  vehicleId: string;
  clientId: string;
  floor: number;
  enabled: boolean;
}

export interface VehiclesConfig {
  vehicles: VehicleConfig[];
}

export interface CloudAuthConfig {
  /** lingu_admin_login：管理后台；tpapi_login：第三方机机（RSA 加密密码） */
  type: string;
  loginPath?: string;
  tenantName?: string;
  username: string;
  password: string;
  /** tpapi_login：第三方 API 根路径 */
  tpapiBaseUrl?: string;
  /** tpapi_login：GET public_key 的 id 参数 */
  publicKeyId?: string;
  publicKeyPath?: string;
  tpapiLoginPath?: string;
}

export interface CloudConfig {
  baseUrl: string;
  mock: boolean;
  timeoutMs: number;
  tenantId: string;
  /** 为 true 时从 select_task_by_page 补充 currentTask */
  enrichTaskFromList: boolean;
  /** lonlat: position 字段为经度,纬度；map_xy: 使用 positionXyz 米制坐标 */
  positionMode: "lonlat" | "map_xy";
  /** 状态查询：batch 一次拉全量；single 逐车查详情 */
  statusQueryMode: "batch" | "single";
  /** 批量查多车状态路径（admin-api 或 tpapi 相对路径） */
  statusBatchPath: string;
  /** admin-api | tpapi；默认 tpapi_login 时为 tpapi */
  apiMode?: "admin" | "tpapi";
  /** tpapi 批量设备详情（POST body: deviceIdList） */
  tpapiDeviceDetailListPath?: string;
  /** tpapi 下发任务点位（POST body: deviceId, taskPoint） */
  tpapiSetTaskPointPath?: string;
  /** tpapi 获取设备任务点位（GET ?deviceId=） */
  tpapiGetTaskPointPath?: string;
  /** admin-api 基址；tpapi 模式下坐标反控 fallback（可选） */
  adminApiBaseUrl?: string;
  auth: CloudAuthConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface PushConfig {
  retryTimes: number;
  retryIntervalMs: number;
  requestTimeoutMs: number;
  /** 北斗 register frequency 下限（毫秒） */
  frequencyMinMs: number;
  /** 北斗 register frequency 上限（毫秒） */
  frequencyMaxMs: number;
}

export interface AppConfig {
  server: ServerConfig;
  push: PushConfig;
  dataDir: string;
  cloud: CloudConfig;
  vehicles: VehicleConfig[];
}

export interface BeidouCallbackRegistration {
  url: string;
  frequency: number;
  registeredAt: number;
  /** 北斗 register 下发的设备 ID 列表（= 云平台 deviceId） */
  vehicleIds: string[];
}

export interface CloudVehicleStatus {
  vehicleId: string;
  clientId: string;
  online: boolean;
  updatedAt: number;
  /** 地图坐标系 x,y,yaw（米,米,弧度），若云 API 提供 */
  positionXyz?: { x: number; y: number; yaw: number };
  /** WGS84 经纬度，来自 select_device_detail_by_id.position */
  positionLonLat?: { lon: number; lat: number };
  heading?: number;
  workStatus: number;
  battery: number;
  taskId?: string;
  taskName?: string;
  faultSummary?: {
    hasFault: boolean;
    faultCount?: number;
    highestFaultLevel?: number;
  };
  alertMsg?: string;
}

export interface BeidouAlertItem {
  alertType: number;
  alertMsg: string;
}

/** 0629：vehicleId 与 alertList 均在 data 内 */
export interface BeidouPushData {
  vehicleId: string;
  x: number;
  y: number;
  z: number;
  floor: number;
  state: number;
  powerLevel: number;
  currentTask: string;
  isAlert: boolean;
  alertList: BeidouAlertItem[];
  direction: number;
}

export interface BeidouPushPayload {
  data: BeidouPushData;
  timestamp: number;
}

export interface DeviceTaskPointsResult {
  deviceId: string;
  /** 云平台原始 data（文档示例为设备数组；任务点列表字段待云确认） */
  raw: unknown;
  /** 若响应含字符串数组或 taskPoint 字段则尽力解析 */
  taskPoints: string[];
}

/** 2010001 坐标模式 / tpapi taskPointXYZW：地图 x,y + 四元数 z,w */
export interface TaskPointXYZW {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface BeidouNavigationRequest {
  vehicleId: string;
  /** 模式 A：任务名/站点名（2010001 taskPoint）；其它字段为空 */
  taskPoint?: string;
  /** 模式 B：目标点坐标 + 姿态四元数 z,w（口岸中转发点位） */
  taskPointXYZW?: TaskPointXYZW;
  /** 兼容北斗 0630：x,y + direction(度) → 内部转换为 taskPointXYZW */
  x?: number;
  y?: number;
  z?: number;
  direction?: number;
  floor?: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface RegisterCallbackBody {
  url: string;
  frequency: number;
}

/** register 响应中返回的云平台设备快照 */
export interface RegisterVehicleInfo {
  vehicleId: string;
  online: boolean;
  workStatus: number;
  battery: number;
  position?: { x: number; y: number };
  taskId?: string;
  taskName?: string;
  updatedAt: number;
  error?: string;
}

export interface BeidouClientResponse {
  code: number;
  msg: string;
  timestamp: number;
}
