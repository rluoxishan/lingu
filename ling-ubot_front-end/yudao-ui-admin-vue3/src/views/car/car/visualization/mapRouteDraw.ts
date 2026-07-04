import type { MapPoint } from './types'

const MAX_ROUTE_DRAW_POINTS = 400

/** 抽稀折线，避免 800+ 点 SVG 属性过长或渲染异常 */
export function downsampleMapPoints(points: MapPoint[], maxPoints = MAX_ROUTE_DRAW_POINTS): MapPoint[] {
  if (points.length <= maxPoints) return points
  const step = Math.ceil(points.length / maxPoints)
  const out: MapPoint[] = []
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i])
  }
  const last = points[points.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

export function mapPointsToSvgPath(points: MapPoint[]): string {
  const pts = downsampleMapPoints(points)
  if (pts.length === 0) return ''
  const [first, ...rest] = pts
  let d = `M ${first.x} ${-first.y}`
  for (const p of rest) {
    d += ` L ${p.x} ${-p.y}`
  }
  return d
}

export function bboxOfPoints(points: MapPoint[]) {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  }
  let minX = points[0].x
  let maxX = points[0].x
  let minY = points[0].y
  let maxY = points[0].y
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, maxX, minY, maxY }
}
