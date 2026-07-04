import { VehicleApi } from '@/api/car/vehicle'
import { mapStreamInfoToCameraKey } from '@/api/car/vehicle/cameraViews'
import type { CameraStreamItem } from '@/api/car/vehicle/types'
import { startZlmWebRtcPlay, type ZlmWebRtcPlayer } from '../visualization/zlmWebRtc'
import type { CameraKey } from '../visualization/types'

export const MONITOR_CAMERA_LIVE =
  import.meta.env.VITE_MONITOR_CAMERA_ENABLED === 'true' ||
  (import.meta.env.VITE_MONITOR_CAMERA_ENABLED !== 'false' &&
    import.meta.env.VITE_VEHICLE_USE_MOCK !== 'true')

function mapStreamsByCamera(list: CameraStreamItem[]): Map<CameraKey, CameraStreamItem> {
  const map = new Map<CameraKey, CameraStreamItem>()
  for (const item of list) {
    const key = mapStreamInfoToCameraKey(item.info)
    if (key) map.set(key, item)
  }
  return map
}

export function useMonitorCameraStreams(vehicleId: Ref<string>) {
  const streams = ref<Map<CameraKey, CameraStreamItem>>(new Map())
  const loading = ref(false)
  const error = ref('')
  const live = ref(false)

  const players = new Map<CameraKey, ZlmWebRtcPlayer>()

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
        error.value = list.length === 0 ? '开流返回空（请确认已登录且 vehicleId 正确）' : '视频流 info 字段无法映射'
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '开流失败'
      live.value = false
    } finally {
      loading.value = false
    }
  }

  async function attachPlayer(key: CameraKey, videoEl: HTMLVideoElement | null) {
    if (!videoEl) return

    players.get(key)?.stop()
    players.delete(key)

    const item = streams.value.get(key)
    if (!item?.url) return

    try {
      const player = await startZlmWebRtcPlay(item.url, videoEl)
      players.set(key, player)
    } catch (e) {
      console.warn(`[camera] ${key} WebRTC 失败`, e)
      error.value = `${key}: ${e instanceof Error ? e.message : 'WebRTC 失败'}`
    }
  }

  function detachPlayer(key: CameraKey) {
    players.get(key)?.stop()
    players.delete(key)
  }

  async function closeStreams() {
    const opened = [...streams.value.values()]
    for (const key of players.keys()) detachPlayer(key)
    players.clear()
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
