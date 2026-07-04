import request from '@/config/axios'
import { config } from '@/config/axios/config'

import { unwrapCloudPayload } from './cloudResponse'
import type { DeviceInstructionBody } from './types'
import type { HighFreqSwitchOptions, MapMeta, PerceptionFrame } from './perceptionTypes'
import { DEFAULT_INDOOR_SENSOR_TYPES } from './perceptionTypes'
import { parse1010003Message } from './perceptionParse'

const DEFAULT_HIGH_FREQ: Required<HighFreqSwitchOptions> = {
  sensorTypes: DEFAULT_INDOOR_SENSOR_TYPES,
  frequencyHz: 10,
  durationSec: 300,
  keepAlivePeriods: 3,
  heartbeatIntervalSec: 5
}

function mergeHighFreqOptions(options?: HighFreqSwitchOptions) {
  return { ...DEFAULT_HIGH_FREQ, ...options }
}

/** 由 admin-api base 推导 WebSocket URL（可被 VITE_MONITOR_PERCEPTION_WS 覆盖） */
export function buildPerceptionWsUrl(deviceId: string, token?: string): string {
  const override = import.meta.env.VITE_MONITOR_PERCEPTION_WS as string | undefined
  if (override) {
    const url = new URL(override, window.location.origin)
    url.searchParams.set('deviceId', deviceId)
    if (token) url.searchParams.set('token', token)
    return url.toString()
  }

  const httpBase = config.base_url
  const wsBase = httpBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const path = `/device/perception/stream?deviceId=${encodeURIComponent(deviceId)}`
  const qs = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${wsBase}${path}${qs}`
}

export const PerceptionApi = {
  /**
   * POST /device/instructions type=2010012
   * 开启/关闭 1010003 高频上报（监控页生命周期）
   */
  setHighFreqSwitch: async (
    deviceId: string,
    status: 'ON' | 'OFF',
    options?: HighFreqSwitchOptions
  ): Promise<unknown> => {
    const merged = mergeHighFreqOptions(options)
    const body: DeviceInstructionBody = {
      deviceId,
      type: '2010012',
      data: {
        status,
        ...(status === 'ON'
          ? {
              sensorTypes: merged.sensorTypes,
              frequencyHz: merged.frequencyHz,
              durationSec: merged.durationSec,
              keepAlivePeriods: merged.keepAlivePeriods,
              heartbeatIntervalSec: merged.heartbeatIntervalSec
            }
          : {})
      }
    }
    const res = await request.post<unknown>({
      url: '/device/instructions',
      data: body
    })
    return unwrapCloudPayload(res)
  },

  /** GET /device/map_meta — 室内 PGM 栅格地图元数据（待云平台实现） */
  fetchMapMeta: async (deviceId: string, mapId?: string): Promise<MapMeta | null> => {
    try {
      const res = await request.get<unknown>({
        url: '/device/map_meta',
        params: { deviceId, mapId },
        isSilentError: true
      })
      return unwrapCloudPayload<MapMeta>(res)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw e
    }
  },

  /** GET /device/perception/latest — 1010003 最新一帧（轮询兜底，待云平台实现） */
  fetchLatestPerception: async (deviceId: string): Promise<PerceptionFrame | null> => {
    try {
      const res = await request.get<unknown>({
        url: '/device/perception/latest',
        params: { deviceId },
        isSilentError: true
      })
      const payload = unwrapCloudPayload<unknown>(res)
      return parse1010003Message(payload ?? res, deviceId)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) return null
      throw e
    }
  }
}

export { parse1010003Message }
