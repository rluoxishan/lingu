import request from '@/config/axios'

// export const getTaskList = (data) => {
//   return request.post({ url: '/device/select_task_by_page', data })
// }

export const IssueInstructions = (data: any) => {
  return request.postOriginal({ url: '/device/instructions', data })
}

// 右侧小摄像头
export const getCameraVideo = (data) => {
  return request.get({ url: '/camera/playing?deviceId=' + data })
}

