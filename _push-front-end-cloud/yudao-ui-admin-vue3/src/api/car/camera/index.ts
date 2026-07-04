import request from '@/config/axios'

export interface ListVO {
  id: string
  name: string
  info: string
  sort: number
}

// 正在播放的设备
export const getCameraList = (data) => {
  return request.get({ url: '/camera/select_by_device_id?deviceId=' + data.deviceId })
}

// 新增摄像头
export const createCamera = (data: ListVO) => {
  return request.post({ url: '/camera/create', data })
}

// 修改摄像头
export const updateCamera = (data: ListVO) => {
  return request.post({ url: '/camera/update', data })
}

// 删除摄像头
export const deleteCamera = (id: string) => {
  return request.get({ url: '/camera/delete?id=' + id })
}