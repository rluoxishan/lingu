import type { MqttControlEnvelope } from './mqttPayload'
import { formatMqttPayload } from './mqttPayload'
import { VehicleApi } from '@/api/car/vehicle'

/** 真下发开关：车端/云平台就绪后改为 true 或接 VITE_MONITOR_CONTROL_ENABLED */
export const MONITOR_CONTROL_LIVE =
  import.meta.env.VITE_MONITOR_CONTROL_ENABLED === 'true'

export interface ControlDispatchResult {
  live: boolean
  text: string
  envelope: MqttControlEnvelope
}

/**
 * 统一控制下发入口。默认 Mock；`VITE_MONITOR_CONTROL_ENABLED=true` 时走云平台 instructions。
 */
export async function dispatchMonitorControl(
  envelope: MqttControlEnvelope,
  vehicleId: string
): Promise<ControlDispatchResult> {
  const text = `[MQTT Mock] ${vehicleId} ${formatMqttPayload(envelope)}`

  if (MONITOR_CONTROL_LIVE) {
    try {
      await VehicleApi.sendInstructions({
        deviceId: vehicleId,
        type: envelope.type,
        data: envelope.data
      })
      return {
        live: true,
        text: `[LIVE] ${vehicleId} ${formatMqttPayload(envelope)}`,
        envelope
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      return {
        live: true,
        text: `[LIVE FAIL] ${vehicleId} ${err}`,
        envelope
      }
    }
  }

  return { live: false, text, envelope }
}
