import type { VehicleStatusVO } from '@/views/car/car/types'
import type {
  CloudDeviceBatchItem,
  DeviceDetailData,
  DevicePageItem,
  DeviceTelemetryDetails,
  VehicleInfoData
} from './types'

function parsePositionXyz(raw?: string): VehicleStatusVO['positionXyz'] | undefined {
  if (!raw) return undefined
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return undefined
  return { x: parts[0], y: parts[1], yaw: parts[2] ?? 0 }
}

function parsePositionLonLat(raw?: string): VehicleStatusVO['positionLonLat'] | undefined {
  if (!raw) return undefined
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return undefined
  return { lon: parts[0], lat: parts[1] }
}

function parseVehicleInfo(raw?: string | VehicleInfoData): VehicleStatusVO['vehicleInfo'] | undefined {
  if (!raw) return undefined
  let data: VehicleInfoData
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw) as VehicleInfoData
    } catch {
      return undefined
    }
  } else {
    data = raw
  }
  return {
    odometry: data.odometry,
    drivingMode: data.drving_mode ?? data.driving_mode,
    vehicleSpeed: data.vehicle_speed
  }
}

function mapErrors(errors: unknown): Pick<VehicleStatusVO, 'faultSummary' | 'alertMsg'> {
  if (errors == null) {
    return {
      faultSummary: { hasFault: false, faultCount: 0, highestFaultLevel: 1 },
      alertMsg: ''
    }
  }
  const hasFault = Array.isArray(errors)
    ? errors.length > 0
    : typeof errors === 'object'
      ? Object.keys(errors as object).length > 0
      : Boolean(errors)
  const alertMsg = hasFault
    ? typeof errors === 'string'
      ? errors
      : JSON.stringify(errors).slice(0, 500)
    : ''
  return {
    faultSummary: {
      hasFault,
      faultCount: Array.isArray(errors) ? errors.length : hasFault ? 1 : 0,
      highestFaultLevel: hasFault ? 2 : 1
    },
    alertMsg
  }
}

function mapMetaFields(
  target: VehicleStatusVO,
  source: {
    id?: string
    name?: string
    deviceName?: string
    info?: string
    description?: string
    remark?: string
    clientId?: string
    emqxUsername?: string
  }
): void {
  target.vehicleName = source.name ?? source.deviceName ?? target.vehicleName ?? ''
  const desc = source.info ?? source.description ?? source.remark
  if (desc) target.vehicleDescription = desc
  if (source.emqxUsername || source.clientId || source.id) {
    target.emqxUsername = source.emqxUsername ?? source.clientId ?? source.id ?? target.clientId
  }
  if (source.clientId) {
    target.clientId = source.clientId
  }
}

function mapTelemetryFields(target: VehicleStatusVO, detail: DeviceTelemetryDetails): void {
  if (detail.workStatus !== undefined) {
    target.workStatus = detail.workStatus as VehicleStatusVO['workStatus']
  }
  if (detail.battery !== undefined) target.battery = detail.battery
  if (detail.heading !== undefined) target.heading = detail.heading
  if (detail.taskId !== undefined) target.taskId = detail.taskId
  if (detail.taskName !== undefined) target.taskName = detail.taskName

  mapMetaFields(target, { ...detail, id: target.vehicleId })

  const xyz = parsePositionXyz(detail.position_xyz)
  if (xyz) target.positionXyz = xyz

  const lonLat = parsePositionLonLat(detail.position)
  if (lonLat) target.positionLonLat = lonLat
  else if (detail.position) target.positionRaw = detail.position

  target.inNodeName = detail.inNodeName
  target.inNodeTime = detail.inNodeTime
  target.nextNodeName = detail.nextNodeName
  target.nextNodeTime = detail.nextNodeTime
  target.isInNode = detail.isInNode
  target.taskProgress = detail.taskProgress
  target.speedMps = detail.speedMps
  target.brakeStatus = detail.brakeStatus
  target.robotStatus = detail.robotStatus

  const vehicleInfo = parseVehicleInfo(detail.vehicleInfo)
  if (vehicleInfo) target.vehicleInfo = vehicleInfo
}

function mapPageMetaFields(target: VehicleStatusVO, item: DevicePageItem): void {
  mapMetaFields(target, item)
  target.online = item.online ?? false
  target.updatedAt = item.updateTime ?? target.updatedAt
  target.createTime = item.createTime
  target.connectedAt = item.connectedAt
  target.disconnectedAt = item.disconnectedAt
  target.enableConnectToEmqx = item.enableConnectToEmqx
  target.regionName = item.regionName
  target.tenantId = item.tenantId
  target.tenantName = item.tenantName
  target.deleted = item.deleted

  const fault = mapErrors(item.errors)
  target.faultSummary = fault.faultSummary
  target.alertMsg = fault.alertMsg
}

export function telemetryHasCoreFields(detail?: DeviceTelemetryDetails | null): boolean {
  if (!detail) return false
  return detail.workStatus !== undefined && detail.battery !== undefined
}

export function batchItemHasStatusFields(item: CloudDeviceBatchItem): boolean {
  return item.workStatus !== undefined && item.battery !== undefined
}

export function mapDevicePageItem(item: DevicePageItem): VehicleStatusVO {
  const status: VehicleStatusVO = {
    vehicleId: item.id,
    clientId: item.clientId ?? item.id,
    online: item.online ?? false,
    updatedAt: item.updateTime ?? Date.now(),
    workStatus: 0,
    battery: 0,
    faultSummary: { hasFault: false, faultCount: 0, highestFaultLevel: 1 }
  }

  mapPageMetaFields(status, item)

  if (item.details) {
    mapTelemetryFields(status, item.details)
  } else {
    mapTelemetryFields(status, item)
  }

  return status
}

export function mapBatchItem(item: CloudDeviceBatchItem): VehicleStatusVO {
  const pageItem: DevicePageItem = {
    id: item.id,
    name: item.name,
    info: item.info,
    online: item.online,
    clientId: item.clientId,
    emqxUsername: item.emqxUsername,
    workStatus: item.workStatus,
    battery: item.battery,
    position: item.position,
    position_xyz: item.position_xyz,
    heading: item.heading,
    taskId: item.taskId,
    taskName: item.taskName,
    details: item
  }
  return mapDevicePageItem(pageItem)
}

export function mapDeviceDetail(
  deviceId: string,
  detail: DeviceDetailData,
  online = true,
  pageMeta?: Partial<DevicePageItem>
): VehicleStatusVO {
  const status: VehicleStatusVO = {
    vehicleId: deviceId,
    clientId: deviceId,
    online,
    updatedAt: Date.now(),
    workStatus: 0,
    battery: 0,
    faultSummary: { hasFault: false, faultCount: 0, highestFaultLevel: 1 }
  }

  if (pageMeta) {
    mapPageMetaFields(status, { id: deviceId, ...pageMeta } as DevicePageItem)
  }

  mapTelemetryFields(status, detail)
  return status
}

export function mergeDetailIntoStatus(
  status: VehicleStatusVO,
  detail: DeviceDetailData
): void {
  mapTelemetryFields(status, detail)
}
