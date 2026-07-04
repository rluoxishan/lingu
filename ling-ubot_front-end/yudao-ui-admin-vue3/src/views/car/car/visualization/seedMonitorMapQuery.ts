import type { LocationQuery } from 'vue-router'
import type { MonitorMockState } from './types'

function parsePair(raw: unknown): { x: number; y: number } | null {
  if (typeof raw !== 'string' || !raw.includes(',')) return null
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null
  return { x: parts[0], y: parts[1] }
}

/** 从列表跳转 query 预填定位，避免进页后等轮询才出现车辆 */
export function seedMonitorMapFromQuery(state: MonitorMockState, query: LocationQuery): void {
  const lonLat = parsePair(query.pos)
  if (lonLat) {
    state.vehicle.positionLonLat = { lon: lonLat.x, lat: lonLat.y }
    state.lonLatPose = { x: lonLat.x, y: lonLat.y, headingDeg: state.lonLatPose.headingDeg }
    if (state.lonLatHistory.length === 0) {
      state.lonLatHistory.push({ x: lonLat.x, y: lonLat.y })
    }
  }

  const xyz = parsePair(query.posXyz)
  if (xyz) {
    state.vehicle.positionXyz = { x: xyz.x, y: xyz.y, yaw: 0 }
    state.pose = { x: xyz.x, y: xyz.y, headingDeg: state.pose.headingDeg }
    if (state.history.length === 0) {
      state.history.push({ x: xyz.x, y: xyz.y })
    }
  }

  const region = query.regionName
  if (typeof region === 'string' && region.trim() && !state.vehicle.regionName) {
    state.vehicle.regionName = region.trim()
  }
}
