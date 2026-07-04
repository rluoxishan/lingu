import { VehicleApi } from '@/api/car/vehicle'
import { mapDeviceDetail } from '@/api/car/vehicle/mapper'
import type { DevicePageItem } from '@/api/car/vehicle/types'
import type { VehicleStatusVO } from '../car/types'
import { applyVehicleTelemetry } from '../car/visualization/mockMonitor'
import type { MonitorMockState } from '../car/visualization/types'

const POLL_MS = 3000

function mergePageMeta(
  fromDetail: Partial<DevicePageItem>,
  pageItem: DevicePageItem | null
): Partial<DevicePageItem> {
  if (!pageItem) return fromDetail
  return { ...fromDetail, ...pageItem }
}

function mergeDetailTelemetry(
  detail: import('@/api/car/vehicle/types').DeviceDetailData,
  pageItem: DevicePageItem | null
) {
  if (!pageItem) return detail
  const fromDetails = pageItem.details ?? {}
  const fromFlat = {
    position: pageItem.position,
    position_xyz: pageItem.position_xyz,
    heading: pageItem.heading,
    workStatus: pageItem.workStatus,
    battery: pageItem.battery,
    taskId: pageItem.taskId,
    taskName: pageItem.taskName
  }
  return { ...fromFlat, ...fromDetails, ...detail }
}

export function useMonitorVehicle(
  vehicleId: Ref<string>,
  monitorState: MonitorMockState,
  regionName?: Ref<string | undefined>
) {
  const liveTelemetry = ref(false)
  const telemetryLoading = ref(false)
  const telemetryError = ref('')

  function applyRegionMeta(status: VehicleStatusVO, pageMeta: Partial<DevicePageItem>) {
    const fromQuery = regionName?.value?.trim()
    const fromApi = pageMeta.regionName?.trim()
    const name = fromQuery || fromApi || status.regionName?.trim()
    if (name) {
      status.regionName = name
      monitorState.vehicle.regionName = name
    }
  }

  async function refreshTelemetry() {
    const id = vehicleId.value
    if (!id) return
    telemetryLoading.value = true
    try {
      const [detailResult, pageItem] = await Promise.all([
        VehicleApi.selectDeviceDetail(id),
        VehicleApi.findDevicePageItem(id)
      ])
      const pageMeta = mergePageMeta(detailResult.pageMeta, pageItem)
      const mergedDetail = mergeDetailTelemetry(detailResult.detail, pageItem)
      const online = pageMeta.online ?? pageItem?.online ?? false
      const status = mapDeviceDetail(id, mergedDetail, online, pageMeta)
      applyRegionMeta(status, pageMeta)
      applyVehicleTelemetry(monitorState, status)
      liveTelemetry.value = true
      telemetryError.value = ''
    } catch (e) {
      telemetryError.value = e instanceof Error ? e.message : '遥测加载失败'
      liveTelemetry.value = false
    } finally {
      telemetryLoading.value = false
    }
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const startPolling = () => {
    stopPolling()
    void refreshTelemetry()
    pollTimer = setInterval(() => void refreshTelemetry(), POLL_MS)
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(vehicleId, () => {
    liveTelemetry.value = false
    telemetryError.value = ''
    startPolling()
  })

  if (regionName) {
    watch(regionName, () => {
      if (regionName.value) {
        monitorState.vehicle.regionName = regionName.value
      }
    })
  }

  onMounted(startPolling)
  onUnmounted(stopPolling)

  return {
    liveTelemetry,
    telemetryLoading,
    telemetryError,
    refreshTelemetry
  }
}

export type { VehicleStatusVO }
