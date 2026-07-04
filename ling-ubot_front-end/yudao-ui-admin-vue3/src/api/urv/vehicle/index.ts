import request from '@/config/axios'

export interface VehicleVO {
  id: string
  groupMemberId: string
  carSn: string
  name: string
  model: string
  enable: string
  createTime: string
}

export const VehicleApi = {

  updateVehicle: async (data: VehicleVO) => {
    return await request.put({ url: '/device/car/update', data })
  },

  createVehicle: async (data: VehicleVO) => {
    return await request.post({ url: '/device/car/create', data })
  },

  getVehiclePage: async (params: {
    pageNo: number
    pageSize: number
    name?: string
    tenantId?: number
  }) => {
    return await request.get({
      url: '/device/car/page', params
    })
  },

  getVehicle: async (id: number) => {
    return await request.get({ url: '/device/car/get?id=' + id })
  },

  getVehicleLiveData: async (id: number) => {
    //return await request.get({ url: '/device/car/getLive?id=' + id })
    return Promise.resolve({
      vehicleId: id,
      currentLatitude: 22.698739,
      currentLongitude: 114.403304,
      timestamp: 1735116765,
    })
  },

  deleteVehicle: async (id: number) => {
    return await request.delete( { url: '/device/car/delete?id=' + id })
  },

}
