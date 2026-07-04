import { unwrapCloudPayload } from './cloudResponse'
import type { DeviceDetailData, DevicePageItem, DeviceTelemetryDetails } from './types'

export interface DeviceDetailResult {
  detail: DeviceDetailData
  pageMeta: Partial<DevicePageItem>
}

function isPageLikeDevice(obj: Record<string, unknown>): boolean {
  return typeof obj.id === 'string' || obj.details != null
}

function pickPageMeta(item: DevicePageItem): Partial<DevicePageItem> {
  return {
    id: item.id,
    name: item.name,
    info: item.info,
    online: item.online,
    createTime: item.createTime,
    updateTime: item.updateTime,
    connectedAt: item.connectedAt,
    disconnectedAt: item.disconnectedAt,
    enableConnectToEmqx: item.enableConnectToEmqx,
    regionName: item.regionName ?? undefined,
    tenantId: item.tenantId,
    tenantName: item.tenantName,
    deleted: item.deleted,
    errors: item.errors
  }
}

function mergeTelemetry(item: DevicePageItem): DeviceTelemetryDetails {
  const nested = item.details ?? {}
  return {
    ...nested,
    workStatus: nested.workStatus ?? item.workStatus,
    battery: nested.battery ?? item.battery,
    position: nested.position ?? item.position,
    position_xyz: nested.position_xyz ?? item.position_xyz,
    heading: nested.heading ?? item.heading,
    taskId: nested.taskId ?? item.taskId,
    taskName: nested.taskName ?? item.taskName
  }
}

/**
 * 兼容多种「查询设备详情」响应：
 * - 平铺遥测 `{ workStatus, position, ... }`
 * - 单设备 `{ id, regionName, online, details: { position, ... } }`（第三方 get_device_detail）
 * - 设备数组 `[{ id, regionName, details }, ...]`（按 deviceId 匹配）
 */
export function normalizeDeviceDetailResponse(
  raw: unknown,
  deviceId: string
): DeviceDetailResult {
  const payload = unwrapCloudPayload<unknown>(raw)
  const targetId = deviceId.trim()

  if (payload == null) {
    return { detail: {}, pageMeta: {} }
  }

  if (Array.isArray(payload)) {
    const list = payload as DevicePageItem[]
    const hit =
      list.find((d) => d.id === targetId) ??
      list.find((d) => d.id?.trim() === targetId) ??
      null
    if (!hit) return { detail: {}, pageMeta: {} }
    return { detail: mergeTelemetry(hit), pageMeta: pickPageMeta(hit) }
  }

  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>

    if (isPageLikeDevice(obj)) {
      const item = obj as unknown as DevicePageItem
      return { detail: mergeTelemetry(item), pageMeta: pickPageMeta(item) }
    }

    return { detail: obj as DeviceDetailData, pageMeta: {} }
  }

  return { detail: {}, pageMeta: {} }
}
