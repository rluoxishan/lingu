import type { CameraKey } from '@/views/car/car/visualization/types'

export interface CameraViewSpec {
  view: number
  key: CameraKey
  /** 云平台响应 data[].info 可能取值 */
  infoLabels: string[]
}

/** 远程驾驶五路：前 / 右 / 后 / 左 / 环视 */
export const REMOTE_FIVE_CAMERA_VIEWS: CameraViewSpec[] = [
  { view: 1, key: 'front', infoLabels: ['前'] },
  { view: 2, key: 'right', infoLabels: ['右'] },
  { view: 3, key: 'rear', infoLabels: ['后'] },
  { view: 4, key: 'left', infoLabels: ['左'] },
  { view: 5, key: 'surround', infoLabels: ['环视', '环视相机'] }
]

/** 云台模式第 6 路（可选，待云平台确认 info 字段） */
export const PTZ_CAMERA_VIEW: CameraViewSpec = {
  view: 6,
  key: 'ptz',
  infoLabels: ['云台', 'PTZ']
}

export const DEFAULT_MONITOR_VIEW_NUMBERS = REMOTE_FIVE_CAMERA_VIEWS.map((v) => v.view)

export function mapStreamInfoToCameraKey(info: string): CameraKey | undefined {
  for (const spec of [...REMOTE_FIVE_CAMERA_VIEWS, PTZ_CAMERA_VIEW]) {
    if (spec.infoLabels.includes(info)) return spec.key
  }
  return undefined
}
