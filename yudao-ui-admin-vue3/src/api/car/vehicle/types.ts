/** 遥测 details（1010001 / select_device_detail_by_id） */
export interface DeviceTelemetryDetails {
  workStatus?: number
  battery?: number
  position?: string
  position_xyz?: string
  heading?: number
  taskId?: string
  taskName?: string
  inNodeName?: string
  inNodeTime?: number
  nextNodeName?: string
  nextNodeTime?: number
  isInNode?: boolean
  taskProgress?: number
  speedMps?: number
  brakeStatus?: number
  robotStatus?: number
  /** 可能是 JSON 字符串或对象 */
  vehicleInfo?: string | VehicleInfoData
  name?: string
  deviceName?: string
  description?: string
  remark?: string
  clientId?: string
  emqxUsername?: string
}

export interface VehicleInfoData {
  odometry?: number
  drving_mode?: string
  driving_mode?: string
  vehicle_speed?: number
}

/** POST /device/select_device_by_page 列表项 */
export interface DevicePageItem {
  id: string
  name?: string
  info?: string
  online?: boolean
  createTime?: number
  updateTime?: number
  connectedAt?: number
  disconnectedAt?: number
  enableConnectToEmqx?: boolean
  regionName?: string
  tenantId?: number
  tenantName?: string
  deleted?: boolean
  errors?: unknown
  details?: DeviceTelemetryDetails | null
  /** 部分环境批量项仍带平铺遥测字段 */
  clientId?: string
  emqxUsername?: string
  workStatus?: number
  battery?: number
  position?: string
  position_xyz?: string
  heading?: number
  taskId?: string
  taskName?: string
}

export interface DevicePageData {
  list: DevicePageItem[]
  total: number
}

/** @deprecated 兼容 POST /device/select_all_device */
export interface CloudDeviceBatchItem {
  id: string
  name?: string
  deviceName?: string
  description?: string
  remark?: string
  info?: string
  clientId?: string
  emqxUsername?: string
  online?: boolean
  workStatus?: number
  battery?: number
  position?: string
  position_xyz?: string
  heading?: number
  taskId?: string
  taskName?: string
}

/** GET /device/select_device_detail_by_id 响应 data */
export type DeviceDetailData = DeviceTelemetryDetails

export interface TaskListItem {
  deviceId: string
  taskId: string
  taskName: string
  active?: boolean
}

export interface TaskPageData {
  list: TaskListItem[]
  total: number
}
