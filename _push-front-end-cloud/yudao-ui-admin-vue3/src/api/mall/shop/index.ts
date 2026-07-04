import request from '@/config/axios'

export interface ShopVO {
  id: string
  name: string
}

// 查询店铺
export const getShopList = (data) => {
  return request.post({ url: '/store/select_store_by_page', data })
}

// 查询所有店铺
export const getAllShop = () => {
  return request.post({ url: '/store/select_all_store' })
}

// 新增店铺
export const createShop = (data: ShopVO) => {
  return request.post({ url: 'store/create_store', data })
}

// 修改店铺
export const updateShop = (data: ShopVO) => {
  return request.post({ url: '/store/update_store', data })
}

// 删除店铺
export const deleteShop = (id: string) => {
  return request.get({ url: '/store/delete_store?id=' + id })
}