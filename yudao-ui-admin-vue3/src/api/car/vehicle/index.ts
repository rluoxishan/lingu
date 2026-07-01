import request from '@/config/axios'
import type { VehicleStatusVO } from '@/views/car/car/types'
import { mapDeviceDetail, mapDevicePageItem, telemetryHasCoreFields } from './mapper'
import type { CloudDeviceBatchItem, DeviceDetailData, DevicePageItem, DevicePageData, TaskListItem } from './types'

const DEFAULT_PAGE_SIZE = 200

export const VehicleApi = {
  /** POST /device/select_device_by_page（管理后台列表，含 info/details/errors 等） */
  selectDeviceByPage: async (pageNo = 1, pageSize = DEFAULT_PAGE_SIZE) => {
    return await request.post<DevicePageData>({
      url: '/device/select_device_by_page',
      data: { pageNo, pageSize }
    })
  },

  /** POST /device/select_all_device（兼容回退） */
  selectAllDevices: async (): Promise<CloudDeviceBatchItem[]> => {
    const data = await request.post<CloudDeviceBatchItem[]>({
      url: '/device/select_all_device',
      data: {}
    })
    return Array.isArray(data) ? data : []
  },

  /** GET /device/select_device_detail_by_id */
  selectDeviceDetail: async (deviceId: string) => {
    return await request.get<DeviceDetailData>({
      url: '/device/select_device_detail_by_id',
      params: { id: deviceId }
    })
  },

  /** POST /device/select_task_by_page */
  selectTaskByPage: async (pageNo = 1, pageSize = 200): Promise<TaskListItem[]> => {
    const data = await request.post<{ list: TaskListItem[] }>({
      url: '/device/select_task_by_page',
      data: { pageNo, pageSize }
    })
    return data?.list ?? []
  },

  /**
   * 拉取车辆列表：优先 select_device_by_page，缺遥测时 detail 回退 + 任务补全
   */
  getVehicleStatusList: async (): Promise<VehicleStatusVO[]> => {
    let pageItems: DevicePageItem[] = []

    try {
      const pageData = await VehicleApi.selectDeviceByPage(1, DEFAULT_PAGE_SIZE)
      pageItems = (pageData?.list ?? []).filter((d) => d?.id && !d.deleted)
    } catch (e) {
      console.warn('[vehicle-list] select_device_by_page failed, fallback to select_all_device', e)
      const batchItems = await VehicleApi.selectAllDevices()
      pageItems = batchItems.filter((d) => d?.id).map((d) => ({ ...d, details: d }))
    }

    if (pageItems.length === 0) return []

    const statuses: VehicleStatusVO[] = []
    const detailIds: string[] = []

    for (const item of pageItems) {
      if (telemetryHasCoreFields(item.details ?? item)) {
        statuses.push(mapDevicePageItem(item))
      } else {
        detailIds.push(item.id)
      }
    }

    if (detailIds.length > 0) {
      const pageById = new Map(pageItems.map((d) => [d.id, d]))
      const detailResults = await Promise.all(
        detailIds.map(async (id) => {
          const pageItem = pageById.get(id)
          try {
            const detail = await VehicleApi.selectDeviceDetail(id)
            return mapDeviceDetail(id, detail, pageItem?.online ?? true, pageItem)
          } catch {
            return pageItem ? mapDevicePageItem(pageItem) : null
          }
        })
      )
      statuses.push(...detailResults.filter((s): s is VehicleStatusVO => s !== null))
    }

    try {
      const tasks = await VehicleApi.selectTaskByPage()
      for (const status of statuses) {
        if (status.taskId && status.taskId !== '0') continue
        if (status.taskName) continue
        const task = tasks.find((t) => t.deviceId === status.vehicleId && t.active !== false)
        if (task) {
          status.taskId = task.taskId
          status.taskName = task.taskName
        }
      }
    } catch {
      // 任务列表非必须
    }

    statuses.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId))
    return statuses
  }
}

export type { CloudDeviceBatchItem, DeviceDetailData, DevicePageItem, TaskListItem } from './types'
