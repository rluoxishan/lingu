import type { PerceptionFrame, PerceptionObstacle, MapPoint3, UltrasonicReading } from './perceptionTypes'

function parseCsvNumbers(raw: string, minParts = 2): number[] | null {
  const parts = raw.split(',').map((s) => parseFloat(s.trim()))
  if (parts.length < minParts || parts.some((n) => Number.isNaN(n))) return null
  return parts
}

function parsePositionXyz(raw: unknown): PerceptionFrame['positionXyz'] | undefined {
  if (typeof raw !== 'string') return undefined
  const parts = parseCsvNumbers(raw, 2)
  if (!parts) return undefined
  return { x: parts[0], y: parts[1], z: parts[2] ?? 0 }
}

function parsePositionLla(raw: unknown): PerceptionFrame['positionLonLat'] | undefined {
  if (typeof raw !== 'string') return undefined
  const parts = parseCsvNumbers(raw, 2)
  if (!parts) return undefined
  return { lon: parts[0], lat: parts[1], alt: parts[2] }
}

function parsePoint(obj: unknown): MapPoint3 | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const x = typeof o.x === 'number' ? o.x : undefined
  const y = typeof o.y === 'number' ? o.y : undefined
  if (x == null || y == null) return null
  return {
    x,
    y,
    z: typeof o.z === 'number' ? o.z : undefined,
    heading: typeof o.heading === 'number' ? o.heading : undefined
  }
}

function parseObstacles(raw: unknown): PerceptionObstacle[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const id = typeof o.id === 'number' ? o.id : -1
      const polygonRaw = o.polygon
      if (!Array.isArray(polygonRaw)) return null
      const polygon = polygonRaw.map(parsePoint).filter((p): p is MapPoint3 => p != null)
      if (polygon.length < 3) return null
      return {
        id,
        type: typeof o.type === 'string' ? o.type : 'UNKNOWN',
        polygon,
        heading: typeof o.heading === 'number' ? o.heading : undefined,
        velocity: typeof o.velocity === 'number' ? o.velocity : undefined
      }
    })
    .filter((o): o is PerceptionObstacle => o != null)
}

function parseTrajectory(raw: unknown): MapPoint3[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parsePoint).filter((p): p is MapPoint3 => p != null)
}

function parseUltrasonic(raw: unknown): UltrasonicReading[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      if (typeof o.sensorId !== 'number' || typeof o.distance !== 'number') return null
      return { sensorId: o.sensorId, distance: o.distance }
    })
    .filter((u): u is UltrasonicReading => u != null)
}

function headingFromData(data: Record<string, unknown>): number {
  if (typeof data.heading === 'number') return data.heading
  if (typeof data.yaw === 'number') {
    return Math.abs(data.yaw) <= Math.PI * 2 + 0.01 ? (data.yaw * 180) / Math.PI : data.yaw
  }
  const xyz = parsePositionXyz(data.position_xyz)
  if (xyz && typeof data.position_xyz === 'string') {
    const parts = parseCsvNumbers(data.position_xyz, 3)
    if (parts && parts.length >= 3 && Math.abs(parts[2]) <= Math.PI * 2 + 0.01) {
      return (parts[2] * 180) / Math.PI
    }
  }
  return 0
}

function resolvePayload(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    if (obj.type === '1010003' && obj.data && typeof obj.data === 'object') {
      return obj.data as Record<string, unknown>
    }
    if ('code' in obj && 'data' in obj) {
      const inner = obj.data
      if (inner && typeof inner === 'object') {
        const dataObj = inner as Record<string, unknown>
        if (dataObj.type === '1010003' && dataObj.data) {
          return dataObj.data as Record<string, unknown>
        }
        return dataObj
      }
    }
    if ('obstacles' in obj || 'position_xyz' in obj || 'trajectoryPoints' in obj) {
      return obj
    }
  }
  return null
}

/** 将 WebSocket / HTTP 原始 JSON 解析为 PerceptionFrame */
export function parse1010003Message(raw: unknown, deviceId: string): PerceptionFrame | null {
  const data = resolvePayload(raw)
  if (!data) return null

  const time =
    typeof (raw as Record<string, unknown>)?.time === 'number'
      ? ((raw as Record<string, unknown>).time as number)
      : Date.now()

  let positionXyz = parsePositionXyz(data.position_xyz)
  if (!positionXyz && typeof data.x === 'number' && typeof data.y === 'number') {
    positionXyz = {
      x: data.x,
      y: data.y,
      z: typeof data.z === 'number' ? data.z : 0
    }
  }

  return {
    deviceId,
    time,
    mapId: typeof data.mapId === 'string' ? data.mapId : undefined,
    positionXyz,
    positionLonLat: parsePositionLla(data.position_lla),
    headingDeg: headingFromData(data),
    speedMps: typeof data.speedMps === 'number' ? data.speedMps : undefined,
    planType: typeof data.planType === 'string' ? data.planType : undefined,
    trajectoryPoints: parseTrajectory(data.trajectoryPoints),
    obstacles: parseObstacles(data.obstacles),
    ultrasonicSense: parseUltrasonic(data.ultrasonicSense),
    raw: data
  }
}
