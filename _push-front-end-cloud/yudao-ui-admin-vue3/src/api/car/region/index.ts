import request from '@/config/axios'
import { unwrapCloudPageList, unwrapCloudPayload } from '../vehicle/cloudResponse'
import type { RegionListItem, RegionPageData } from './types'

const EMPTY_PAGE: RegionPageData = { list: [], total: 0 }

export const RegionApi = {
  /** POST /region/select_device_by_page */
  selectRegionByPage: async (pageNo = 1, pageSize = 10): Promise<RegionPageData> => {
    const res = await request.post<unknown>({
      url: '/region/select_device_by_page',
      data: { pageNo, pageSize }
    })
    const data = unwrapCloudPayload<RegionPageData>(res)
    if (data && Array.isArray(data.list)) {
      return { list: data.list, total: data.total ?? data.list.length }
    }
    const list = unwrapCloudPageList<RegionListItem>(res)
    return list.length ? { list, total: list.length } : EMPTY_PAGE
  }
}
