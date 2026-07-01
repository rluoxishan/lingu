import { VehicleApi } from '@/api/car/vehicle'
import { mapDeviceDetail } from '@/api/car/vehicle/mapper'
import type { VehicleStatusVO } from '../types'
import { applyVehicleTelemetry, tickMonitorCharts } from '../visualization/mockMonitor'
import type { MonitorMockState } from '../visualization/types'

const POLL_MS = 3000

export function useMonitorVehicle(
  vehicleId: Ref<string>,
  mockState: MonitorMockState
) {
  const liveTelemetry = ref(false)
  const telemetryLoading = ref(false)
  const telemetryError = ref('')

  async function refreshTelemetry() {
    const id = vehicleId.value
    if (!id) return
    telemetryLoading.value = true
    try {
      const detail = await VehicleApi.selectDeviceDetail(id)
      const status = mapDeviceDetail(id, detail, true)
      applyVehicleTelemetry(mockState, status)
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

  /** 实时遥测模式下仅刷新图表，不模拟位移 */
  const tickLiveCharts = () => {
    if (liveTelemetry.value) tickMonitorCharts(mockState)
  }

  watch(vehicleId, () => {
    liveTelemetry.value = false
    telemetryError.value = ''
    startPolling()
  })

  onMounted(startPolling)
  onUnmounted(stopPolling)

  return {
    liveTelemetry,
    telemetryLoading,
    telemetryError,
    refreshTelemetry,
    tickLiveCharts
  }
}

export type { VehicleStatusVO }
