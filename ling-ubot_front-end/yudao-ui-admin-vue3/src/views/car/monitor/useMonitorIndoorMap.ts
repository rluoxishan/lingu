import { PerceptionApi } from '@/api/car/vehicle/perception'
import type { MapMeta } from '@/api/car/vehicle/perceptionTypes'
import { DEMO_MAP_META, MONITOR_PERCEPTION_DEMO } from './monitorPerceptionDemo'

/** 本地联调：VITE_MONITOR_MAP_DEMO_META=JSON 字符串，覆盖 map_meta API */
function readDemoMapMeta(): MapMeta | null {
  if (MONITOR_PERCEPTION_DEMO) return DEMO_MAP_META
  const raw = import.meta.env.VITE_MONITOR_MAP_DEMO_META as string | undefined
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw) as MapMeta
  } catch {
    return null
  }
}

const DEMO_MAP: MapMeta | null = readDemoMapMeta()

/**
 * 加载室内 PGM 地图元数据（GET /device/map_meta）。
 * mapId 来自 1010003 帧，无则按 deviceId 查默认绑定地图。
 */
export function useMonitorIndoorMap(deviceId: Ref<string>, mapId: Ref<string | undefined>, enabled: Ref<boolean>) {
  const mapMeta = ref<MapMeta | null>(DEMO_MAP)
  const loading = ref(false)
  const error = ref('')

  async function refresh() {
    if (!enabled.value) {
      mapMeta.value = DEMO_MAP
      return
    }
    const id = deviceId.value
    if (!id) return

    if (DEMO_MAP) {
      mapMeta.value = DEMO_MAP
      return
    }

    loading.value = true
    error.value = ''
    try {
      const meta = await PerceptionApi.fetchMapMeta(id, mapId.value)
      mapMeta.value = meta
      if (!meta) {
        error.value = 'map_meta 尚未上线（sztu 实测 404），待 Hasun 实现 GET /device/map_meta'
      }
    } catch (e) {
      mapMeta.value = null
      const status = (e as { response?: { status?: number } })?.response?.status
      error.value =
        status === 404
          ? 'map_meta 尚未上线（404），待 Hasun 实现'
          : e instanceof Error
            ? e.message
            : '地图元数据加载失败'
    } finally {
      loading.value = false
    }
  }

  watch([deviceId, mapId, enabled], () => void refresh())

  onMounted(() => void refresh())

  return { mapMeta, loading, error, refresh }
}
