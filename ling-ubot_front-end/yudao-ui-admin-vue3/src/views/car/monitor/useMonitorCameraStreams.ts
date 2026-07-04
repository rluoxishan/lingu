import { VehicleApi } from '@/api/car/vehicle'
import { mapStreamInfoToCameraKey } from '@/api/car/vehicle/cameraViews'
import type { CameraStreamItem } from '@/api/car/vehicle/types'
import { startZlmWebRtcPlay, type ZlmWebRtcPlayer } from '../car/visualization/zlmWebRtc'
import type { CameraKey } from '../car/visualization/types'

export const MONITOR_CAMERA_LIVE =
  import.meta.env.VITE_MONITOR_CAMERA_ENABLED === 'true' ||
  (import.meta.env.VITE_MONITOR_CAMERA_ENABLED !== 'false' &&
    import.meta.env.VITE_VEHICLE_USE_MOCK !== 'true')

const OPEN_STREAM_DELAY_MS = 1500
const WEBRTC_RETRY_DELAYS_MS = [0, 2000, 5000, 10000]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapStreamsByCamera(list: CameraStreamItem[]): Map<CameraKey, CameraStreamItem> {
  const map = new Map<CameraKey, CameraStreamItem>()
  for (const item of list) {
    const key = mapStreamInfoToCameraKey(item.info)
    if (key) map.set(key, item)
  }
  return map
}

function isStreamNotReadyError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /stream not found|not found|404|不存在/i.test(msg)
}

export function useMonitorCameraStreams(vehicleId: Ref<string>) {
  const streams = ref<Map<CameraKey, CameraStreamItem>>(new Map())
  const loading = ref(false)
  const error = ref('')
  const live = ref(false)

  const players = new Map<CameraKey, ZlmWebRtcPlayer>()
  const attachQueue = new Map<CameraKey, HTMLVideoElement>()

  async function openStreams() {
    const id = vehicleId.value
    if (!id) return

    loading.value = true
    error.value = ''
    try {
      const list = await VehicleApi.openAllCameraStreams(id)
      streams.value = mapStreamsByCamera(list)
      live.value = streams.value.size > 0
      if (!live.value) {
        error.value = list.length === 0 ? '开流返回空（请确认设备在线且已登录）' : '视频流 info 字段无法映射'
        return
      }
      await sleep(OPEN_STREAM_DELAY_MS)
      for (const [key, el] of attachQueue.entries()) {
        void attachPlayer(key, el)
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '开流失败'
      live.value = false
    } finally {
      loading.value = false
    }
  }

  async function attachPlayer(key: CameraKey, videoEl: HTMLVideoElement | null) {
    if (!videoEl) {
      attachQueue.delete(key)
      return
    }

    attachQueue.set(key, videoEl)
    const item = streams.value.get(key)
    if (!item?.url) return

    players.get(key)?.stop()
    players.delete(key)

    let lastError: unknown = null
    for (const delayMs of WEBRTC_RETRY_DELAYS_MS) {
      if (delayMs > 0) await sleep(delayMs)
      try {
        const player = await startZlmWebRtcPlay(item.url, videoEl)
        players.set(key, player)
        error.value = ''
        return
      } catch (e) {
        lastError = e
        if (!isStreamNotReadyError(e)) break
      }
    }

    if (import.meta.env.DEV) {
      console.warn(`[camera] ${key} WebRTC 失败`, lastError)
    }
    const msg = lastError instanceof Error ? lastError.message : 'WebRTC 失败'
    if (isStreamNotReadyError(lastError)) {
      error.value = `${key}: 流未就绪（stream not found），请确认设备已推流或稍后重试`
    } else {
      error.value = `${key}: ${msg}`
    }
  }

  function detachPlayer(key: CameraKey) {
    attachQueue.delete(key)
    players.get(key)?.stop()
    players.delete(key)
  }

  async function closeStreams() {
    const opened = [...streams.value.values()]
    for (const key of players.keys()) detachPlayer(key)
    players.clear()
    attachQueue.clear()
    streams.value = new Map()
    live.value = false

    const id = vehicleId.value
    if (!id || !MONITOR_CAMERA_LIVE || opened.length === 0) return
    try {
      await VehicleApi.closeAllCameraStreams(id, opened)
    } catch {
      // 关流失败不阻塞 UI
    }
  }

  watch(vehicleId, () => {
    void closeStreams()
    if (MONITOR_CAMERA_LIVE) void openStreams()
  })

  onMounted(() => {
    if (MONITOR_CAMERA_LIVE) void openStreams()
  })

  onUnmounted(() => {
    void closeStreams()
  })

  return {
    streams,
    loading,
    error,
    live,
    openStreams,
    closeStreams,
    attachPlayer,
    detachPlayer
  }
}
