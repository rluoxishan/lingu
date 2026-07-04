import request from '@/config/axios'

// 获取当前用户的区域
export const getRegionsByTenants = () => {
  return request.get({ url: '/device/select_region' })
}

// 获取区域下的车辆信息
export const getCarInfoByReion = (regionName: string) => {
  return request.get({ url: `device/select_device_by_region_name?regionName=${regionName}` })
}

// 获取区域路径
export const getRegionPath = (regionName: string) => {
  return request.get({ url: `device/device_path_info?regionName=${regionName}` })
}
