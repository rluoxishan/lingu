import type { MqttControlEnvelope } from './mqttPayload'
import { formatMqttPayload } from './mqttPayload'

/** 真下发开关：车端/云平台就绪后改为 true 或接 VITE_MONITOR_CONTROL_ENABLED */
export const MONITOR_CONTROL_LIVE =
  import.meta.env.VITE_MONITOR_CONTROL_ENABLED === 'true'

export interface ControlDispatchResult {
  live: boolean
  text: string
  envelope: MqttControlEnvelope
}

/**
 * 统一控制下发入口。当前默认 Mock：仅返回日志文本，不请求网络。
 * 联调时在此接入云平台 device/instructions 或 MQTT 转发。
 */
export async function dispatchMonitorControl(
  envelope: MqttControlEnvelope,
  vehicleId: string
): Promise<ControlDispatchResult> {
  const text = `[MQTT Mock] ${vehicleId} ${formatMqttPayload(envelope)}`

  if (MONITOR_CONTROL_LIVE) {
    // TODO: VehicleControlApi.instructions(vehicleId, envelope)
    console.warn('[monitorControl] LIVE 模式尚未接入云平台 API', envelope)
  }

  return { live: MONITOR_CONTROL_LIVE, text, envelope }
}
