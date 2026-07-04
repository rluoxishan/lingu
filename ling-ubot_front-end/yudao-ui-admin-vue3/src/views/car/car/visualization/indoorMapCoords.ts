import type { MapMeta, MapPoint3, PerceptionObstacle } from '@/api/car/vehicle/perceptionTypes'
import type { MapPoint } from './types'

export interface PixelPoint {
  x: number
  y: number
}

/** 世界坐标（米，map 系）→ 栅格图像像素（左上原点，Y 向下） */
export function worldToPixel(wx: number, wy: number, meta: MapMeta): PixelPoint {
  return {
    x: (wx - meta.origin[0]) / meta.resolution,
    y: meta.height - (wy - meta.origin[1]) / meta.resolution
  }
}

export function pixelToWorld(px: number, py: number, meta: MapMeta): MapPoint {
  return {
    x: meta.origin[0] + px * meta.resolution,
    y: meta.origin[1] + (meta.height - py) * meta.resolution
  }
}

export function mapWorldBounds(meta: MapMeta) {
  return {
    minX: meta.origin[0],
    minY: meta.origin[1],
    maxX: meta.origin[0] + meta.width * meta.resolution,
    maxY: meta.origin[1] + meta.height * meta.resolution
  }
}

export function pointsToPixelPath(points: MapPoint[], meta: MapMeta): string {
  if (points.length < 2) return ''
  return points
    .map((p) => {
      const pix = worldToPixel(p.x, p.y, meta)
      return `${pix.x},${pix.y}`
    })
    .join(' ')
}

export function obstacleToPixelPolygon(obs: PerceptionObstacle, meta: MapMeta): string {
  return obs.polygon
    .map((p) => {
      const pix = worldToPixel(p.x, p.y, meta)
      return `${pix.x},${pix.y}`
    })
    .join(' ')
}

export function trajectoryToPixelPath(points: MapPoint3[], meta: MapMeta): string {
  return pointsToPixelPath(
    points.map((p) => ({ x: p.x, y: p.y })),
    meta
  )
}

const OBSTACLE_FILL: Record<string, string> = {
  PEDESTRIAN: 'rgba(231, 76, 60, 0.55)',
  VEHICLE: 'rgba(230, 126, 34, 0.55)',
  STATIC: 'rgba(149, 165, 166, 0.6)',
  UNKNOWN: 'rgba(192, 57, 43, 0.45)'
}

export function obstacleFill(type: string): string {
  return OBSTACLE_FILL[type] ?? OBSTACLE_FILL.UNKNOWN
}
