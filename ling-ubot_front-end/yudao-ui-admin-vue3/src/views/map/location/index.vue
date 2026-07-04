<template>
  <div ref="mapContainer" id="container">
    <div class="btn">
      <el-button type="primary" :icon="ArrowLeft" circle title="返回上一级" @click="getUpper()" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ArrowLeft } from '@element-plus/icons-vue'
import { onMounted, ref, nextTick, onUnmounted } from 'vue'
import { loadAMap } from '@/utils/amap-loader'
import * as LocationApi from '@/api/map/location'
import img from '@/assets/imgs/mapicon.jpg'
const router = useRouter() // 路由对象

defineOptions({ name: 'AMapComponent' })
const message = useMessage() // 消息提示

// 定义 props：是否使用左侧菜单主题色
interface Props {
  useMenuTheme?: boolean // 是否使用左侧菜单主题色，默认 false（使用默认白色主题）
}

const props = withDefaults(defineProps<Props>(), {
  useMenuTheme: false
})

const mapContainer = ref<HTMLElement | null>(null)
let AMap: any,
  map: any,
  points: any[] = [],
  count: number,
  pathPolylines: any[] = [], // 路径线条对象数组
  pathMarkers: any[] = [], // 路径标记点数组
  pathDataCache = new Map(), // 路径数据缓存
  pollingTimer: ReturnType<typeof setInterval> | null = null, // 车辆定位轮询定时器
  currentRegion: any = null // 当前选中的区域

// 预定义路径颜色
const pathColors = [
  '#FF0000', // 红色
  '#00FF00', // 绿色
  '#0000FF', // 蓝色
  '#FFFF00', // 黄色
  '#FF00FF', // 洋红色
  '#00FFFF', // 青色
  '#FFA500', // 橙色
  '#800080', // 紫色
  '#FFC0CB', // 粉色
  '#A52A2A'  // 棕色
]

// 获取地图主题样式
const getMapStyle = () => {
  // 如果不使用菜单主题，返回默认白色主题
  if (!props.useMenuTheme) {
    return 'amap://styles/normal' // 默认白色主题
  }
  
  // 使用菜单主题：获取左侧菜单背景色
  const menuBgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--left-menu-bg-color')
    .trim() || '#001529'
  
  // 将颜色转换为RGB值来判断亮度
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  }
  
  // 计算颜色亮度
  const getBrightness = (rgb: { r: number; g: number; b: number }) => {
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
  }
  
  const rgb = hexToRgb(menuBgColor)
  if (!rgb) return 'amap://styles/normal'
  
  const brightness = getBrightness(rgb)
  
  // 根据菜单颜色亮度选择合适的地图主题
  // 深色菜单（如 #001529）使用深色地图主题
  if (brightness < 128) {
    // 深色菜单，使用深蓝色或暗色主题
    return 'amap://styles/darkblue' // 深蓝色主题，与 #001529 风格相近
  } else {
    // 浅色菜单，使用浅色主题
    return 'amap://styles/light'
  }
}

// 1.初始化地图
const initMap = async () => {
  if (mapContainer.value) {
    AMap = await loadAMap()
    // 根据配置设置地图主题
    const mapStyle = getMapStyle()
    map = new AMap.Map(mapContainer.value, {
      mapStyle: mapStyle // 设置地图主题样式
    })
    getRegions()
  }
}

// 2.获取区域
const getRegions = async () => {
  try {
    const data = await LocationApi.getRegionsByTenants()
    // 数据处理
    points = data.map((m) => {
      let lnglat = m.points.split(',')
      return {
        regionName: m.name,
        lnglat,
        count: m.deviceNum
      }
    })
    if (points.length === 1) {
      count = points[0].count
    } else {
      count = points.length
    }

    if (points.length > 0) {
      nextTick(() => {
        showMarkers(false)
      })
    }
  } finally {
  }
}


let markerList: any[] = []
let markerMap = new Map() // 用于存储标记的映射，key为车辆名称
let closedLabels = new Set() // 存储已关闭label的车辆名称

// 显示标记 - 支持平滑更新
const showMarkers = (isPolling = false) => {
  // 首次加载或区域切换：清除所有标记重新创建
  if (!isPolling || markerList.length === 0) {
    if (markerList.length > 0) {
      map.remove(markerList)
      markerList = []
      markerMap.clear()
    }

    points.forEach((item) => {
      let content = `<div style="color:#fff;background:#f64343;width:20px;height:20px;border-radius:50%;text-align:center;line-height:18px;border-color:#fff;">${item.count}</div>`
      let lng = Number(item.lnglat[0]),
        lat = Number(item.lnglat[1])
      let marker: any = null
      if (item.count != undefined) {
        marker = customMarker('content', item.regionName, lng, lat, content)
      } else {
        marker = customMarker('icon', item.name, lng, lat, '')
      }
      if (marker) {
        marker.on('click', () => {
          clickMapPoint(item)
        })
        const markerKey = item.name || item.regionName
        const isRegion = item.count != undefined // 判断是否是地区

        // 如果是车辆且已关闭，显示小蓝点
        if (!isRegion && closedLabels.has(markerKey)) {
          marker.setLabel({
            direction: 'top',
            offset: new AMap.Pixel(0, -8),
            content: `<div onclick="handleOpenLabel('${markerKey}')" style="width:8px;height:8px;background:#409EFF;border-radius:50%;cursor:pointer;"></div>`,
            className: 'vehicle-dot-label'
          })
        } else {
          // 显示完整label，车辆信息添加close按钮
          const labelContent = item.infoWin || `<div style="color:#000;">${item.regionName}</div>`
          const closeBtn = isRegion ? '' : `<span class="label-close-btn" onclick="event.stopPropagation();handleCloseLabel('${markerKey}')" style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:#409EFF;color:#fff;border-radius:50%;font-size:14px;line-height:18px;text-align:center;cursor:pointer;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.2);">×</span>`
          marker.setLabel({
            direction: 'top',
            offset: new AMap.Pixel(-8, -2),
            content: `<div style="position:relative;padding-right:${isRegion ? '0' : '24px'};">
              ${labelContent}
              ${closeBtn}
            </div>`,
            className: 'vehicle-info-popup'
          })
        }
        markerList.push(marker)
        // 存储标记映射，使用车辆名称或区域名称作为key
        if (markerKey) {
          markerMap.set(markerKey, marker)
        }
      }
    })
    map.add(markerList)
    map.setFitView()
  } else {
    // 轮询更新：平滑移动现有标记位置
    updateMarkersSmooth()
  }
}

// 平滑更新标记位置
const updateMarkersSmooth = () => {
  points.forEach((item) => {
    if (!item.name || !item.lnglat) return

    const lng = Number(item.lnglat[0])
    const lat = Number(item.lnglat[1])

    // 检查坐标有效性
    if (isNaN(lng) || isNaN(lat)) return

    const existingMarker = markerMap.get(item.name)

    if (existingMarker) {
      // 获取当前位置
      const currentPos = existingMarker.getPosition()
      const newPos = new AMap.LngLat(lng, lat)

      // 计算两点之间的距离（米）
      const distance = currentPos.distance(newPos)

      // 如果位置有变化（距离大于0.1米），进行平滑移动
      if (distance > 0.1) {
        // 根据距离动态调整动画时长，确保移动平滑
        // 距离越远，动画时长越长，但不超过8秒（留2秒缓冲）
        const duration = Math.min(8000, Math.max(2000, distance * 50))

        existingMarker.moveTo(newPos, {
          duration: duration,
          delay: 0,
          autoRotation: false
        })
      } else if (distance > 0) {
        // 距离很小（小于0.1米），直接设置位置，不做动画
        existingMarker.setPosition(newPos)
      }

      // 更新标签内容（信息窗体）
      // label会自动跟随marker移动，这里只需要更新内容即可
      const markerKey = item.name || item.regionName
      const isRegion = item.count != undefined

      // 如果是车辆且已关闭，显示小蓝点
      if (!isRegion && closedLabels.has(markerKey)) {
        existingMarker.setLabel({
          direction: 'top',
          offset: new AMap.Pixel(0, -8),
          content: `<div onclick="handleOpenLabel('${markerKey}')" style="width:8px;height:8px;background:#409EFF;border-radius:50%;cursor:pointer;"></div>`,
          className: 'vehicle-dot-label'
        })
      } else {
        // 显示完整label，车辆信息添加close按钮
        const labelContent = item.infoWin || `<div style="color:#000;">${item.regionName}</div>`
        const closeBtn = isRegion ? '' : `<span class="label-close-btn" onclick="event.stopPropagation();handleCloseLabel('${markerKey}')" style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:#409EFF;color:#fff;border-radius:50%;font-size:14px;line-height:18px;text-align:center;cursor:pointer;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.2);">×</span>`
        existingMarker.setLabel({
          direction: 'top',
          offset: new AMap.Pixel(-8, -2),
          content: `<div style="position:relative;padding-right:${isRegion ? '0' : '24px'};">
              ${labelContent}
              ${closeBtn}
            </div>`,
          className: 'vehicle-info-popup'
        })
      }
    } else {
      // 新增的车辆，创建新标记
      const marker = customMarker('icon', item.name, lng, lat, '')
      if (marker) {
        marker.on('click', () => {
          clickMapPoint(item)
        })
        const newMarkerKey = item.name || item.regionName
        const isNewRegion = item.count != undefined

        // 如果是车辆且已关闭，显示小蓝点
        if (!isNewRegion && closedLabels.has(newMarkerKey)) {
          marker.setLabel({
            direction: 'top',
            offset: new AMap.Pixel(0, -8),
            content: `<div onclick="handleOpenLabel('${newMarkerKey}')" style="width:8px;height:8px;background:#409EFF;border-radius:50%;cursor:pointer;"></div>`,
            className: 'vehicle-dot-label'
          })
        } else {
          // 显示完整label，车辆信息添加close按钮
          const labelContent = item.infoWin || `<div style="color:#000;">${item.regionName}</div>`
          const closeBtn = isNewRegion ? '' : `<span class="label-close-btn" onclick="event.stopPropagation();handleCloseLabel('${newMarkerKey}')" style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:#409EFF;color:#fff;border-radius:50%;font-size:14px;line-height:18px;text-align:center;cursor:pointer;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.2);">×</span>`
          marker.setLabel({
            direction: 'top',
            offset: new AMap.Pixel(-8, -2),
            content: `<div style="position:relative;padding-right:${isNewRegion ? '0' : '24px'};">
              ${labelContent}
              ${closeBtn}
            </div>`,
            className: 'vehicle-info-popup'
          })
        }
        map.add(marker)
        markerList.push(marker)
        markerMap.set(item.name, marker)
      }
    }
  })

  // 检查是否有车辆已不在列表中，需要移除
  const currentNames = new Set(points.map(p => p.name).filter(Boolean))
  markerMap.forEach((marker, name) => {
    if (!currentNames.has(name)) {
      map.remove(marker)
      markerMap.delete(name)
      const index = markerList.indexOf(marker)
      if (index > -1) {
        markerList.splice(index, 1)
      }
    }
  })
}

// 自定义icon
const customIcon = () => {
  return new AMap.Icon({
    size: new AMap.Size(100, 34),
    image: img,
    imageSize: new AMap.Size(100, 40),
    imageOffset: new AMap.Pixel(-9, -3)
  })
}

// 自定义marker
const customMarker = (
  type = 'icon',
  title = '深圳技术大学',
  lng = 114.400115,
  lat = 22.700559,
  content?: string
): any => {
  let marker: any = null
  if (type === 'icon') {
    let mapicon = customIcon()
    marker = new AMap.Marker({
      position: new AMap.LngLat(lng, lat),
      title,
      icon: mapicon,
      zIndex: 30 // 设置车辆标记的层级高于路径和站点标记
    })
  }
  if (type === 'content') {
    marker = new AMap.Marker({
      position: new AMap.LngLat(lng, lat),
      title,
      content,
      zIndex: 30 // 设置车辆标记的层级高于路径和站点标记
    })
  }
  return marker
}


// 4.marker点击事件
const clickMapPoint = (e) => {
  if (e.count != undefined) {
    getCarInfo(e)
    getRegionInfo(e)
  }
  if (e.count == undefined) {
    nextTick(() => {
      map.setCenter(e.lnglat)
    })
  }
}

// 处理车辆信息数据
const handleCarInfo = (data: any[], regionLnglat: string | string[], isPolling = false) => {
  points = []
  data.forEach((item) => {
    let info = item.details || {}
    let workContent = ''
    if (info.taskId) {
      if (info.isInNode) {
        workContent = `<div style="color:#f5570e;font-weight:bold;text-wrap: wrap;">【${item.name}】当前停留在${info.inNodeName}</div>
        <div style="color:#aaa;font-size:12px;text-wrap: wrap;">预计当前站点停留时间${info.inNodeTime}s</div>`
      } else {
        workContent = `<div style="color:#f5570e;font-weight:bold;text-wrap: wrap;">【${item.name}】正在前往 >>> ${info.nextNodeName}</div>
        <div style="color:#aaa;font-size:12px;text-wrap: wrap;">自动巡航中，预计需要${info.nextNodeTime}s抵达下一站，您可以自行根据实时位置显示前往车辆位置进行选购</div>`
      }
    }
    let infoWin =
      `<div style="color:#000;font-size:12px;width:240px;"><b>车辆名称:${item.name || '-'}</b>` +
      `<div>工作状态 : ${info.workStatus || '-'}</div>` +
      `<div>任务:${info.task || '-'}</div>` +
      `<div>电量:${info.vehicle_power_info || '-'}</div>${workContent}</div>` +
      `<div><button class="order-btn" onclick="handleOrder('${item.id}')">下发任务</button></div>`
    let lnglat = info.position?.split(',')

    points.push({
      regionName: item.regionName,
      name: item.name,
      infoWin,
      lnglat: lnglat || regionLnglat
    })
  })
}

// 5.车辆信息
const getCarInfo = async (e, isPolling = false) => {
  try {
    const data = await LocationApi.getCarInfoByReion(e.regionName)
    handleCarInfo(data, e.lnglat, isPolling)

    nextTick(() => {
      showMarkers(isPolling)
    })
    // 首次获取成功后，保存当前区域并启动轮询
    if (!isPolling) {
      currentRegion = e
      startPolling()
    }
  } catch (error) {
    console.error('获取车辆信息失败:', error)
  }
}

// 启动车辆定位轮询
const startPolling = () => {
  stopPolling()
  if (!currentRegion) return
  pollingTimer = setInterval(() => {
    if (currentRegion) {
      getCarInfo(currentRegion, true)
    }
  }, 10000)
}

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

// 获取上级数据
const getUpper = () => {
  if (points.length === 0) {
    return
  }
  if (points.length > 0 && points[0].count != undefined) {
    message.warning('已经是最上级！')
    return
  }
  // 停止轮询并清除当前区域
  stopPolling()
  currentRegion = null
  closedLabels.clear()
  clearRegionPath()
  getRegions()
}

(window as any).handleOrder = (deviceId: string) => {
  router.push({ path: "/car/carTask", query: { deviceId } })
}

  // 关闭label，替换为小蓝点
  ; (window as any).handleCloseLabel = (markerName: string) => {
    const marker = markerMap.get(markerName)
    if (!marker) return

    closedLabels.add(markerName)

    marker.setLabel({
      direction: 'top',
      offset: new AMap.Pixel(0, -8),
      content: `<div onclick="handleOpenLabel('${markerName}')" style="width:8px;height:8px;background:#409EFF;border-radius:50%;cursor:pointer;"></div>`,
      className: 'vehicle-dot-label'
    })

    // 切换后立即触发一次轮询更新
    if (currentRegion) {
      getCarInfo(currentRegion, true)
    }
  }

  // 点击蓝点展开label，并重新获取车辆信息
  ; (window as any).handleOpenLabel = (markerName: string) => {
    const marker = markerMap.get(markerName)
    if (!marker) return

    closedLabels.delete(markerName)

    // 找到对应的车辆信息，重新调用getCarInfo
    const item = points.find(p => p.name === markerName)
    // 如果找不到，直接更新label
    const labelContent = item?.infoWin || `<div style="color:#000;">${markerName}</div>`

    marker.setLabel({
      direction: 'top',
      offset: new AMap.Pixel(-8, -2),
      content: `<div style="position:relative;padding-right:24px;">
        ${labelContent}
        <span class="label-close-btn" onclick="event.stopPropagation();handleCloseLabel('${markerName}')" style="position:absolute;top:4px;right:4px;width:18px;height:18px;background:#409EFF;color:#fff;border-radius:50%;font-size:14px;line-height:18px;text-align:center;cursor:pointer;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.2);">×</span>
      </div>`,
      className: 'vehicle-info-popup'
    })

    // 切换后立即触发一次轮询更新
    if (currentRegion) {
      getCarInfo(currentRegion, true)
    }
  }

// 处理路径数据的方法
const handlePathData = (pathData, regionName) => {
  if (!pathData || !Array.isArray(pathData) || pathData.length === 0) {
    console.warn('路径数据为空')
    return []
  }

  // 处理多条路径数据
  const processedPaths: any[] = []

  pathData.forEach((point: any) => {
    if (point.pathInfo && Array.isArray(point.pathInfo)) {
      // 每个pathInfo是一条完整路径，使用同一种颜色
      const pathColor = pathColors[processedPaths.length % pathColors.length]

      point.pathInfo.forEach((pathInfo: any, pathInfoIndex: number) => {
        // 检查pathInfo是否包含必要的三个元素
        if (pathInfo.current_site && pathInfo.next_site && pathInfo.path_poses_info) {
          // 处理路径坐标
          const path: number[][] = []
          if (Array.isArray(pathInfo.path_poses_info)) {
            pathInfo.path_poses_info.forEach((p: any) => {
              if (p.longitude && p.latitude) {
                path.push([p.longitude, p.latitude])
              }
            })
          }

          // 获取起始点和终点信息
          const startSite = pathInfo.current_site.site_name || `起点${pathInfoIndex + 1}`
          const endSite = pathInfo.next_site.site_name || `终点${pathInfoIndex + 1}`

          // 获取起始点和终点的坐标
          const startCoords = pathInfo.current_site.longitude && pathInfo.current_site.latitude
            ? [pathInfo.current_site.longitude, pathInfo.current_site.latitude]
            : null
          const endCoords = pathInfo.next_site.longitude && pathInfo.next_site.latitude
            ? [pathInfo.next_site.longitude, pathInfo.next_site.latitude]
            : null

          if (path.length > 0) {
            processedPaths.push({
              path: path,
              pathName: `${startSite} → ${endSite}`,
              startSite: startSite,
              endSite: endSite,
              startCoords: startCoords,
              endCoords: endCoords,
              color: pathColor, // 同一条路径使用相同颜色
              pathInfoIndex: pathInfoIndex,
              originalData: pathInfo
            })
          }
        }
      })
    }
  })

  if (processedPaths.length === 0) {
    console.warn('没有有效的路径坐标')
    return []
  }

  // 缓存处理后的路径数据
  pathDataCache.set(regionName, {
    originalData: pathData,
    processedPaths: processedPaths,
    timestamp: Date.now()
  })

  return processedPaths
}

const getRegionInfo = async (e) => {
  const regionName = e.regionName

  // 检查缓存中是否已有数据
  if (pathDataCache.has(regionName)) {
    const cachedData = pathDataCache.get(regionName)
    showRegionPaths(cachedData.processedPaths)
    return
  }

  try {
    const data = await LocationApi.getRegionPath(regionName)
    const processedPaths = handlePathData(data, regionName)
    if (processedPaths && processedPaths.length > 0) {
      showRegionPaths(processedPaths)
    }
  } catch (error) {
    console.error('获取区域路径失败:', error)
    message.error('获取区域路径失败')
  }
}

// 显示多条路径的方法
const showRegionPaths = (processedPaths) => {
  // 清除之前的路径和标记
  clearRegionPaths()

  if (!processedPaths || processedPaths.length === 0) {
    console.warn('处理后的路径数据为空')
    return
  }

  const allPolylines: any[] = []
  const allMarkers: any[] = []
  const siteMarkers: any[] = [] // 站点标记数组

  processedPaths.forEach((pathData: any, index: number) => {
    const { path, pathName, startSite, endSite, startCoords, endCoords, color } = pathData

    // 创建路径线条
    const polyline = new AMap.Polyline({
      path: path,
      strokeColor: color,
      strokeWeight: 6, // 6px宽度
      strokeOpacity: 0.8, // 透明度
      strokeStyle: 'solid', // 实线
      strokeDasharray: [0, 0], // 非虚线
      lineJoin: 'round', // 圆角连接
      lineCap: 'round', // 圆角端点
      zIndex: 10, // 层级
      extData: {
        type: 'regionPath',
        pathName: pathName,
        startSite: startSite,
        endSite: endSite,
        pathIndex: index
      }
    })

    // 添加到地图
    map.add(polyline)
    allPolylines.push(polyline)

    // 添加路径点击事件
    polyline.on('click', () => {
      message.info(`路径段: ${pathName}`)
    })

    // 添加站点标记
    if (path.length > 0) {
      // 起始点标记 - 优先使用startCoords，否则使用路径起点
      const startPoint = startCoords || path[0]
      const startMarker = createSiteMarker(startPoint, startSite, color, 'start')
      if (startMarker) {
        map.add(startMarker)
        siteMarkers.push(startMarker)
      }

      // 终点标记 - 优先使用endCoords，否则使用路径终点
      const endPoint = endCoords || path[path.length - 1]
      const endMarker = createSiteMarker(endPoint, endSite, color, 'end')
      if (endMarker) {
        map.add(endMarker)
        siteMarkers.push(endMarker)
      }
    }
  })

  // 保存到全局数组
  pathPolylines = allPolylines
  pathMarkers = [...allMarkers, ...siteMarkers] // 合并所有标记

  // 调整地图视野以显示所有路径
  if (allPolylines.length > 0) {
    map.setFitView(allPolylines)
  }
}

// 创建站点标记的方法
const createSiteMarker = (position: number[], siteName: string, color: string, type: 'start' | 'end'): any => {
  // 验证坐标数据
  if (!position || position.length < 2 || !position[0] || !position[1]) {
    console.warn('无效的坐标数据:', position)
    return null
  }

  // 根据类型设置不同的样式
  const isStart = type === 'start'
  const markerSize = isStart ? 16 : 14
  const markerShape = isStart ? 'circle' : 'square'
  const borderWidth = isStart ? 3 : 2

  const marker = new AMap.Marker({
    position: new AMap.LngLat(position[0], position[1]),
    content: `<div style="
      width: ${markerSize}px;
      height: ${markerSize}px;
      background-color: ${color};
      border: ${borderWidth}px solid #fff;
      border-radius: ${markerShape === 'circle' ? '50%' : '4px'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    anchor: 'center',
    zIndex: 20
  })

  // 添加站点名标签
  marker.setLabel({
    direction: 'top',
    offset: new AMap.Pixel(0, -20),
    content: `<div style="
      background-color: transparent;
      border: none;
      padding: 2px 4px;
      font-size: 12px;
      color: #333;
      white-space: nowrap;
      font-weight: 600;
      text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
    ">${siteName}</div>`
  })

  // 添加点击事件
  marker.on('click', () => {
    message.info(`${isStart ? '起点' : '终点'}: ${siteName}`)
  })

  return marker
}


onMounted(async () => {
  nextTick(() => {
    initMap()
  })
})

// 清除所有路径和标记
const clearRegionPaths = () => {
  // 清除所有路径线条
  if (pathPolylines.length > 0) {
    map.remove(pathPolylines)
    pathPolylines = []
  }

  if (pathMarkers.length > 0) {
    map.remove(pathMarkers)
    pathMarkers = []
  }
}

// 保持向后兼容的清除路径方法
const clearRegionPath = () => {
  clearRegionPaths()
}

// 清除路径数据缓存
const clearPathDataCache = () => {
  pathDataCache.clear()
}

onUnmounted(() => {
  // 停止轮询
  stopPolling()
  currentRegion = null
  // 清理所有路径和标记
  clearRegionPaths()
  // 清理路径数据缓存
  clearPathDataCache()
  map?.destroy()
})
</script>
<style scoped>
#container {
  padding: 0px;
  margin: 0px;
  width: 100%;
  height: 800px;
}

/* 修改高德地图的标签样式 */
:deep .amap-marker-label {
  position: absolute;
  z-index: 100;
  /* 提高车辆信息弹窗的层级，确保显示在最顶层 */
  background-color: white;
  white-space: nowrap;
  cursor: default;
  padding: 3px;
  font-size: 12px;
  line-height: 1.3;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  /* 添加阴影效果，增强视觉层次 */
  /* 添加平滑过渡效果 */
  transition: transform 0.3s ease-out;
}

.btn {
  position: absolute;
  z-index: 170;
  top: 20px;
  left: 20px;
}

/* 车辆marker的平滑移动效果 */
:deep .amap-marker {
  transition: transform 0.3s ease-out;
}
</style>
<style>
/* 信息窗体属于在全局页面 不要scoped限制 */
/* 车辆信息弹窗样式 */
.amap-marker-label.vehicle-info-popup {
  z-index: 200 !important;
  /* 确保车辆信息弹窗显示在最顶层 */
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.4;
  max-width: 300px;
  min-width: 200px;
}

.order-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  height: 24px;
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  text-align: center;
  box-sizing: border-box;
  user-select: none;
  vertical-align: middle;
  appearance: none;
  background-color: var(--el-color-primary);
  border: 1px solid var(--el-color-primary);
  white-space: nowrap;
  outline: none;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  font-weight: 500;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.order-btn:hover {
  background-color: var(--el-color-primary-light-3);
  border-color: var(--el-color-primary-light-3);
  color: #fff;
}

.order-btn:active {
  background-color: var(--el-color-primary-dark-2);
  border-color: var(--el-color-primary-dark-2);
  color: #ffffff;
}

.order-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.order-btn::before,
.order-btn::after {
  border: none;
  outline: none;
}

/* 小蓝点label样式 */
.amap-marker-label.vehicle-dot-label {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
  min-width: auto !important;
}

/* 关闭按钮hover效果 */
.label-close-btn:hover {
  background: #66b1ff !important;
  transform: scale(1.1);
  transition: all 0.2s ease-in-out;
}
</style>