import type { MapPoint } from '@/views/car/car/visualization/types'

/** 与车辆定位页 `device/device_path_info` 响应结构一致 */
export interface RegionPathPose {
  longitude?: number
  latitude?: number
  x?: number
  y?: number
}

export interface RegionPathSite {
  site_name?: string
  longitude?: number
  latitude?: number
}

export interface RegionPathSegment {
  current_site?: RegionPathSite
  next_site?: RegionPathSite
  path_poses_info?: RegionPathPose[]
}

export interface RegionPathGroup {
  pathInfo?: RegionPathSegment[]
}

function poseToMapPoint(p: RegionPathPose): MapPoint | null {
  const lon = p.longitude ?? (p as { lng?: number }).lng
  const lat = p.latitude ?? (p as { lat?: number }).lat
  if (lon != null && lat != null && !Number.isNaN(lon) && !Number.isNaN(lat)) {
    return { x: lon, y: lat }
  }
  if (p.x != null && p.y != null && !Number.isNaN(p.x) && !Number.isNaN(p.y)) {
    return { x: p.x, y: p.y }
  }
  return null
}

function siteToMapPoint(site?: RegionPathSite): MapPoint | null {
  if (!site) return null
  if (site.longitude != null && site.latitude != null) {
    return { x: site.longitude, y: site.latitude }
  }
  return null
}

/** 兼容数组 / 单对象 / 嵌套 data / 顶层 pathInfo 等多种响应形态 */
export function normalizeRegionPathPayload(data: unknown): RegionPathGroup[] {
  if (data == null) return []
  if (Array.isArray(data)) {
    if (data.length === 0) return []
    const first = data[0] as Record<string, unknown>
    if (first?.path_poses_info || first?.current_site) {
      return [{ pathInfo: data as RegionPathSegment[] }]
    }
    return data as RegionPathGroup[]
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.pathInfo)) {
      return [{ pathInfo: obj.pathInfo as RegionPathSegment[] }]
    }
    if (Array.isArray(obj.list)) return obj.list as RegionPathGroup[]
    if ('data' in obj) return normalizeRegionPathPayload(obj.data)
  }
  return []
}

function pushPoint(out: MapPoint[], pt: MapPoint | null) {
  if (!pt) return
  const last = out[out.length - 1]
  if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < 1e-6) return
  out.push(pt)
}

function appendSegmentPoints(out: MapPoint[], segment: RegionPathSegment) {
  const path: MapPoint[] = []

  if (Array.isArray(segment.path_poses_info)) {
    for (const pose of segment.path_poses_info) {
      pushPoint(path, poseToMapPoint(pose))
    }
  }

  if (path.length === 0) {
    pushPoint(path, siteToMapPoint(segment.current_site))
    pushPoint(path, siteToMapPoint(segment.next_site))
  } else {
    pushPoint(path, siteToMapPoint(segment.current_site))
    pushPoint(path, siteToMapPoint(segment.next_site))
  }

  for (const pt of path) {
    pushPoint(out, pt)
  }
}

/**
 * 将 `device_path_info` 解析为折线点列。
 * 对齐车辆定位页逻辑，并兼容无 site 字段的路径段。
 */
export function parseRegionPathToMapPoints(data: unknown): MapPoint[] {
  const groups = normalizeRegionPathPayload(data)
  if (groups.length === 0) return []

  const points: MapPoint[] = []

  for (const group of groups) {
    if (!group?.pathInfo || !Array.isArray(group.pathInfo)) continue

    for (const segment of group.pathInfo) {
      if (!segment) continue
      const hasPoses = Array.isArray(segment.path_poses_info) && segment.path_poses_info.length > 0
      const hasSites = segment.current_site && segment.next_site
      if (!hasPoses && !hasSites) continue
      appendSegmentPoints(points, segment)
    }
  }

  return points
}

export interface AmapPathSegment {
  path: [number, number][]
  pathName: string
  strokeColor: string
  startSite: string
  endSite: string
}

const AMAP_PATH_COLORS = [
  '#FF0000',
  '#0000FF',
  '#00AA00',
  '#FF8800',
  '#9900FF',
  '#00AAAA',
  '#CC0066',
  '#666666'
]

/** 与定位页 handlePathData 一致：按路段输出高德 Polyline 路径 */
export function parseRegionPathToAmapPolylines(data: unknown): AmapPathSegment[] {
  const groups = normalizeRegionPathPayload(data)
  if (groups.length === 0) return []

  const segments: AmapPathSegment[] = []
  let colorIdx = 0

  for (const group of groups) {
    if (!group?.pathInfo || !Array.isArray(group.pathInfo)) continue

    for (const [pathInfoIndex, pathInfo] of group.pathInfo.entries()) {
      if (!pathInfo?.path_poses_info || !Array.isArray(pathInfo.path_poses_info)) continue

      const path: [number, number][] = []
      for (const p of pathInfo.path_poses_info) {
        const lon = p.longitude ?? (p as { lng?: number }).lng
        const lat = p.latitude ?? (p as { lat?: number }).lat
        if (lon != null && lat != null && !Number.isNaN(lon) && !Number.isNaN(lat)) {
          path.push([lon, lat])
        }
      }

      if (path.length === 0) continue

      const startSite = pathInfo.current_site?.site_name || `站点${pathInfoIndex + 1}`
      const endSite = pathInfo.next_site?.site_name || `站点${pathInfoIndex + 2}`
      segments.push({
        path,
        pathName: `${startSite} → ${endSite}`,
        strokeColor: AMAP_PATH_COLORS[colorIdx % AMAP_PATH_COLORS.length],
        startSite,
        endSite
      })
      colorIdx += 1
    }
  }

  return segments
}

/** 所有 GPS 路线点（用于 fitView / 折线兜底） */
export function parseRegionPathToAmapLngLatList(data: unknown): [number, number][] {
  return parseRegionPathToMapPoints(data)
    .filter((p) => Math.abs(p.x) <= 180 && Math.abs(p.y) <= 90)
    .map((p) => [p.x, p.y] as [number, number])
}

/** 解析后的路径是否使用经纬度坐标（而非 SLAM xyz） */
export function regionPathUsesLonLat(data: unknown): boolean {
  const groups = normalizeRegionPathPayload(data)
  for (const group of groups) {
    for (const segment of group?.pathInfo ?? []) {
      for (const pose of segment?.path_poses_info ?? []) {
        if (pose.longitude != null && pose.latitude != null) return true
      }
      if (segment.current_site?.longitude != null && segment.current_site?.latitude != null) {
        return true
      }
    }
  }
  return false
}
