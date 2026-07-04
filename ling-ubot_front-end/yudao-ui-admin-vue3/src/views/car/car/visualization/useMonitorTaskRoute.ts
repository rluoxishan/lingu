import { getRegionPath } from '@/api/map/location'
import { parseRegionPathToMapPoints, regionPathUsesLonLat } from '@/utils/regionPathParser'
import type { MonitorMockState } from './types'

const routeCache = new Map<
  string,
  {
    points: ReturnType<typeof parseRegionPathToMapPoints>
    lonLat: boolean
    raw: unknown
  }
>()

/**
 * 监控页任务路线：复用车辆定位页 `device/device_path_info`。
 * 需要 regionName（来自列表跳转 query 或遥测里的 regionName）。
 */
export function useMonitorTaskRoute(
  regionName: Ref<string | undefined>,
  monitorState: MonitorMockState
) {
  const routeLoading = ref(false)
  const routeError = ref('')
  const routeLonLat = ref(false)
  const routeRawData = ref<unknown>(null)

  async function refreshTaskRoute() {
    const name = regionName.value?.trim()
    if (!name) {
      monitorState.planned = []
      routeError.value = ''
      routeLonLat.value = false
      routeRawData.value = null
      return
    }

    const cached = routeCache.get(name)
    if (cached) {
      monitorState.planned = cached.points
      routeLonLat.value = cached.lonLat
      routeRawData.value = cached.raw
      routeError.value = ''
      return
    }

    routeLoading.value = true
    routeError.value = ''
    try {
      const data = await getRegionPath(name)
      const points = parseRegionPathToMapPoints(data)
      const lonLat = regionPathUsesLonLat(data)
      routeCache.set(name, { points, lonLat, raw: data })
      monitorState.planned = points
      routeLonLat.value = lonLat
      routeRawData.value = data
      if (points.length === 0) {
        routeError.value = '该区域暂无任务路线数据'
      }
    } catch (e) {
      monitorState.planned = []
      routeLonLat.value = false
      routeRawData.value = null
      routeError.value = e instanceof Error ? e.message : '任务路线加载失败'
    } finally {
      routeLoading.value = false
    }
  }

  watch(regionName, () => {
    void refreshTaskRoute()
  }, { immediate: false })

  onMounted(() => {
    void refreshTaskRoute()
  })

  return { routeLoading, routeError, routeLonLat, routeRawData, refreshTaskRoute }
}
