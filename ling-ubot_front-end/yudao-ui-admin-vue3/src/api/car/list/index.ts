import request from '@/config/axios'

export interface ListVO {
  id: string
  name: string
  info: string
  online: boolean
  enableConnectToEmqx: boolean
  createTime: Date
}

// 查询菜单（精简）列表
// export const getSimpleMenusList = () => {
//   return request.get({ url: '/system/menu/simple-list' })
// }

// 查询车辆列表--分页
export const getCarList = (data) => {
  return request.post({ url: '/device/select_device_by_page', data })
}

// 所有车辆
export const getAllCar = () => {
  return request.post({ url: '/device/select_all_device' })
}

// 获取车辆详情
export const getDetail = (id) => {
  return request.get({ url: '/device/select_device_detail_by_id?id=' + id, headersType: 'multipart/form-data' })
}

// 新增车辆
export const createCar = (data: ListVO) => {
  return request.post({ url: '/device/create_device', data })
}

// 修改车辆
export const updateCar = (data: ListVO) => {
  return request.post({ url: '/device/update_device', data })
}

// 删除车辆
export const deleteCar = (id: string) => {
  return request.get({ url: '/device/delete_device?id=' + id })
}

// 恢复车辆
export const recoverCar = (id: string) => {
  return request.get({ url: '/device/revoke_device_deletion?id=' + id })
}

