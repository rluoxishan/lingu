import type { MapMeta, PerceptionFrame, PerceptionObstacle } from '@/api/car/vehicle/perceptionTypes'

/** API 未就绪时用虚拟 1010003 演示 Tesla 式 2D 感知（无需 map_meta / WS） */
export const MONITOR_PERCEPTION_DEMO = import.meta.env.VITE_MONITOR_PERCEPTION_DEMO === 'true'

/** 与 public/monitor-demo/indoor-slam-demo.svg 对应；坐标系为演示用 map 系（米） */
export const DEMO_MAP_META: MapMeta = {
  mapId: 'demo_lhgk',
  imageUrl: `${import.meta.env.BASE_URL}monitor-demo/indoor-slam-demo.svg`,
  width: 800,
  height: 400,
  resolution: 0.25,
  origin: [0, -20, 0],
  negate: 0
}

function rectPolygon(cx: number, cy: number, w: number, h: number, angleDeg = 0) {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const hw = w / 2
  const hh = h / 2
  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh]
  ]
  return corners.map(([dx, dy]) => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  }))
}

function buildDemoFrame(deviceId: string, tSec: number): PerceptionFrame {
  const speed = 0.35
  const pathLen = 55
  const s = (tSec * speed) % pathLen
  const x = 12 + s * 0.85
  const y = -8 + Math.sin(s * 0.12) * 6
  const headingDeg = 88 + Math.sin(s * 0.08) * 18

  const traj = Array.from({ length: 12 }, (_, i) => {
    const ts = s + i * 1.2
    return {
      x: 12 + ts * 0.85,
      y: -8 + Math.sin(ts * 0.12) * 6,
      z: 0
    }
  })

  const obs1: PerceptionObstacle = {
    id: 1,
    type: 'PEDESTRIAN',
    polygon: rectPolygon(28 + Math.sin(tSec * 0.5) * 2, -4, 0.9, 0.7, 15),
    velocity: 0.8
  }
  const obs2: PerceptionObstacle = {
    id: 2,
    type: 'VEHICLE',
    polygon: rectPolygon(38 + s * 0.3, -12, 2.2, 1.1, -10),
    velocity: 0
  }
  const obs3: PerceptionObstacle = {
    id: 3,
    type: 'STATIC',
    polygon: rectPolygon(22, -14, 1.5, 0.8, 0)
  }

  return {
    deviceId,
    time: Date.now(),
    mapId: DEMO_MAP_META.mapId,
    positionXyz: { x, y, z: 0 },
    headingDeg,
    speedMps: speed,
    planType: 'UPDATE',
    trajectoryPoints: traj,
    obstacles: [obs1, obs2, obs3],
    ultrasonicSense: [
      { sensorId: 1, distance: 120 + Math.sin(tSec * 2) * 30 },
      { sensorId: 2, distance: 85 },
      { sensorId: 3, distance: 200 }
    ]
  }
}

export function createDemoFrameStream(deviceId: string, onFrame: (f: PerceptionFrame) => void) {
  const start = performance.now()
  let timer: ReturnType<typeof setInterval> | null = null

  const tick = () => {
    const tSec = (performance.now() - start) / 1000
    onFrame(buildDemoFrame(deviceId, tSec))
  }

  tick()
  timer = setInterval(tick, 100)

  return () => {
    if (timer) clearInterval(timer)
  }
}
