/** POST /region/select_device_by_page 列表项 */
export interface RegionListItem {
  name: string
  /** 经度,纬度 */
  points: string
  deviceNum?: number | null
}

export interface RegionPageData {
  list: RegionListItem[]
  total: number
}
