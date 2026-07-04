/** 2010012 sensorTypes → 1010003 字段块（协议 §5.6.15） */
export type HighFreqSensorType = 'RTK' | 'TRAJECTORY' | 'OBSTACLE' | 'ULTRASONIC' | 'CHASSIS'

/** 1010003 obstacles.type（协议 §5.6.13） */
export type ObstacleType = 'PEDESTRIAN' | 'VEHICLE' | 'STATIC' | 'UNKNOWN'

export interface MapMeta {
  mapId: string
  imageUrl: string
  width: number
  height: number
  resolution: number
  origin: [number, number, number]
  negate?: number
  occupiedThresh?: number
  freeThresh?: number
}

export interface MapPoint3 {
  x: number
  y: number
  z?: number
  heading?: number
}

export interface PerceptionObstacle {
  id: number
  type: ObstacleType | string
  polygon: MapPoint3[]
  heading?: number
  velocity?: number
}

export interface UltrasonicReading {
  sensorId: number
  distance: number
}

/** 解析后的单帧 1010003（地图坐标系，单位米） */
export interface PerceptionFrame {
  deviceId: string
  time: number
  mapId?: string
  positionXyz?: { x: number; y: number; z: number }
  positionLonLat?: { lon: number; lat: number; alt?: number }
  headingDeg: number
  speedMps?: number
  planType?: string
  trajectoryPoints: MapPoint3[]
  obstacles: PerceptionObstacle[]
  ultrasonicSense: UltrasonicReading[]
  raw?: Record<string, unknown>
}

export interface HighFreqSwitchOptions {
  sensorTypes?: HighFreqSensorType[]
  frequencyHz?: number
  durationSec?: number
  keepAlivePeriods?: number
  heartbeatIntervalSec?: number
}

export const DEFAULT_INDOOR_SENSOR_TYPES: HighFreqSensorType[] = ['RTK', 'OBSTACLE', 'TRAJECTORY']
