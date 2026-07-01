import type { VehicleStatusVO } from '../types'

export interface MapPoint {
  x: number
  y: number
}

export interface VehiclePose extends MapPoint {
  headingDeg: number
}

export interface MonitorMockState {
  vehicle: VehicleStatusVO
  pose: VehiclePose
  history: MapPoint[]
  planned: MapPoint[]
  batteryHistory: { time: string; value: number }[]
  statusHistory: { time: string; value: number }[]
  /** 坐标与航向时序（Foxglove Plot 参考） */
  poseHistory: { time: string; x: number; y: number; heading: number }[]
}

/** 监控页控制模式：影响视频主画面与控制区布局 */
export type MonitorControlMode = 'auto' | 'remote' | 'ptz'

export type CameraKey = 'front' | 'left' | 'right' | 'rear' | 'surround' | 'ptz'

export const CAMERA_META: Record<CameraKey, { label: string; short: string }> = {
  front: { label: '前视 · 主驾驶', short: '前视' },
  left: { label: '左视 · 左前', short: '左视' },
  right: { label: '右视 · 右前', short: '右视' },
  rear: { label: '后视 · 左后', short: '后视' },
  surround: { label: '环视 · 右后', short: '环视' },
  ptz: { label: '云台 · PTZ', short: '云台' }
}
