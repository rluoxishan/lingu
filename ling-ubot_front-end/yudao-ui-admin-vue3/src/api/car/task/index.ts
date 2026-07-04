import request from '@/config/axios'

export interface ListVO {
  id: string
  name: string
  info: string
  online: boolean
  enableConnectToEmqx: boolean
  createTime: Date
}

// 查询任务
export const getTaskList = (data) => {
  return request.post({ url: '/device/select_task_by_page', data })
}

// 新增任务
export const createTask = (data: ListVO) => {
  return request.post({ url: '/device/create_task', data })
}

// 修改任务
export const updateTask = (data: ListVO) => {
  return request.post({ url: '/device/update_task', data })
}

// 删除任务
export const deleteCar = (id: string) => {
  return request.get({ url: '/device/delete_task?id=' + id })
}

