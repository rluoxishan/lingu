<template>
  <div class="map-xy-panel">
    <div class="map-xy-panel__toolbar">
      <span class="map-xy-panel__title">{{ panelTitle }}</span>
      <div class="map-xy-panel__tools">
        <el-tag size="small" type="info">演示</el-tag>
        <el-button size="small" text @click="zoomIn">+</el-button>
        <el-button size="small" text @click="zoomOut">−</el-button>
        <el-button size="small" text @click="resetView">复位</el-button>
        <el-checkbox v-model="followLocal" size="small">跟随</el-checkbox>
      </div>
    </div>
    <div ref="canvasWrapRef" class="map-xy-panel__canvas-wrap">
      <svg
        class="map-xy-panel__svg"
        :viewBox="viewBoxStr"
        preserveAspectRatio="xMidYMid meet"
      >
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
              stroke-width="0.06"
            />
          </pattern>
          <radialGradient :id="`${gridId}-vignette`" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stop-color="#1e2838" stop-opacity="0" />
            <stop offset="100%" stop-color="#0f1419" stop-opacity="0.35" />
          </radialGradient>
        </defs>

        <rect :x="viewBox.x" :y="viewBox.y" :width="viewBox.w" :height="viewBox.h" fill="#1a2332" />
        <rect :x="viewBox.x" :y="viewBox.y" :width="viewBox.w" :height="viewBox.h" :fill="`url(#${gridId})`" />
        <rect
          :x="viewBox.x"
          :y="viewBox.y"
          :width="viewBox.w"
          :height="viewBox.h"
          :fill="`url(#${gridId}-vignette)`"
        />

        <!-- 规划路径 -->
        <polyline
          v-if="plannedPoints.length > 1"
          :points="toSvgPoints(plannedPoints)"
          fill="none"
          stroke="#5dade2"
          stroke-width="0.12"
          stroke-dasharray="0.35 0.22"
          opacity="0.9"
        />

        <!-- 历史轨迹 -->
        <polyline
          v-if="historyPoints.length > 1"
          :points="toSvgPoints(historyPoints)"
          fill="none"
          stroke="#2ecc71"
          stroke-width="0.14"
          stroke-linejoin="round"
        />

        <!-- 车辆 -->
        <g :transform="vehicleTransform">
          <polygon points="0,-0.5 0.4,0.35 -0.4,0.35" :fill="vehicleColor" opacity="0.95" />
          <circle cx="0" cy="0" r="0.1" fill="#fff" opacity="0.95" />
        </g>

        <!-- 比例尺 -->
        <g :transform="`translate(${viewBox.x + viewBox.w * 0.06}, ${viewBox.y + viewBox.h * 0.88})`">
          <line x1="0" y1="0" :x2="scaleBarLen" y2="0" stroke="#8a939f" stroke-width="0.08" />
          <text
            :x="scaleBarLen / 2"
            y="-0.18"
            fill="#8a939f"
            font-size="0.32"
            text-anchor="middle"
          >
            {{ scaleBarLabel }}
          </text>
        </g>
      </svg>

      <div class="map-xy-panel__legend">
        <span><i class="dot dot--history"></i>已走轨迹</span>
        <span><i class="dot dot--plan"></i>规划路径</span>
        <span><i class="dot dot--vehicle"></i>车辆</span>
      </div>

      <div v-if="!hasValidPose" class="map-xy-panel__empty">
        <p>等待定位数据</p>
        <p class="map-xy-panel__empty-hint">接入真实地图底图后将铺满此区域</p>
      </div>
      <div v-else-if="showMapPlaceholder" class="map-xy-panel__placeholder">
        演示模式 · 导入 SLAM/站点平面图后替换网格背景
      </div>
    </div>
    <div class="map-xy-panel__footer">
      <span>X: {{ pose.x.toFixed(2) }} m</span>
      <span>Y: {{ pose.y.toFixed(2) }} m</span>
      <span>航向: {{ Math.round(pose.headingDeg) }}°</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapPoint, VehiclePose } from '../types'

const props = withDefaults(
  defineProps<{
    deviceId: string
    pose: VehiclePose
    historyPoints: MapPoint[]
    plannedPoints: MapPoint[]
    workStatus: number
    follow?: boolean
    /** 演示网格模式（无真实底图） */
    demoMode?: boolean
    panelTitle?: string
  }>(),
  { follow: true, demoMode: true, panelTitle: '远景轨迹 · 室内地图' }
)

const emit = defineEmits<{ 'update:follow': [boolean] }>()

const canvasWrapRef = ref<HTMLElement>()
const containerAspect = ref(1.6)
const gridId = `grid-${Math.random().toString(36).slice(2, 9)}`
const gridStep = 1
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

const hasValidPose = computed(
  () => !(props.pose.x === 0 && props.pose.y === 0 && props.historyPoints.length <= 1)
)

const showMapPlaceholder = computed(() => props.demoMode && hasValidPose.value)

/** 视野范围：近期轨迹 + 车位 + 少量规划点，避免被整条规划路径拉得过大 */
const focusPoints = computed((): MapPoint[] => {
  const recent = props.historyPoints.slice(-35)
  const plannedHead = props.plannedPoints.slice(0, 6)
  return [...recent, ...plannedHead, props.pose]
})

const viewBox = computed(() => {
  const pts = focusPoints.value
  let minX = props.pose.x - 2.5
  let maxX = props.pose.x + 2.5
  let minY = props.pose.y - 2
  let maxY = props.pose.y + 2
  if (pts.length) {
    minX = Math.min(...pts.map((p) => p.x))
    maxX = Math.max(...pts.map((p) => p.x))
    minY = Math.min(...pts.map((p) => p.y))
    maxY = Math.max(...pts.map((p) => p.y))
  }

  const pad = 0.8 / zoomScale.value
  const cx = followLocal.value ? props.pose.x : (minX + maxX) / 2
  const cy = followLocal.value ? props.pose.y : (minY + maxY) / 2

  let halfW = Math.max((maxX - minX) / 2 + pad, 2 / zoomScale.value)
  let halfH = Math.max((maxY - minY) / 2 + pad, 1.6 / zoomScale.value)

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

const scaleBarLen = computed(() => {
  const w = viewBox.value.w
  if (w > 12) return 2
  if (w > 6) return 1
  return 0.5
})

const scaleBarLabel = computed(() => `${scaleBarLen.value}m`)

const viewBoxStr = computed(
  () => `${viewBox.value.x} ${viewBox.value.y} ${viewBox.value.w} ${viewBox.value.h}`
)

const toSvgPoints = (points: MapPoint[]) =>
  points.map((p) => `${p.x},${-p.y}`).join(' ')

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

  &__placeholder {
    position: absolute;
    bottom: 12px;
    left: 50%;
    padding: 4px 10px;
    font-size: 11px;
    color: rgb(255 255 255 / 35%);
    pointer-events: none;
    white-space: nowrap;
    transform: translateX(-50%);
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

  &__empty-hint {
    font-size: 12px;
    color: #666;
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
