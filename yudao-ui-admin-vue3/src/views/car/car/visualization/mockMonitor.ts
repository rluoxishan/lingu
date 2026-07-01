import { MOCK_VEHICLES } from '../mock'
import type { VehicleStatusVO } from '../types'
import type { MapPoint, MonitorMockState, VehiclePose } from './types'

const DEFAULT_ID = 'LU2606000100'

export function getMockVehicle(deviceId: string): VehicleStatusVO {
  return (
    MOCK_VEHICLES.find((v) => v.vehicleId === deviceId) ??
    MOCK_VEHICLES[0] ?? {
      vehicleId: deviceId,
      clientId: deviceId,
      online: true,
      updatedAt: Date.now(),
      workStatus: 0,
      battery: 80,
      positionXyz: { x: 0, y: 0, yaw: 0 },
      heading: 0
    }
  )
}

function buildPlannedPath(start: MapPoint, headingDeg: number): MapPoint[] {
  const rad = (headingDeg * Math.PI) / 180
  const points: MapPoint[] = [start]
  for (let i = 1; i <= 8; i++) {
    const turn = Math.sin(i * 0.6) * 0.4
    const dir = rad + turn
    const prev = points[points.length - 1]
    points.push({
      x: prev.x + Math.cos(dir) * 1.2,
      y: prev.y + Math.sin(dir) * 1.2
    })
  }
  return points
}

function formatChartTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

export function createMonitorMockState(deviceId: string): MonitorMockState {
  const vehicle = { ...getMockVehicle(deviceId) }
  const x = vehicle.positionXyz?.x ?? 2
  const y = vehicle.positionXyz?.y ?? -2
  const headingDeg = vehicle.heading ?? 45
  const pose: VehiclePose = { x, y, headingDeg }
  const history: MapPoint[] = [{ x, y }]

  const now = new Date()
  const batteryHistory = Array.from({ length: 12 }, (_, i) => ({
    time: formatChartTime(new Date(now.getTime() - (11 - i) * 5000)),
    value: Math.max(0, vehicle.battery - (11 - i) * 2)
  }))
  const statusHistory = batteryHistory.map((item) => ({
    time: item.time,
    value: vehicle.workStatus
  }))
  const poseHistory = batteryHistory.map((item, i) => ({
    time: item.time,
    x: x + i * 0.15,
    y: y + i * 0.1,
    heading: headingDeg + i * 2
  }))

  return {
    vehicle,
    pose,
    history,
    planned: buildPlannedPath({ x, y }, headingDeg + 25),
    batteryHistory,
    statusHistory,
    poseHistory
  }
}

/** 1Hz 模拟：位移 + 轨迹 + 电量缓降 */
export function tickMonitorMock(state: MonitorMockState): void {
  const rad = (state.pose.headingDeg * Math.PI) / 180
  state.pose.x += Math.cos(rad) * 0.18
  state.pose.y += Math.sin(rad) * 0.18
  state.pose.headingDeg = (state.pose.headingDeg + 2) % 360

  state.history.push({ x: state.pose.x, y: state.pose.y })
  if (state.history.length > 80) state.history.shift()

  if (state.vehicle.battery > 5) {
    state.vehicle.battery = Math.max(5, state.vehicle.battery - 0.05)
  }

  const t = formatChartTime(new Date())
  state.batteryHistory.push({ time: t, value: Math.round(state.vehicle.battery) })
  state.statusHistory.push({ time: t, value: state.vehicle.workStatus })
  state.poseHistory.push({
    time: t,
    x: state.pose.x,
    y: state.pose.y,
    heading: state.pose.headingDeg
  })
  if (state.batteryHistory.length > 24) state.batteryHistory.shift()
  if (state.statusHistory.length > 24) state.statusHistory.shift()
  if (state.poseHistory.length > 24) state.poseHistory.shift()

  state.vehicle.updatedAt = Date.now()
  if (state.vehicle.positionXyz) {
    state.vehicle.positionXyz.x = state.pose.x
    state.vehicle.positionXyz.y = state.pose.y
    state.vehicle.positionXyz.yaw = rad
  }
  state.vehicle.heading = Math.round(state.pose.headingDeg)
}

function headingToDeg(heading?: number, fallback = 0): number {
  if (heading == null) return fallback
  if (Math.abs(heading) <= Math.PI * 2 + 0.01) {
    return (heading * 180) / Math.PI
  }
  return heading
}

/** 将云平台遥测合并进监控页状态 */
export function applyVehicleTelemetry(state: MonitorMockState, vehicle: VehicleStatusVO): void {
  Object.assign(state.vehicle, vehicle)

  if (vehicle.positionXyz) {
    const headingDeg = headingToDeg(vehicle.heading, state.pose.headingDeg)
    const next = { x: vehicle.positionXyz.x, y: vehicle.positionXyz.y, headingDeg }
    const moved =
      Math.hypot(next.x - state.pose.x, next.y - state.pose.y) > 0.01 ||
      Math.abs(next.headingDeg - state.pose.headingDeg) > 0.5
    state.pose = next
    if (moved) {
      state.history.push({ x: next.x, y: next.y })
      if (state.history.length > 80) state.history.shift()
    }
    state.planned = buildPlannedPath({ x: next.x, y: next.y }, headingDeg + 25)
  }

  state.vehicle.updatedAt = vehicle.updatedAt ?? Date.now()
}

/** 实时遥测：只追加图表，不模拟位移 */
export function tickMonitorCharts(state: MonitorMockState): void {
  const t = formatChartTime(new Date())
  state.batteryHistory.push({ time: t, value: Math.round(state.vehicle.battery) })
  state.statusHistory.push({ time: t, value: state.vehicle.workStatus })
  state.poseHistory.push({
    time: t,
    x: state.pose.x,
    y: state.pose.y,
    heading: state.pose.headingDeg
  })
  if (state.batteryHistory.length > 24) state.batteryHistory.shift()
  if (state.statusHistory.length > 24) state.statusHistory.shift()
  if (state.poseHistory.length > 24) state.poseHistory.shift()
}

export { DEFAULT_ID }
