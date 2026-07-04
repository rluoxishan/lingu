import request from '@/config/axios'

export interface ListVO {
  id: string
  name: string
  points: array
}

// 查询区域列表-分页
export const getRegionsList = (data) => {
  return request.post({ url: '/region/select_device_by_page', data })
}

// 查询所有区域
export const getRegionsAll = (data) => {
  return request.post({ url: '/region/select_all_region', data })
}

// 新增区域
export const createRegion = (data: ListVO) => {
  return request.post({ url: '/region/create_region', data })
}

// 修改区域
export const updateRegion = (data: ListVO) => {
  return request.post({ url: '/region/update_region', data })
}

// 删除区域
export const deleteRegion = (name: string) => {
  return request.get({ url: '/region/delete_region?name=' + name })
}
