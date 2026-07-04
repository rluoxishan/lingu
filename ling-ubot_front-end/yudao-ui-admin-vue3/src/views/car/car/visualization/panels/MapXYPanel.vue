<template>
  <div class="map-xy-panel">
    <div class="map-xy-panel__toolbar">
      <span class="map-xy-panel__title">{{ displayTitle }}</span>
      <div class="map-xy-panel__tools">
        <el-button size="small" text @click="zoomIn">+</el-button>
        <el-button size="small" text @click="zoomOut">−</el-button>
        <el-button size="small" text @click="resetView">复位</el-button>
        <el-checkbox v-model="followLocal" size="small">跟随</el-checkbox>
      </div>
    </div>
    <div ref="canvasWrapRef" class="map-xy-panel__canvas-wrap">
      <svg class="map-xy-panel__svg" :viewBox="viewBoxStr" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern
            :id="gridId"
            :width="gridStep"
            :height="gridStep"
            patternUnits="userSpaceOnUse"
          >
            <path
              :d="`M ${gridStep} 0 L 0 0 0 ${gridStep}`"
              fill="none"
              stroke="#3d4f66"
              :stroke-width="gridStroke"
            />
          </pattern>
        </defs>

        <rect :x="viewBox.x" :y="viewBox.y" :width="viewBox.w" :height="viewBox.h" fill="#1a2332" />
        <rect :x="viewBox.x" :y="viewBox.y" :width="viewBox.w" :height="viewBox.h" :fill="`url(#${gridId})`" />

        <!-- 任务规划路线 -->
        <path
          v-if="plannedRoutePath"
          :d="plannedRoutePath"
          fill="none"
          stroke="#5dade2"
          :stroke-width="lineStroke"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.95"
        />

        <!-- 已走轨迹 -->
        <path
          v-if="historyRoutePath"
          :d="historyRoutePath"
          fill="none"
          stroke="#2ecc71"
          :stroke-width="lineStroke"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- 车辆 -->
        <g v-if="showVehicle" :transform="vehicleTransform">
          <polygon :points="vehicleShape" :fill="vehicleColor" opacity="0.95" />
          <circle cx="0" cy="0" :r="vehicleDotR" fill="#fff" opacity="0.95" />
        </g>

        <!-- 比例尺 -->
        <g :transform="`translate(${viewBox.x + viewBox.w * 0.06}, ${viewBox.y + viewBox.h * 0.88})`">
          <line x1="0" y1="0" :x2="scaleBarLen" y2="0" stroke="#8a939f" stroke-width="0.08" />
          <text :x="scaleBarLen / 2" y="-0.18" fill="#8a939f" :font-size="scaleFontSize" text-anchor="middle">
            {{ scaleBarLabel }}
          </text>
        </g>
      </svg>

      <div v-if="(showVehicle || hasTaskRoute) && (historyPoints.length > 1 || plannedPoints.length > 1)" class="map-xy-panel__legend">
        <span v-if="historyPoints.length > 1"><i class="dot dot--history"></i>已走轨迹</span>
        <span v-if="plannedPoints.length > 1"><i class="dot dot--plan"></i>任务路线</span>
        <span><i class="dot dot--vehicle"></i>车辆</span>
      </div>

      <div v-if="showEmptyOverlay" class="map-xy-panel__empty">
        <p class="map-xy-panel__empty-title">暂无地图数据</p>
        <p v-if="taskName" class="map-xy-panel__empty-hint">当前任务：{{ taskName }}</p>
        <p v-if="routeHint" class="map-xy-panel__empty-hint map-xy-panel__empty-hint--primary">{{ routeHint }}</p>
        <p v-else class="map-xy-panel__empty-hint">
          请从车辆列表点「监控」进入；需 regionName 拉路线、position 显示车辆
        </p>
      </div>
      <div v-else-if="routeHint" class="map-xy-panel__hint map-xy-panel__hint--top">
        {{ routeHint }}
      </div>
      <div v-else-if="routeLoading" class="map-xy-panel__hint">任务路线加载中…</div>
    </div>
    <div v-if="showVehicle || hasTaskRoute" class="map-xy-panel__footer">
      <span v-if="showVehicle">X: {{ pose.x.toFixed(4) }}</span>
      <span v-if="showVehicle">Y: {{ pose.y.toFixed(4) }}</span>
      <span v-if="showVehicle">航向: {{ Math.round(pose.headingDeg) }}°</span>
      <span v-if="hasTaskRoute && !hasValidPose">已加载任务路线（暂无车辆定位）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapPoint, VehiclePose } from '../types'
import { bboxOfPoints, mapPointsToSvgPath } from '../mapRouteDraw'

const props = withDefaults(
  defineProps<{
    deviceId: string
    pose: VehiclePose
    historyPoints: MapPoint[]
    plannedPoints: MapPoint[]
    workStatus: number
    taskName?: string
    follow?: boolean
    panelTitle?: string
    routeLoading?: boolean
    routeHint?: string
    hasLivePosition?: boolean
    coordinateSpace?: 'xyz' | 'lonlat'
  }>(),
  {
    follow: false,
    panelTitle: '室内地图',
    routeLoading: false,
    routeHint: '',
    hasLivePosition: false,
    coordinateSpace: 'xyz'
  }
)

const emit = defineEmits<{ 'update:follow': [boolean] }>()

const canvasWrapRef = ref<HTMLElement>()
const containerAspect = ref(1.6)
const gridId = `grid-${Math.random().toString(36).slice(2, 9)}`
const zoomScale = ref(1)
const followLocal = computed({
  get: () => props.follow,
  set: (v) => emit('update:follow', v)
})

let canvasResizeObserver: ResizeObserver | null = null

const STATUS_COLOR: Record<number, string> = {
  0: '#e67e22',
  1: '#3498db',
  2: '#e74c3c',
  3: '#f39c12',
  4: '#c0392b'
}

const vehicleColor = computed(() => STATUS_COLOR[props.workStatus] ?? '#95a5a6')

const hasValidPose = computed(() => props.hasLivePosition || props.historyPoints.length > 0)

const showVehicle = computed(() => hasValidPose.value)

const hasTaskRoute = computed(() => props.plannedPoints.length > 1)

const showEmptyOverlay = computed(() => !showVehicle.value && !hasTaskRoute.value)

const displayTitle = computed(() => {
  if (props.taskName) return `${props.panelTitle} · ${props.taskName}`
  return props.panelTitle
})

const plannedRoutePath = computed(() =>
  props.plannedPoints.length > 1 ? mapPointsToSvgPath(props.plannedPoints) : ''
)

const historyRoutePath = computed(() =>
  props.historyPoints.length > 1 ? mapPointsToSvgPath(props.historyPoints) : ''
)

const focusPoints = computed((): MapPoint[] => {
  const parts: MapPoint[] = []
  if (props.plannedPoints.length > 0) parts.push(...props.plannedPoints)
  if (props.historyPoints.length > 0) parts.push(...props.historyPoints.slice(-35))
  if (showVehicle.value) parts.push(props.pose)
  return parts
})

const viewBox = computed(() => {
  const pts = focusPoints.value
  let minX = -2.5
  let maxX = 2.5
  let minY = -2
  let maxY = 2

  if (pts.length) {
    const box = bboxOfPoints(pts)
    minX = box.minX
    maxX = box.maxX
    minY = box.minY
    maxY = box.maxY
  } else if (showVehicle.value) {
    minX = props.pose.x - 2.5
    maxX = props.pose.x + 2.5
    minY = props.pose.y - 2
    maxY = props.pose.y + 2
  }

  const spanX = Math.max(maxX - minX, props.coordinateSpace === 'lonlat' ? 0.00002 : 0.01)
  const spanY = Math.max(maxY - minY, props.coordinateSpace === 'lonlat' ? 0.00002 : 0.01)
  const pad = Math.max(
    spanX * 0.08,
    spanY * 0.08,
    props.coordinateSpace === 'lonlat' ? 0.00001 : 0.8 / zoomScale.value
  )

  // 有任务路线时始终 fit 全路线；仅在无路线且开启跟随时才锁到车辆
  const useFollow =
    followLocal.value && showVehicle.value && props.plannedPoints.length <= 1 && props.historyPoints.length <= 1

  const cx = useFollow ? props.pose.x : (minX + maxX) / 2
  const cy = useFollow ? props.pose.y : (minY + maxY) / 2

  let halfW = Math.max(spanX / 2 + pad, props.coordinateSpace === 'lonlat' ? 0.00003 : 2 / zoomScale.value)
  let halfH = Math.max(spanY / 2 + pad, props.coordinateSpace === 'lonlat' ? 0.00003 : 1.6 / zoomScale.value)

  const aspect = containerAspect.value || 1.6
  if (halfW / halfH > aspect) {
    halfH = halfW / aspect
  } else {
    halfW = halfH * aspect
  }

  return {
    x: cx - halfW,
    y: -(cy + halfH),
    w: halfW * 2,
    h: halfH * 2
  }
})

const gridStep = computed(() => {
  const w = viewBox.value.w
  if (props.coordinateSpace === 'lonlat') return Math.max(w / 8, 0.00001)
  return Math.max(w / 10, 0.2)
})

const gridStroke = computed(() => gridStep.value * 0.04)

const scaleBarLen = computed(() => {
  const w = viewBox.value.w
  if (props.coordinateSpace === 'lonlat') {
    const target = w / 5
    if (target >= 0.01) return Math.round(target * 100) / 100
    if (target >= 0.001) return Math.round(target * 1000) / 1000
    return Math.round(target * 10000) / 10000
  }
  if (w > 12) return 2
  if (w > 6) return 1
  return 0.5
})

const scaleFontSize = computed(() => Math.max(viewBox.value.w * 0.018, 0.00015))

const lineStroke = computed(() => {
  const w = viewBox.value.w
  if (props.coordinateSpace === 'lonlat') {
    return Math.max(w * 0.006, 0.00004)
  }
  if (w > 50) return w * 0.004
  if (w > 5) return w * 0.012
  return Math.max(w * 0.025, 0.02)
})

const vehicleSize = computed(() => {
  const w = viewBox.value.w
  if (props.coordinateSpace === 'lonlat') return Math.max(w * 0.025, 0.00008)
  return Math.max(w * 0.04, 0.12)
})

const vehicleDotR = computed(() => vehicleSize.value * 0.2)

const vehicleShape = computed(() => {
  const s = vehicleSize.value
  return `0,${-s} ${s * 0.8},${s * 0.7} ${-s * 0.8},${s * 0.7}`
})

const viewBoxStr = computed(
  () => `${viewBox.value.x} ${viewBox.value.y} ${viewBox.value.w} ${viewBox.value.h}`
)

const scaleBarLabel = computed(() =>
  props.coordinateSpace === 'lonlat' ? `${scaleBarLen.value}°` : `${scaleBarLen.value}m`
)

const vehicleTransform = computed(() => {
  const { x, y, headingDeg } = props.pose
  return `translate(${x}, ${-y}) rotate(${-headingDeg})`
})

const updateContainerAspect = () => {
  if (!canvasWrapRef.value) return
  const { clientWidth, clientHeight } = canvasWrapRef.value
  if (clientHeight > 0) {
    containerAspect.value = clientWidth / clientHeight
  }
}

const zoomIn = () => {
  zoomScale.value = Math.min(zoomScale.value * 1.25, 4)
}
const zoomOut = () => {
  zoomScale.value = Math.max(zoomScale.value / 1.25, 0.5)
}
const resetView = () => {
  zoomScale.value = 1
}

watch(
  () => props.plannedPoints.length,
  (n) => {
    if (n > 1) zoomScale.value = 1
  }
)

onMounted(() => {
  nextTick(updateContainerAspect)
  if (canvasWrapRef.value) {
    canvasResizeObserver = new ResizeObserver(updateContainerAspect)
    canvasResizeObserver.observe(canvasWrapRef.value)
  }
})

onUnmounted(() => {
  canvasResizeObserver?.disconnect()
})
</script>

<style lang="scss" scoped>
.map-xy-panel {
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
    align-items: center;

    :deep(.el-checkbox__label) {
      font-size: 13px;
      color: #b0bcc8;
    }

    :deep(.el-button) {
      color: #9eb0c0;
    }
  }

  &__canvas-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  &__svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__legend {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 7px 10px;
    font-size: 12px;
    color: #b0bcc8;
    pointer-events: none;
    background: rgb(10 16 24 / 78%);
    border: 1px solid rgb(42 96 144 / 35%);
    border-radius: 6px;

    span {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;

      &--history {
        background: #2ecc71;
      }

      &--plan {
        background: #5dade2;
      }

      &--vehicle {
        background: #e67e22;
        border-radius: 50%;
      }
    }
  }

  &__empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #888;
    pointer-events: none;
    background: rgb(20 26 38 / 55%);

    p {
      margin: 0;
    }
  }

  &__empty-title {
    font-size: 15px;
    font-weight: 600;
    color: #c8d4e0;
  }

  &__empty-hint {
    max-width: 92%;
    font-size: 12px;
    line-height: 1.5;
    color: #888;
    text-align: center;

    &--primary {
      color: #7ec8e3;
    }
  }

  &__hint {
    position: absolute;
    bottom: 10px;
    left: 50%;
    padding: 4px 10px;
    font-size: 11px;
    color: rgb(255 255 255 / 45%);
    pointer-events: none;
    white-space: nowrap;
    background: rgb(0 0 0 / 35%);
    border-radius: 4px;
    transform: translateX(-50%);

    &--top {
      top: 8px;
      bottom: auto;
      max-width: 92%;
      white-space: normal;
      text-align: center;
      color: #b8d8ec;
      background: rgb(10 16 24 / 82%);
      border: 1px solid rgb(42 96 144 / 35%);
    }
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    gap: 16px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #b8c8d8;
    background: rgb(0 0 0 / 28%);
    border-top: 1px solid rgb(42 96 144 / 30%);
  }
}
</style>
