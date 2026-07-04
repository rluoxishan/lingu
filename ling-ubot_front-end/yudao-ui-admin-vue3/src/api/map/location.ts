import request from '@/config/axios'
import { unwrapCloudPayload } from '@/api/car/vehicle/cloudResponse'
import type { RegionPathGroup } from '@/utils/regionPathParser'

// 获取当前用户的区域
export const getRegionsByTenants = () => {
  return request.get({ url: '/device/select_region' })
}

// 获取区域下的车辆信息
export const getCarInfoByReion = (regionName: string) => {
  return request.get({ url: `device/select_device_by_region_name?regionName=${regionName}` })
}

/** GET /device/device_path_info — 区域任务路线（车辆定位页同款） */
export const getRegionPath = async (regionName: string): Promise<RegionPathGroup[]> => {
  const res = await request.get<unknown>({
    url: '/device/device_path_info',
    params: { regionName }
  })
  const data = unwrapCloudPayload<RegionPathGroup[]>(res)
  return Array.isArray(data) ? data : []
}
