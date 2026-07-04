import type { MapPoint, MonitorMockState } from './types'

export type MapCoordinateSpace = 'xyz' | 'lonlat'

function headingToDeg(heading?: number, fallback = 0): number {
  if (heading == null) return fallback
  if (Math.abs(heading) <= Math.PI * 2 + 0.01) {
    return (heading * 180) / Math.PI
  }
  return heading
}

export function vehicleCoordinateSpace(state: MonitorMockState): MapCoordinateSpace | null {
  const hasLonLat = !!(state.vehicle.positionLonLat || state.lonLatHistory.length > 0)
  const hasXyz = !!(state.vehicle.positionXyz || state.history.length > 0)
  if (hasLonLat && !hasXyz) return 'lonlat'
  if (hasXyz && !hasLonLat) return 'xyz'
  if (hasLonLat) return 'lonlat'
  if (hasXyz) return 'xyz'
  return null
}

export function routeCoordinateSpace(routeLonLat: boolean): MapCoordinateSpace {
  return routeLonLat ? 'lonlat' : 'xyz'
}

export function mapSpacesMismatch(
  state: MonitorMockState,
  planned: MapPoint[],
  routeLonLat: boolean
): boolean {
  if (planned.length <= 1) return false
  const vSpace = vehicleCoordinateSpace(state)
  if (!vSpace) return false
  return vSpace !== routeCoordinateSpace(routeLonLat)
}

/**
 * 选择地图坐标系。
 * 路线与车辆坐标不一致时优先路线系（否则 892 个 GPS 点会被 indoor 视野裁掉）。
 */
export function resolveMapCoordinateSpace(
  state: MonitorMockState,
  planned: MapPoint[],
  routeLonLat: boolean
): MapCoordinateSpace {
  const routeSpace = routeCoordinateSpace(routeLonLat)
  const vSpace = vehicleCoordinateSpace(state)
  const hasPlanned = planned.length > 1

  if (hasPlanned) {
    if (vSpace && vSpace !== routeSpace) return routeSpace
    if (vSpace) return vSpace
    return routeSpace
  }

  if (vSpace) return vSpace
  return 'xyz'
}

export function filterPlannedForSpace(
  planned: MapPoint[],
  space: MapCoordinateSpace,
  routeLonLat: boolean
): MapPoint[] {
  if (planned.length <= 1) return planned
  return routeCoordinateSpace(routeLonLat) === space ? planned : []
}

export function pickMapPose(state: MonitorMockState, space: MapCoordinateSpace) {
  const headingDeg = headingToDeg(
    state.vehicle.heading,
    space === 'lonlat' ? state.lonLatPose.headingDeg : state.pose.headingDeg
  )
  if (space === 'lonlat') {
    if (state.lonLatHistory.length > 0) return { ...state.lonLatPose, headingDeg }
    if (state.vehicle.positionLonLat) {
      return {
        x: state.vehicle.positionLonLat.lon,
        y: state.vehicle.positionLonLat.lat,
        headingDeg
      }
    }
  } else if (state.history.length > 0) {
    return { ...state.pose, headingDeg }
  } else if (state.vehicle.positionXyz) {
    return {
      x: state.vehicle.positionXyz.x,
      y: state.vehicle.positionXyz.y,
      headingDeg
    }
  }
  return space === 'lonlat' ? { ...state.lonLatPose, headingDeg } : { ...state.pose, headingDeg }
}

export function pickMapHistory(state: MonitorMockState, space: MapCoordinateSpace): MapPoint[] {
  return space === 'lonlat' ? state.lonLatHistory : state.history
}

export function vehicleMatchesMapSpace(
  state: MonitorMockState,
  space: MapCoordinateSpace
): boolean {
  const vSpace = vehicleCoordinateSpace(state)
  if (!vSpace) return false
  return vSpace === space
}
