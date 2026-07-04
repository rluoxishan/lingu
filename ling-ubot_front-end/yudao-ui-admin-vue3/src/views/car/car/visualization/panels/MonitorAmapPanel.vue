<template>
  <div class="monitor-amap-panel">
    <div class="monitor-amap-panel__toolbar">
      <span class="monitor-amap-panel__title">{{ displayTitle }}</span>
      <div class="monitor-amap-panel__tools">
        <el-button size="small" text @click="fitAllView">路线+车辆</el-button>
        <el-button size="small" text @click="fitVehicleView" :disabled="!vehicleLngLat">定位车辆</el-button>
      </div>
    </div>

    <div ref="mapHostRef" class="monitor-amap-panel__map-host">
      <div v-if="!regionName" class="monitor-amap-panel__overlay">
        <p>暂无区域</p>
        <p class="monitor-amap-panel__overlay-hint">请从车辆列表点「监控」进入（会带上 regionName）</p>
      </div>
      <div v-else-if="routeLoading" class="monitor-amap-panel__overlay monitor-amap-panel__overlay--dim">
        任务路线加载中…
      </div>
      <div v-else-if="routeHint" class="monitor-amap-panel__hint">{{ routeHint }}</div>

      <div v-if="showLegend" class="monitor-amap-panel__legend">
        <span v-if="hasRoute"><i class="dot dot--route"></i>任务路线</span>
        <span v-if="hasHistory"><i class="dot dot--history"></i>已走轨迹</span>
        <span v-if="vehicleLngLat"><i class="dot dot--vehicle"></i>车辆位置</span>
      </div>
    </div>

    <div class="monitor-amap-panel__footer">
      <template v-if="vehicleLngLat">
        <span>经度 {{ vehicleLngLat[0].toFixed(5) }}</span>
        <span>纬度 {{ vehicleLngLat[1].toFixed(5) }}</span>
        <span v-if="headingDeg != null">航向 {{ Math.round(headingDeg) }}°</span>
      </template>
      <span v-else class="monitor-amap-panel__footer-muted">等待车辆 GPS 定位（position）</span>
      <span v-if="routePointCount > 0" class="monitor-amap-panel__footer-muted">
        任务路线 {{ routePointCount }} 点
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getRegionsByTenants } from '@/api/map/location'
import { loadAMap } from '@/utils/amap-loader'
import {
  parseRegionPathToAmapLngLatList,
  parseRegionPathToAmapPolylines
} from '@/utils/regionPathParser'

const props = withDefaults(
  defineProps<{
    regionName?: string
    routeRawData?: unknown
    routeLoading?: boolean
    routeHint?: string
    routePointCount?: number
    taskName?: string
    vehicleLngLat?: [number, number] | null
    vehicleHistoryLngLat?: [number, number][]
    headingDeg?: number | null
    deviceLabel?: string
  }>(),
  {
    regionName: '',
    routeLoading: false,
    routeHint: '',
    routePointCount: 0,
    vehicleLngLat: null,
    vehicleHistoryLngLat: () => [],
    headingDeg: null,
    deviceLabel: ''
  }
)

const mapHostRef = ref<HTMLElement>()
let AMapLib: any = null
let map: any = null
let routePolylines: any[] = []
let historyPolyline: any = null
let vehicleMarker: any = null
let mapReady = false

const displayTitle = computed(() => {
  const base = props.taskName ? `任务地图 · ${props.taskName}` : '任务地图'
  if (props.regionName) return `${base} · ${props.regionName}`
  return base
})

const hasRoute = computed(() => routePolylines.length > 0)
const hasHistory = computed(() => (props.vehicleHistoryLngLat?.length ?? 0) > 1)
const showLegend = computed(() => hasRoute.value || hasHistory.value || !!props.vehicleLngLat)

function mapOverlaysForFit(): any[] {
  const items: any[] = [...routePolylines]
  if (historyPolyline) items.push(historyPolyline)
  if (vehicleMarker) items.push(vehicleMarker)
  return items
}

function fitAllView() {
  if (!map) return
  const items = mapOverlaysForFit()
  if (items.length > 0) {
    map.setFitView(items, false, [48, 48, 48, 48])
  }
}

function vehicleMarkerHtml(heading: number) {
  return `<div style="
    width:0;height:0;
    border-left:9px solid transparent;
    border-right:9px solid transparent;
    border-bottom:18px solid #e67e22;
    transform:rotate(${-heading}deg);
    transform-origin:center bottom;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,.4));
  "></div>`
}

function clearRouteLayers() {
  if (!map) return
  if (routePolylines.length) {
    map.remove(routePolylines)
    routePolylines = []
  }
}

function drawRoutes() {
  if (!map || !AMapLib || props.routeRawData == null) return

  clearRouteLayers()
  const segments = parseRegionPathToAmapPolylines(props.routeRawData)

  if (segments.length > 0) {
    routePolylines = segments.map((seg) => {
      const line = new AMapLib.Polyline({
        path: seg.path,
        strokeColor: seg.strokeColor,
        strokeWeight: 6,
        strokeOpacity: 0.88,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50,
        extData: { pathName: seg.pathName }
      })
      map.add(line)
      return line
    })
  } else {
    const fallback = parseRegionPathToAmapLngLatList(props.routeRawData)
    if (fallback.length > 1) {
      const line = new AMapLib.Polyline({
        path: fallback,
        strokeColor: '#3388ff',
        strokeWeight: 6,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50
      })
      map.add(line)
      routePolylines = [line]
    }
  }

  fitAllView()
}

function drawHistoryTrail() {
  if (!map || !AMapLib) return
  if (historyPolyline) {
    map.remove(historyPolyline)
    historyPolyline = null
  }
  const pts = props.vehicleHistoryLngLat ?? []
  if (pts.length < 2) return

  historyPolyline = new AMapLib.Polyline({
    path: pts,
    strokeColor: '#2ecc71',
    strokeWeight: 4,
    strokeOpacity: 0.85,
    lineJoin: 'round',
    lineCap: 'round',
    zIndex: 80
  })
  map.add(historyPolyline)
}

function updateVehicleMarker() {
  if (!map || !AMapLib) return
  const pos = props.vehicleLngLat
  if (!pos) {
    if (vehicleMarker) {
      map.remove(vehicleMarker)
      vehicleMarker = null
    }
    return
  }

  const lngLat = new AMapLib.LngLat(pos[0], pos[1])
  const html = vehicleMarkerHtml(props.headingDeg ?? 0)

  if (!vehicleMarker) {
    vehicleMarker = new AMapLib.Marker({
      position: lngLat,
      anchor: 'center',
      zIndex: 120,
      content: html
    })
    map.add(vehicleMarker)
  } else {
    const prev = vehicleMarker.getPosition()
    const moved =
      prev &&
      typeof prev.distance === 'function' &&
      prev.distance(lngLat) > 0.5

    if (moved && typeof vehicleMarker.moveTo === 'function') {
      vehicleMarker.moveTo(lngLat, { duration: 800, autoRotation: false })
    } else {
      vehicleMarker.setPosition(lngLat)
    }
    vehicleMarker.setContent(html)
  }
}

async function resolveRegionCenter(): Promise<[number, number] | null> {
  const name = props.regionName?.trim()
  if (!name) return null
  try {
    const regions = await getRegionsByTenants()
    const list = Array.isArray(regions) ? regions : []
    const hit = list.find((r: { name?: string }) => r.name === name)
    if (hit?.points) {
      const parts = hit.points.split(',').map((s: string) => parseFloat(s.trim()))
      if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        return [parts[0], parts[1]]
      }
    }
  } catch {
    // ignore
  }
  return null
}

async function initMap() {
  if (!mapHostRef.value || map) return
  AMapLib = await loadAMap()
  map = new AMapLib.Map(mapHostRef.value, {
    mapStyle: 'amap://styles/normal',
    zoom: 16,
    viewMode: '2D'
  })

  const center = props.vehicleLngLat ?? (await resolveRegionCenter()) ?? [114.0579, 22.5431]
  map.setCenter(center)
  mapReady = true

  drawRoutes()
  drawHistoryTrail()
  updateVehicleMarker()
  fitAllView()
}

function fitVehicleView() {
  if (map && props.vehicleLngLat) {
    map.setCenter(props.vehicleLngLat)
    map.setZoom(18)
  }
}

watch(
  () => props.routeRawData,
  () => {
    if (!mapReady) return
    drawRoutes()
  }
)

watch(
  () => props.vehicleHistoryLngLat,
  () => {
    if (!mapReady) return
    drawHistoryTrail()
  },
  { deep: true }
)

watch(
  () => [props.vehicleLngLat?.[0], props.vehicleLngLat?.[1], props.headingDeg] as const,
  () => {
    if (!mapReady) return
    updateVehicleMarker()
  }
)

watch(
  () => props.regionName,
  async () => {
    if (!mapReady) return
    drawRoutes()
  }
)

onMounted(() => {
  void initMap()
})

onUnmounted(() => {
  clearRouteLayers()
  if (historyPolyline && map) map.remove(historyPolyline)
  if (vehicleMarker && map) map.remove(vehicleMarker)
  historyPolyline = null
  vehicleMarker = null
  map?.destroy()
  map = null
  AMapLib = null
  mapReady = false
})
</script>

<style lang="scss" scoped>
.monitor-amap-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #1a2332;
  border: 1px solid #1a3a52;
  border-radius: 10px;
  box-shadow: 0 0 16px rgb(0 200 255 / 6%);

  &__toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgb(0 0 0 / 22%);
    border-bottom: 1px solid rgb(255 255 255 / 6%);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #7ec8e3;
  }

  &__tools {
    display: flex;
    gap: 2px;

    :deep(.el-button) {
      color: #9eb0c0;
    }
  }

  &__map-host {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  &__overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #c8d4e0;
    pointer-events: none;
    background: rgb(20 26 38 / 72%);

    &--dim {
      font-size: 13px;
      color: #9eb0c0;
    }
  }

  &__overlay-hint {
    max-width: 90%;
    font-size: 12px;
    line-height: 1.5;
    color: #888;
    text-align: center;
  }

  &__hint {
    position: absolute;
    top: 8px;
    left: 50%;
    z-index: 2;
    max-width: 92%;
    padding: 6px 10px;
    font-size: 11px;
    line-height: 1.4;
    color: #b8d8ec;
    text-align: center;
    pointer-events: none;
    background: rgb(10 16 24 / 82%);
    border: 1px solid rgb(42 96 144 / 35%);
    border-radius: 6px;
    transform: translateX(-50%);
  }

  &__legend {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 7px 10px;
    font-size: 12px;
    color: #333;
    pointer-events: none;
    background: rgb(255 255 255 / 92%);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgb(0 0 0 / 15%);

    span {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .dot {
      display: inline-block;
      width: 10px;
      height: 4px;
      border-radius: 2px;

      &--route {
        background: #3388ff;
      }

      &--history {
        background: #2ecc71;
      }

      &--vehicle {
        width: 8px;
        height: 8px;
        background: #e67e22;
        border-radius: 50%;
      }
    }
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    gap: 12px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #b8c8d8;
    background: rgb(0 0 0 / 28%);
    border-top: 1px solid rgb(42 96 144 / 30%);
  }

  &__footer-muted {
    font-weight: 400;
    color: #8899aa;
  }
}

:deep(.amap-logo),
:deep(.amap-copyright) {
  opacity: 0.45;
}
</style>
