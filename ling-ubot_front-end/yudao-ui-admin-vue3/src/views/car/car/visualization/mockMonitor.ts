import type { VehicleStatusVO } from '../types'
import type { MapPoint, MonitorMockState, VehiclePose } from './types'

function headingToDeg(heading?: number, fallback = 0): number {
  if (heading == null) return fallback
  if (Math.abs(heading) <= Math.PI * 2 + 0.01) {
    return (heading * 180) / Math.PI
  }
  return heading
}

/** 监控页初始状态：不含虚拟轨迹/规划/图表数据 */
export function createMonitorMockState(deviceId: string): MonitorMockState {
  return {
    vehicle: {
      vehicleId: deviceId,
      clientId: deviceId,
      online: false,
      updatedAt: Date.now(),
      workStatus: 0,
      battery: 0,
      faultSummary: { hasFault: false, faultCount: 0, highestFaultLevel: 1 }
    },
    pose: { x: 0, y: 0, headingDeg: 0 },
    history: [],
    lonLatPose: { x: 0, y: 0, headingDeg: 0 },
    lonLatHistory: [],
    planned: [],
    batteryHistory: [],
    statusHistory: [],
    poseHistory: []
  }
}

function appendHistory(history: MapPoint[], next: MapPoint): void {
  const last = history[history.length - 1]
  if (last && Math.hypot(last.x - next.x, last.y - next.y) < 0.01) return
  history.push(next)
  if (history.length > 200) history.shift()
}

/** 将云平台遥测合并进监控页状态（仅真实字段） */
export function applyVehicleTelemetry(state: MonitorMockState, vehicle: VehicleStatusVO): void {
  Object.assign(state.vehicle, vehicle)

  if (vehicle.positionXyz) {
    const headingDeg = headingToDeg(vehicle.heading, state.pose.headingDeg)
    const next = { x: vehicle.positionXyz.x, y: vehicle.positionXyz.y, headingDeg }
    state.pose = next
    appendHistory(state.history, { x: next.x, y: next.y })
  }

  if (vehicle.positionLonLat) {
    const headingDeg = headingToDeg(vehicle.heading, state.lonLatPose.headingDeg)
    const next = {
      x: vehicle.positionLonLat.lon,
      y: vehicle.positionLonLat.lat,
      headingDeg
    }
    state.lonLatPose = next
    appendHistory(state.lonLatHistory, { x: next.x, y: next.y })
  }

  state.vehicle.updatedAt = vehicle.updatedAt ?? Date.now()
}
