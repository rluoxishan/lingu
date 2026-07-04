import request from '@/config/axios'

import type { VehicleStatusVO } from '@/views/car/car/types'

import { unwrapCloudPageList, unwrapCloudPayload } from './cloudResponse'
import { normalizeDeviceDetailResponse, type DeviceDetailResult } from './deviceDetailNormalize'

import { mapDeviceDetail, mapDevicePageItem, telemetryHasCoreFields } from './mapper'

import type { CloudDeviceBatchItem, CameraStreamItem, DeviceInstructionBody, DevicePageItem, DevicePageData, TaskListItem } from './types'

import { DEFAULT_MONITOR_VIEW_NUMBERS } from './cameraViews'



/** 云平台分页上限（超过会报「每页条数最大值为 100」） */
const MAX_PAGE_SIZE = 100

const DEFAULT_PAGE_SIZE = MAX_PAGE_SIZE



const EMPTY_PAGE: DevicePageData = { list: [], total: 0 }



export const VehicleApi = {

  /** POST /device/select_device_by_page（管理后台列表，含 info/details/errors 等） */

  selectDeviceByPage: async (pageNo = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<DevicePageData> => {

    const res = await request.post<unknown>({

      url: '/device/select_device_by_page',

      data: { pageNo, pageSize }

    })

    return unwrapCloudPayload<DevicePageData>(res) ?? EMPTY_PAGE

  },



  /** POST /device/select_all_device（兼容回退） */

  selectAllDevices: async (): Promise<CloudDeviceBatchItem[]> => {

    const res = await request.post<unknown>({

      url: '/device/select_all_device',

      data: {}

    })

    const data = unwrapCloudPayload<CloudDeviceBatchItem[]>(res)

    return Array.isArray(data) ? data : []

  },



  /** GET /device/select_device_detail_by_id（兼容第三方 get_device_detail 嵌套/数组结构） */
  selectDeviceDetail: async (deviceId: string): Promise<DeviceDetailResult> => {
    const res = await request.get<unknown>({
      url: '/device/select_device_detail_by_id',
      params: { id: deviceId }
    })
    return normalizeDeviceDetailResponse(res, deviceId)
  },



  /** POST /device/select_task_by_page */

  selectTaskByPage: async (pageNo = 1, pageSize = MAX_PAGE_SIZE): Promise<TaskListItem[]> => {

    const res = await request.post<unknown>({

      url: '/device/select_task_by_page',

      data: { pageNo, pageSize }

    })

    return unwrapCloudPageList<TaskListItem>(res)

  },



  /** POST /device/instructions — 远程控制（2010002 / 2010005 / 2010008 / 2010004） */

  sendInstructions: async (body: DeviceInstructionBody) => {

    const res = await request.post<unknown>({

      url: '/device/instructions',

      data: body

    })

    return unwrapCloudPayload(res)

  },



  /** 五路监控 view：1 前 / 2 右 / 3 后 / 4 左 / 5 环视 */

  MONITOR_CAMERA_VIEWS: DEFAULT_MONITOR_VIEW_NUMBERS,



  /** POST /device/instructions type=2010004 status=1 — 开启单路摄像头 */

  openCameraStreams: async (deviceId: string, view: number): Promise<CameraStreamItem[]> => {

    const data = await VehicleApi.sendInstructions({

      deviceId,

      type: '2010004',

      data: { status: 1, view }

    })

    return Array.isArray(data) ? data : []

  },



  /** 并行开启五路（前/右/后/左/环视） */

  openAllCameraStreams: async (

    deviceId: string,

    views: readonly number[] = DEFAULT_MONITOR_VIEW_NUMBERS

  ): Promise<CameraStreamItem[]> => {

    const batches = await Promise.all(views.map((view) => VehicleApi.openCameraStreams(deviceId, view)))

    return batches.flat()

  },



  /** POST /device/instructions type=2010004 status=0 — 按 cameraName 关闭单路 */
  closeCameraStream: async (deviceId: string, cameraName: string) => {
    return await VehicleApi.sendInstructions({
      deviceId,
      type: '2010004',
      data: { status: 0, cameraName }
    })
  },

  /** 并行关闭已开各路（传入开流返回的 data[]） */
  closeAllCameraStreams: async (deviceId: string, streams: readonly CameraStreamItem[]) => {
    const names = [...new Set(streams.map((s) => s.name).filter(Boolean))]
    await Promise.all(names.map((name) => VehicleApi.closeCameraStream(deviceId, name)))
  },



  /** 按 deviceId 在分页列表中查找（用于监控页补全 online / regionName / 定位字段） */
  findDevicePageItem: async (deviceId: string): Promise<DevicePageItem | null> => {
    const target = deviceId.trim()
    if (!target) return null

    try {
      let pageNo = 1
      let total = 0
      do {
        const pageData = await VehicleApi.selectDeviceByPage(pageNo, MAX_PAGE_SIZE)
        const hit = (pageData.list ?? []).find((d) => d.id === target)
        if (hit) return hit
        total = pageData.total ?? 0
        pageNo += 1
      } while ((pageNo - 1) * MAX_PAGE_SIZE < total && pageNo <= 20)
    } catch {
      try {
        const batch = await VehicleApi.selectAllDevices()
        const hit = batch.find((d) => d.id === target)
        if (hit) return { ...hit, details: hit }
      } catch {
        // ignore
      }
    }
    return null
  },

  batchEmergencyStop: async (deviceIds: string[]) => {

    const results = await Promise.allSettled(

      deviceIds.map((deviceId) =>

        VehicleApi.sendInstructions({

          deviceId,

          type: '2010008',

          data: { action: 'EMERGENCY_STOP' }

        })

      )

    )

    const failed = results.filter((r) => r.status === 'rejected').length

    return { total: deviceIds.length, failed, ok: deviceIds.length - failed }

  },



  /**

   * 拉取车辆列表：优先 select_device_by_page，缺遥测时 detail 回退 + 任务补全

   */

  getVehicleStatusList: async (): Promise<VehicleStatusVO[]> => {

    let pageItems: DevicePageItem[] = []



    try {

      const pageSize = MAX_PAGE_SIZE
      let pageNo = 1
      let total = 0

      do {
        const pageData = await VehicleApi.selectDeviceByPage(pageNo, pageSize)
        const batch = (pageData.list ?? []).filter((d) => d?.id && !d.deleted)
        pageItems.push(...batch)
        total = pageData.total ?? pageItems.length
        pageNo += 1
      } while (pageItems.length < total && pageItems.length > 0 && pageNo <= 20)

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

            const { detail, pageMeta: detailMeta } = await VehicleApi.selectDeviceDetail(id)

            const meta = { ...detailMeta, ...pageItem } as Partial<DevicePageItem>

            return mapDeviceDetail(id, detail, meta.online ?? pageItem?.online ?? false, meta)

          } catch {

            return pageItem ? mapDevicePageItem(pageItem) : null

          }

        })

      )

      statuses.push(...detailResults.filter((s): s is VehicleStatusVO => s !== null))

    }



    try {

      const tasks: TaskListItem[] = []
      let pageNo = 1
      while (pageNo <= 20) {
        const batch = await VehicleApi.selectTaskByPage(pageNo, MAX_PAGE_SIZE)
        tasks.push(...batch)
        if (batch.length < MAX_PAGE_SIZE) break
        pageNo += 1
      }

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



export type { CameraStreamItem, CloudDeviceBatchItem, DeviceDetailData, DeviceInstructionBody, DevicePageItem, TaskListItem } from './types'


