/** 对齐 CLOUD-STATUS / 1010001 协议字段（与 beidou-bridge CloudVehicleStatus 一致） */

export interface VehicleStatusVO {

  vehicleId: string

  clientId: string

  vehicleName?: string

  vehicleDescription?: string

  emqxUsername?: string

  online: boolean

  updatedAt: number

  createTime?: number

  connectedAt?: number

  disconnectedAt?: number

  enableConnectToEmqx?: boolean

  regionName?: string

  tenantId?: number

  tenantName?: string

  deleted?: boolean

  positionXyz?: { x: number; y: number; yaw: number }

  positionLonLat?: { lon: number; lat: number }

  /** 无法解析为经纬度时的原始 position 字符串 */

  positionRaw?: string

  heading?: number

  workStatus: WorkStatusValue

  battery: number

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

  vehicleInfo?: {

    odometry?: number

    drivingMode?: string

    vehicleSpeed?: number

  }

  faultSummary?: {

    hasFault: boolean

    faultCount?: number

    highestFaultLevel?: number

  }

  alertMsg?: string

}



export type WorkStatusValue = 0 | 1 | 2 | 3 | 4



export const WORK_STATUS_MAP: Record<WorkStatusValue, { label: string; tagClass: string }> = {

  0: { label: '空闲', tagClass: 'status-tag--orange' },

  1: { label: '任务中', tagClass: 'status-tag--blue' },

  2: { label: '故障', tagClass: 'status-tag--red' },

  3: { label: '充电', tagClass: 'status-tag--yellow' },

  4: { label: '急停', tagClass: 'status-tag--red' }

}



export const ROBOT_STATUS_MAP: Record<number, string> = {

  0: '未知',

  1: '正常',

  2: '异常'

}



export const DRIVING_MODE_MAP: Record<string, string> = {

  auto_drive: '自动驾驶',

  manual: '手动',

  remote: '远程'

}



export const WORK_STATUS_FILTER_OPTIONS: { label: string; value: number }[] = [

  { label: '全部状态', value: -1 },

  ...([0, 1, 2, 3, 4] as WorkStatusValue[]).map((v) => ({

    label: WORK_STATUS_MAP[v].label,

    value: v

  }))

]



export const ONLINE_FILTER_OPTIONS = [

  { label: '全部在线', value: 'all' },

  { label: '在线', value: 'online' },

  { label: '离线', value: 'offline' }

] as const



export function formatWorkStatus(status: number): string {

  return WORK_STATUS_MAP[status as WorkStatusValue]?.label ?? `未知(${status})`

}



export function getWorkStatusClass(status: number): string {

  return WORK_STATUS_MAP[status as WorkStatusValue]?.tagClass ?? ''

}



export function formatPosition(xyz?: { x: number; y: number; yaw: number }): string {

  if (!xyz) return '-'

  return `${xyz.x.toFixed(2)}, ${xyz.y.toFixed(2)}`

}



export function formatPositionFull(xyz?: { x: number; y: number; yaw: number }): string {

  if (!xyz) return '-'

  return `X: ${xyz.x.toFixed(2)} m，Y: ${xyz.y.toFixed(2)} m，偏航: ${xyz.yaw.toFixed(2)} rad`

}



export function formatPositionLonLat(lonLat?: { lon: number; lat: number }, raw?: string): string {

  if (lonLat) return `经度 ${lonLat.lon.toFixed(6)}，纬度 ${lonLat.lat.toFixed(6)}`

  if (raw) return raw

  return '-'

}



/** heading 可能是弧度或度，自动识别 */

export function formatHeading(heading?: number): string {

  if (heading == null) return '-'

  if (Math.abs(heading) <= Math.PI * 2 + 0.01) {

    const deg = (heading * 180) / Math.PI

    return `${deg.toFixed(1)}°（${heading.toFixed(3)} rad）`

  }

  return `${heading.toFixed(1)}°`

}



export function formatUpdatedAt(ts?: number): string {

  if (!ts) return '-'

  return new Date(ts).toLocaleString('zh-CN', { hour12: false })

}



export function formatUpdatedAtShort(ts?: number): string {

  if (!ts) return '-'

  const d = new Date(ts)

  const p = (n: number) => String(n).padStart(2, '0')

  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`

}



export function formatInNodeLabel(row: VehicleStatusVO): string {

  if (row.inNodeName) return row.inNodeName

  if (row.isInNode === true) return '站点内'

  if (row.isInNode === false) return '站外'

  return '-'

}



export function formatListTask(row: VehicleStatusVO): string {

  if (row.taskName) return row.taskName

  return formatTaskId(row.taskId)

}



export function formatTaskId(taskId?: string): string {

  if (!taskId || taskId === '0') return '-'

  return taskId

}



export function formatBool(value?: boolean): string {

  if (value === undefined) return '-'

  return value ? '是' : '否'

}



export function formatPercent(value?: number): string {

  if (value == null) return '-'

  return `${value}%`

}



export function formatSpeedMps(value?: number): string {

  if (value == null) return '-'

  return `${value.toFixed(2)} m/s`

}



export function formatDrivingMode(mode?: string): string {

  if (!mode) return '-'

  return DRIVING_MODE_MAP[mode] ?? mode

}



export function formatRobotStatus(status?: number): string {

  if (status == null) return '-'

  return ROBOT_STATUS_MAP[status] ?? `状态(${status})`

}



export function formatFault(row: VehicleStatusVO): string {

  if (row.alertMsg) return row.alertMsg

  if (row.faultSummary?.hasFault) {

    const count = row.faultSummary.faultCount ?? 0

    return count > 0 ? `故障×${count}` : '有故障'

  }

  return '无'

}



export function hasFault(row: VehicleStatusVO): boolean {

  return Boolean(row.alertMsg || row.faultSummary?.hasFault)

}



export function getBatteryLevelColor(battery: number, online = true): string {

  if (!online && battery <= 0) return '#bdc3c7'

  if (battery <= 0) return '#bdc3c7'

  if (battery >= 60) return '#27ae60'

  if (battery >= 20) return '#f39c12'

  return '#e74c3c'

}


