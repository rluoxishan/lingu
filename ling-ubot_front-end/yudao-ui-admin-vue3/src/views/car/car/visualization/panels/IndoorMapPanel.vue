<template>
  <div class="indoor-map-panel">
    <div class="indoor-map-panel__toolbar">
      <span class="indoor-map-panel__title">{{ displayTitle }}</span>
      <div class="indoor-map-panel__tools">
        <el-tag v-if="perceptionDemo" size="small" type="warning" effect="dark">虚拟演示</el-tag>
        <el-tag v-else-if="perceptionLive" size="small" type="success" effect="plain">感知 Live</el-tag>
        <el-tag v-else-if="mapMeta" size="small" type="info" effect="plain">底图已加载</el-tag>
        <el-button size="small" text @click="zoomIn">+</el-button>
        <el-button size="small" text @click="zoomOut">−</el-button>
        <el-button size="small" text @click="resetView">复位</el-button>
        <el-checkbox v-model="followLocal" size="small">跟随</el-checkbox>
      </div>
    </div>

    <div ref="wrapRef" class="indoor-map-panel__canvas-wrap">
      <svg
        class="indoor-map-panel__svg"
        :viewBox="viewBoxStr"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="obs-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- PGM 底图 -->
        <image
          v-if="mapMeta"
          :href="mapMeta.imageUrl"
          x="0"
          y="0"
          :width="mapMeta.width"
          :height="mapMeta.height"
          preserveAspectRatio="none"
          class="indoor-map-panel__map-image"
        />

        <!-- 无底图时的网格背景 -->
        <template v-else>
          <rect :x="gridView.x" :y="gridView.y" :width="gridView.w" :height="gridView.h" fill="#1a2332" />
          <rect
            :x="gridView.x"
            :y="gridView.y"
            :width="gridView.w"
            :height="gridView.h"
            :fill="`url(#${gridId})`"
          />
        </template>

        <defs v-if="!mapMeta">
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
              stroke-width="0.04"
            />
          </pattern>
        </defs>

        <!-- 任务路线（世界坐标 → 像素或网格坐标） -->
        <polyline
          v-if="plannedPath"
          :points="plannedPath"
          fill="none"
          stroke="#5dade2"
          :stroke-width="strokeW"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- 已走轨迹 -->
        <polyline
          v-if="historyPath"
          :points="historyPath"
          fill="none"
          stroke="#2ecc71"
          :stroke-width="strokeW"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- 1010003 规划轨迹 -->
        <polyline
          v-if="trajectoryPath"
          :points="trajectoryPath"
          fill="none"
          stroke="#00d4ff"
          :stroke-width="strokeW * 1.1"
          stroke-linecap="round"
          class="indoor-map-panel__traj"
        />

        <!-- 超声扇形（可选） -->
        <g v-if="showVehicle && ultrasonicArcs.length" opacity="0.45">
          <path
            v-for="(arc, i) in ultrasonicArcs"
            :key="'us-' + i"
            :d="arc.d"
            fill="none"
            stroke="#58a6ff"
            :stroke-width="strokeW * 0.35"
          />
        </g>

        <!-- 障碍物多边形 -->
        <polygon
          v-for="(obs, i) in obstaclePolygons"
          :key="'obs-' + obs.id + '-' + i"
          :points="obs.points"
          :fill="obs.fill"
          :stroke="obs.stroke"
          :stroke-width="strokeW * 0.65"
          filter="url(#obs-glow)"
        />

        <!-- 车辆 -->
        <g v-if="showVehicle" :transform="vehicleTransform">
          <polygon :points="vehicleShape" :fill="vehicleColor" stroke="#fff" :stroke-width="strokeW * 0.25" opacity="0.98" />
          <circle cx="0" cy="0" :r="vehicleDotR" fill="#fff" />
        </g>
      </svg>

      <div v-if="hasLegend" class="indoor-map-panel__legend">
        <span v-if="historyPoints.length > 1"><i class="dot dot--history"></i>已走轨迹</span>
        <span v-if="plannedPoints.length > 1"><i class="dot dot--plan"></i>任务路线</span>
        <span v-if="trajectoryPoints.length > 1"><i class="dot dot--traj"></i>局部规划</span>
        <span v-if="obstacles.length"><i class="dot dot--obs"></i>障碍物</span>
        <span><i class="dot dot--vehicle"></i>车辆</span>
      </div>

      <div v-if="showEmptyOverlay" class="indoor-map-panel__empty">
        <p class="indoor-map-panel__empty-title">暂无室内地图数据</p>
        <p v-if="mapError" class="indoor-map-panel__empty-hint">{{ mapError }}</p>
        <p v-if="routeHint" class="indoor-map-panel__empty-hint">{{ routeHint }}</p>
        <p v-else class="indoor-map-panel__empty-hint">
          需 map_meta 底图 + position_xyz；感知需 1010003（2010012 ON）
        </p>
      </div>
    </div>

    <div class="indoor-map-panel__footer">
      <span v-if="showVehicle">X: {{ displayPose.x.toFixed(3) }}</span>
      <span v-if="showVehicle">Y: {{ displayPose.y.toFixed(3) }}</span>
      <span v-if="showVehicle">θ: {{ Math.round(displayPose.headingDeg) }}°</span>
      <span v-if="mapMeta">map: {{ mapMeta.mapId }}</span>
      <span v-if="obstacles.length">障碍: {{ obstacles.length }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapMeta, MapPoint3, PerceptionObstacle, UltrasonicReading } from '@/api/car/vehicle/perceptionTypes'
import type { MapPoint, VehiclePose } from '../types'
import {
  obstacleFill,
  obstacleToPixelPolygon,
  pointsToPixelPath,
  trajectoryToPixelPath,
  worldToPixel
} from '../indoorMapCoords'
import { bboxOfPoints } from '../mapRouteDraw'

const props = withDefaults(
  defineProps<{
    deviceId: string
    mapMeta: MapMeta | null
    mapLoading?: boolean
    mapError?: string
    pose: VehiclePose
    historyPoints: MapPoint[]
    plannedPoints: MapPoint[]
    obstacles?: PerceptionObstacle[]
    trajectoryPoints?: MapPoint3[]
    perceptionLive?: boolean
    perceptionDemo?: boolean
    ultrasonicSense?: UltrasonicReading[]
    workStatus: number
    taskName?: string
    follow?: boolean
    routeLoading?: boolean
    routeHint?: string
    hasLivePosition?: boolean
  }>(),
  {
    mapLoading: false,
    mapError: '',
    obstacles: () => [],
    trajectoryPoints: () => [],
    perceptionLive: false,
    perceptionDemo: false,
    ultrasonicSense: () => [],
    follow: false,
    routeLoading: false,
    routeHint: '',
    hasLivePosition: false
  }
)

const emit = defineEmits<{ 'update:follow': [boolean] }>()

const wrapRef = ref<HTMLElement>()
const gridId = `indoor-grid-${Math.random().toString(36).slice(2, 9)}`
const zoomScale = ref(1)
const panCenter = ref<{ x: number; y: number } | null>(null)

const followLocal = computed({
  get: () => props.follow,
  set: (v) => emit('update:follow', v)
})

const STATUS_COLOR: Record<number, string> = {
  0: '#e67e22',
  1: '#3498db',
  2: '#e74c3c',
  3: '#f39c12',
  4: '#c0392b'
}

const vehicleColor = computed(() => STATUS_COLOR[props.workStatus] ?? '#95a5a6')
const displayPose = computed(() => props.pose)
const hasValidPose = computed(() => props.hasLivePosition || props.historyPoints.length > 0)
const showVehicle = computed(() => hasValidPose.value)
const hasTaskRoute = computed(() => props.plannedPoints.length > 1)
const showEmptyOverlay = computed(
  () => !props.mapMeta && !showVehicle.value && !hasTaskRoute.value && props.obstacles.length === 0
)
const hasLegend = computed(
  () =>
    showVehicle.value ||
    hasTaskRoute.value ||
    props.historyPoints.length > 1 ||
    props.trajectoryPoints.length > 1 ||
    props.obstacles.length > 0
)

const displayTitle = computed(() => {
  const base = '室内地图 · 雷达感知'
  if (props.taskName) return `${base} · ${props.taskName}`
  return base
})

const strokeW = computed(() => (props.mapMeta ? 2.5 / zoomScale.value : 0.12))

function worldPath(points: MapPoint[]): string {
  if (points.length < 2) return ''
  if (props.mapMeta) return pointsToPixelPath(points, props.mapMeta)
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

const plannedPath = computed(() => worldPath(props.plannedPoints))
const historyPath = computed(() => worldPath(props.historyPoints.slice(-80)))
const trajectoryPath = computed(() =>
  props.mapMeta && props.trajectoryPoints.length > 1
    ? trajectoryToPixelPath(props.trajectoryPoints, props.mapMeta)
    : props.trajectoryPoints.length > 1
      ? props.trajectoryPoints.map((p) => `${p.x},${p.y}`).join(' ')
      : ''
)

const OBSTACLE_STROKE: Record<string, string> = {
  PEDESTRIAN: '#ff6b6b',
  VEHICLE: '#ffa94d',
  STATIC: '#adb5bd',
  UNKNOWN: '#e03131'
}

const obstaclePolygons = computed(() => {
  const strokeFor = (type: string) => OBSTACLE_STROKE[type] ?? OBSTACLE_STROKE.UNKNOWN
  if (!props.mapMeta) {
    return props.obstacles.map((obs) => ({
      id: obs.id,
      points: obs.polygon.map((p) => `${p.x},${p.y}`).join(' '),
      fill: obstacleFill(obs.type),
      stroke: strokeFor(obs.type)
    }))
  }
  return props.obstacles.map((obs) => ({
    id: obs.id,
    points: obstacleToPixelPolygon(obs, props.mapMeta!),
    fill: obstacleFill(obs.type),
    stroke: strokeFor(obs.type)
  }))
})

/** 超声距离（厘米）→ 车体前方扇形弧（演示 / 可选字段） */
const ULTRASONIC_AZIMUTH: Record<number, number> = { 1: 0, 2: -35, 3: 35 }

const ultrasonicArcs = computed(() => {
  if (!props.mapMeta || !props.ultrasonicSense.length) return []
  const pose = displayPose.value
  const pix = worldToPixel(pose.x, pose.y, props.mapMeta)
  const res = props.mapMeta.resolution
  return props.ultrasonicSense.map((u) => {
    const rangePx = (u.distance / 100 / res) * 0.85
    const az = ((ULTRASONIC_AZIMUTH[u.sensorId] ?? 0) - pose.headingDeg) * (Math.PI / 180)
    const spread = 0.22
    const x1 = pix.x + Math.sin(az - spread) * rangePx
    const y1 = pix.y - Math.cos(az - spread) * rangePx
    const x2 = pix.x + Math.sin(az + spread) * rangePx
    const y2 = pix.y - Math.cos(az + spread) * rangePx
    return { d: `M ${pix.x} ${pix.y} L ${x1} ${y1} A ${rangePx} ${rangePx} 0 0 1 ${x2} ${y2} Z` }
  })
})

const vehiclePixel = computed(() => {
  if (props.mapMeta) {
    return worldToPixel(displayPose.value.x, displayPose.value.y, props.mapMeta)
  }
  return { x: displayPose.value.x, y: displayPose.value.y }
})

const vehicleTransform = computed(() => {
  const p = vehiclePixel.value
  return `translate(${p.x}, ${p.y}) rotate(${-displayPose.value.headingDeg})`
})

const vehicleShape = computed(() => {
  const s = props.mapMeta ? 8 / zoomScale.value : 0.55
  return `0,${-s} ${s * 0.75},${s * 0.55} ${-s * 0.75},${s * 0.55}`
})

const vehicleDotR = computed(() => (props.mapMeta ? 2 / zoomScale.value : 0.12))

const gridStep = 1
const gridView = computed(() => {
  const pts = focusWorldPoints.value
  if (!pts.length) return { x: -5, y: -5, w: 10, h: 10 }
  const box = bboxOfPoints(pts)
  const pad = 2
  return {
    x: box.minX - pad,
    y: box.minY - pad,
    w: box.maxX - box.minX + pad * 2,
    h: box.maxY - box.minY + pad * 2
  }
})

const focusWorldPoints = computed((): MapPoint[] => {
  const pts: MapPoint[] = []
  if (props.plannedPoints.length) pts.push(...props.plannedPoints)
  if (props.historyPoints.length) pts.push(...props.historyPoints.slice(-40))
  if (showVehicle.value) pts.push(displayPose.value)
  for (const obs of props.obstacles) pts.push(...obs.polygon.map((p) => ({ x: p.x, y: p.y })))
  return pts
})

const viewBox = computed(() => {
  if (props.mapMeta) {
    const meta = props.mapMeta
    const fullW = meta.width
    const fullH = meta.height

    if (followLocal.value && showVehicle.value) {
      const c = vehiclePixel.value
      const spanX = (fullW * 0.35) / zoomScale.value
      const spanY = (fullH * 0.35) / zoomScale.value
      return {
        x: c.x - spanX / 2,
        y: c.y - spanY / 2,
        w: spanX,
        h: spanY
      }
    }

    if (panCenter.value && zoomScale.value !== 1) {
      const spanX = fullW / zoomScale.value
      const spanY = fullH / zoomScale.value
      return {
        x: panCenter.value.x - spanX / 2,
        y: panCenter.value.y - spanY / 2,
        w: spanX,
        h: spanY
      }
    }

    return { x: 0, y: 0, w: fullW, h: fullH }
  }

  const g = gridView.value
  const cx = g.x + g.w / 2
  const cy = g.y + g.h / 2
  const w = g.w / zoomScale.value
  const h = g.h / zoomScale.value
  if (followLocal.value && showVehicle.value) {
    return {
      x: displayPose.value.x - w / 2,
      y: displayPose.value.y - h / 2,
      w,
      h
    }
  }
  return { x: cx - w / 2, y: cy - h / 2, w, h }
})

const viewBoxStr = computed(
  () => `${viewBox.value.x} ${viewBox.value.y} ${viewBox.value.w} ${viewBox.value.h}`
)

function zoomIn() {
  zoomScale.value = Math.min(zoomScale.value * 1.25, 8)
}

function zoomOut() {
  zoomScale.value = Math.max(zoomScale.value / 1.25, 0.4)
}

function resetView() {
  zoomScale.value = 1
  panCenter.value = null
}
</script>

<style lang="scss" scoped>
.indoor-map-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 10px;

  &__toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgb(0 0 0 / 35%);
    border-bottom: 1px solid #30363d;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #c9d1d9;
  }

  &__tools {
    display: flex;
    gap: 6px;
    align-items: center;
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
    min-height: 200px;
    background: #0d1117;
  }

  &__map-image {
    opacity: 0.72;
  }

  &__traj {
    filter: drop-shadow(0 0 4px rgb(0 212 255 / 55%));
  }

  &__legend {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 7px 10px;
    font-size: 12px;
    color: #8b949e;
    pointer-events: none;
    background: rgb(0 0 0 / 55%);
    border: 1px solid rgb(48 54 61 / 80%);
    border-radius: 4px;

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

      &--traj {
        background: #00d4ff;
      }

      &--obs {
        background: #e74c3c;
      }

      &--vehicle {
        background: #e67e22;
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
    font-size: 13px;
    color: #8b949e;
    pointer-events: none;
    background: rgb(13 17 23 / 75%);
  }

  &__empty-title {
    margin: 0;
    font-weight: 600;
  }

  &__empty-hint {
    margin: 0;
    font-size: 12px;
    color: #6e7681;
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    gap: 12px;
    padding: 6px 10px;
    font-family: Consolas, Monaco, monospace;
    font-size: 11px;
    color: #8b949e;
    background: rgb(0 0 0 / 30%);
    border-top: 1px solid #30363d;
  }
}
</style>
