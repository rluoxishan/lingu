import type { PerceptionFrame } from '@/api/car/vehicle/perceptionTypes'
import type { RadarGridCell } from '../car/visualization/types'
import { createDemoFrameStream } from './monitorPerceptionDemo'

function obstacleCentroidToBodyCells(frame: PerceptionFrame, maxRangeM = 12): RadarGridCell[] {
  const pose = frame.positionXyz
  if (!pose) return []

  const headingRad = (frame.headingDeg * Math.PI) / 180
  const cos = Math.cos(-headingRad)
  const sin = Math.sin(-headingRad)
  const cells: RadarGridCell[] = []

  for (const obs of frame.obstacles) {
    if (!obs.polygon.length) continue
    let sx = 0
    let sy = 0
    for (const p of obs.polygon) {
      sx += p.x
      sy += p.y
    }
    const cx = sx / obs.polygon.length
    const cy = sy / obs.polygon.length
    const dx = cx - pose.x
    const dy = cy - pose.y
    const bx = dx * cos - dy * sin
    const by = dx * sin + dy * cos
    if (Math.hypot(bx, by) > maxRangeM) continue
    cells.push({ x: bx, y: -by, occupied: true })
  }

  return cells
}

/** 虚拟 1010003 @10Hz，不调用云平台 API */
export function useMonitorPerceptionDemo(deviceId: Ref<string>, enabled: Ref<boolean>) {
  const frame = ref<PerceptionFrame | null>(null)
  const live = ref(false)
  const loading = ref(false)
  const error = ref('')
  const transport = ref<'demo'>('demo')

  let stopStream: (() => void) | null = null

  const obstacles = computed(() => frame.value?.obstacles ?? [])
  const trajectoryPoints = computed(() => frame.value?.trajectoryPoints ?? [])
  const perceptionPose = computed(() => {
    const f = frame.value
    if (!f?.positionXyz) return null
    return {
      x: f.positionXyz.x,
      y: f.positionXyz.y,
      headingDeg: f.headingDeg
    }
  })
  const mapId = computed(() => frame.value?.mapId)
  const radarGridCells = computed(() =>
    frame.value ? obstacleCentroidToBodyCells(frame.value) : []
  )
  const ultrasonicSense = computed(() => frame.value?.ultrasonicSense ?? [])

  function start() {
    stop()
    if (!enabled.value || !deviceId.value) return
    loading.value = true
    error.value = ''
    stopStream = createDemoFrameStream(deviceId.value, (f) => {
      frame.value = f
      live.value = true
    })
    loading.value = false
  }

  function stop() {
    stopStream?.()
    stopStream = null
    live.value = false
    frame.value = null
  }

  watch([deviceId, enabled], () => {
    stop()
    if (enabled.value) start()
  })

  onMounted(() => {
    if (enabled.value) start()
  })

  onUnmounted(stop)

  return {
    frame,
    live,
    loading,
    error,
    transport,
    obstacles,
    trajectoryPoints,
    perceptionPose,
    mapId,
    radarGridCells,
    ultrasonicSense
  }
}
