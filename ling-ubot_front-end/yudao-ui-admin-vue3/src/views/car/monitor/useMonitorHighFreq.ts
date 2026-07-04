import { getAccessToken } from '@/utils/auth'
import { PerceptionApi, buildPerceptionWsUrl, parse1010003Message } from '@/api/car/vehicle/perception'
import type { PerceptionFrame } from '@/api/car/vehicle/perceptionTypes'
import type { RadarGridCell } from '../car/visualization/types'

/** 默认关闭；联调时设 VITE_MONITOR_PERCEPTION_ENABLED=true */
export const MONITOR_PERCEPTION_LIVE = import.meta.env.VITE_MONITOR_PERCEPTION_ENABLED === 'true'

const WS_RECONNECT_MS = [1000, 2000, 5000, 10000]
const POLL_MS = 200
const HEARTBEAT_MS = 5000

function obstacleCentroidToBodyCells(
  frame: PerceptionFrame,
  maxRangeM = 12
): RadarGridCell[] {
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

/**
 * 监控页 1010003 高频感知流。
 * - 打开：2010012 ON + WebSocket（失败则轮询 latest）
 * - 关闭：2010012 OFF + 断开连接
 */
export function useMonitorHighFreq(deviceId: Ref<string>, enabled: Ref<boolean>) {
  const frame = ref<PerceptionFrame | null>(null)
  const live = ref(false)
  const loading = ref(false)
  const error = ref('')
  const transport = ref<'off' | 'ws' | 'poll'>('off')

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

  let ws: WebSocket | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let wsAttempt = 0
  let stopped = true

  function applyMessage(raw: unknown) {
    const parsed = parse1010003Message(raw, deviceId.value)
    if (!parsed) return
    frame.value = parsed
    live.value = true
    error.value = ''
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function stopWs() {
    wsAttempt = WS_RECONNECT_MS.length
    if (ws) {
      ws.onopen = null
      ws.onmessage = null
      ws.onerror = null
      ws.onclose = null
      ws.close()
      ws = null
    }
  }

  function startPoll() {
    stopPoll()
    transport.value = 'poll'
    pollTimer = setInterval(async () => {
      if (stopped || !enabled.value) return
      try {
        const latest = await PerceptionApi.fetchLatestPerception(deviceId.value)
        if (latest) applyMessage(latest)
        else error.value = '感知数据为空（latest）'
      } catch (e) {
        error.value = e instanceof Error ? e.message : '感知轮询失败'
        live.value = false
      }
    }, POLL_MS)
  }

  function scheduleWsReconnect() {
    if (stopped || !enabled.value) return
    const delay = WS_RECONNECT_MS[Math.min(wsAttempt, WS_RECONNECT_MS.length - 1)]
    wsAttempt += 1
    window.setTimeout(() => {
      if (!stopped && enabled.value) connectWs()
    }, delay)
  }

  function connectWs() {
    stopWs()
    wsAttempt = 0
    const token = getAccessToken()
    const url = buildPerceptionWsUrl(deviceId.value, token)
    try {
      ws = new WebSocket(url)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'WebSocket 创建失败'
      startPoll()
      return
    }

    transport.value = 'ws'
    ws.onopen = () => {
      wsAttempt = 0
      error.value = ''
    }
    ws.onmessage = (ev) => {
      try {
        applyMessage(JSON.parse(ev.data as string))
      } catch {
        // 忽略非 JSON
      }
    }
    ws.onerror = () => {
      error.value = 'WebSocket 连接异常'
    }
    ws.onclose = () => {
      live.value = false
      if (stopped || !enabled.value) return
      if (wsAttempt >= WS_RECONNECT_MS.length) {
        startPoll()
        return
      }
      scheduleWsReconnect()
    }
  }

  async function sendHighFreq(status: 'ON' | 'OFF') {
    if (!deviceId.value) return
    await PerceptionApi.setHighFreqSwitch(deviceId.value, status)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (stopped || !enabled.value) return
      void sendHighFreq('ON').catch(() => {
        // 心跳失败不阻断 UI
      })
    }, HEARTBEAT_MS)
  }

  async function start() {
    const id = deviceId.value
    if (!id || !enabled.value || !MONITOR_PERCEPTION_LIVE) return

    stopped = false
    loading.value = true
    error.value = ''
    frame.value = null
    live.value = false

    try {
      await sendHighFreq('ON')
      startHeartbeat()
      connectWs()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '2010012 开启失败'
      startPoll()
    } finally {
      loading.value = false
    }
  }

  async function stop() {
    stopped = true
    stopHeartbeat()
    stopPoll()
    stopWs()
    transport.value = 'off'
    live.value = false

    const id = deviceId.value
    if (!id || !MONITOR_PERCEPTION_LIVE) return
    try {
      await sendHighFreq('OFF')
    } catch {
      // 关失败不阻塞
    }
  }

  watch([deviceId, enabled], () => {
    void stop()
    if (enabled.value && MONITOR_PERCEPTION_LIVE) void start()
  })

  onMounted(() => {
    if (enabled.value && MONITOR_PERCEPTION_LIVE) void start()
  })

  onUnmounted(() => {
    void stop()
  })

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
    start,
    stop
  }
}
