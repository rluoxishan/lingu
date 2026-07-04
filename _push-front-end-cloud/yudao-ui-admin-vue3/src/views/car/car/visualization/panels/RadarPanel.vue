<template>
  <div class="radar-panel">
    <div class="radar-panel__toolbar">
      <span class="radar-panel__title">雷达感知 · 车端周围</span>
      <div class="radar-panel__meta">
        <span>LocMode: GLOBAL</span>
        <span>throttle: {{ throttle.toFixed(2) }}</span>
        <span>brake: {{ brake.toFixed(2) }}</span>
      </div>
    </div>
    <div class="radar-panel__canvas">
      <svg viewBox="-12 -12 24 24" class="radar-panel__svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#0d1520" />
            <stop offset="100%" stop-color="#050810" />
          </radialGradient>
        </defs>
        <rect x="-12" y="-12" width="24" height="24" fill="url(#radarBg)" />

        <!-- 距离环 -->
        <circle
          v-for="r in [3, 6, 9]"
          :key="r"
          cx="0"
          cy="0"
          :r="r"
          fill="none"
          stroke="#1e3a52"
          stroke-width="0.08"
        />

        <!-- 十字线 -->
        <line x1="-11" y1="0" x2="11" y2="0" stroke="#1e3a52" stroke-width="0.06" />
        <line x1="0" y1="-11" x2="0" y2="11" stroke="#1e3a52" stroke-width="0.06" />

        <!-- 局部轨迹（绿色，车体坐标系） -->
        <polyline
          v-if="localTrail.length > 1"
          :points="localTrailPoints"
          fill="none"
          stroke="#2ecc71"
          stroke-width="0.18"
          stroke-linejoin="round"
        />

        <!-- 规划路径（虚线） -->
        <polyline
          v-if="localPlan.length > 1"
          :points="localPlanPoints"
          fill="none"
          stroke="#5dade2"
          stroke-width="0.12"
          stroke-dasharray="0.35 0.25"
        />

        <!-- 点云 mock -->
        <circle
          v-for="(p, i) in pointCloud"
          :key="'pc-' + i"
          :cx="p.x"
          :cy="p.y"
          :r="p.r"
          :fill="p.color"
          opacity="0.75"
        />

        <!-- 障碍物框 -->
        <rect
          v-for="(box, i) in obstacles"
          :key="'obs-' + i"
          :x="box.x"
          :y="box.y"
          :width="box.w"
          :height="box.h"
          fill="none"
          :stroke="box.color"
          stroke-width="0.1"
        />

        <!-- 车辆（中心，指向前方 -Y） -->
        <g :transform="`rotate(${-headingDeg})`">
          <polygon points="0,-0.65 0.5,0.45 -0.5,0.45" fill="#e67e22" opacity="0.95" />
          <circle cx="0" cy="0" r="0.12" fill="#fff" />
        </g>
      </svg>
      <div class="radar-panel__legend">
        <span><i class="dot dot--trail"></i>局部轨迹</span>
        <span><i class="dot dot--cloud"></i>点云</span>
        <span><i class="dot dot--obs"></i>障碍物</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapPoint } from '../types'

const props = withDefaults(
  defineProps<{
    historyPoints: MapPoint[]
    plannedPoints: MapPoint[]
    headingDeg: number
    throttle?: number
    brake?: number
  }>(),
  { throttle: 0, brake: 0 }
)

/** 世界坐标 → 车体局部坐标（雷达视图：前方向上） */
function toLocalPoints(points: MapPoint[], origin: MapPoint, heading: number): MapPoint[] {
  if (!points.length) return []
  const rad = (heading * Math.PI) / 180
  const cos = Math.cos(-rad)
  const sin = Math.sin(-rad)
  return points.map((p) => {
    const dx = p.x - origin.x
    const dy = p.y - origin.y
    return {
      x: dx * cos - dy * sin,
      y: -(dx * sin + dy * cos)
    }
  })
}

const origin = computed(() => {
  const h = props.historyPoints
  return h.length ? h[h.length - 1] : { x: 0, y: 0 }
})

const localTrail = computed(() =>
  toLocalPoints(props.historyPoints.slice(-25), origin.value, props.headingDeg)
)

const localPlan = computed(() =>
  toLocalPoints(props.plannedPoints.slice(0, 8), origin.value, props.headingDeg)
)

const localTrailPoints = computed(() =>
  localTrail.value.map((p) => `${p.x},${p.y}`).join(' ')
)

const localPlanPoints = computed(() =>
  localPlan.value.map((p) => `${p.x},${p.y}`).join(' ')
)

/** 演示点云与障碍物（后续接 1010001 / 感知 topic） */
const pointCloud = computed(() => {
  const seed = props.headingDeg
  return Array.from({ length: 48 }, (_, i) => {
    const angle = (i / 48) * Math.PI * 2 + seed * 0.02
    const dist = 2 + (i % 5) * 1.2
    return {
      x: Math.cos(angle) * dist * 0.85,
      y: Math.sin(angle) * dist * 0.85,
      r: 0.08 + (i % 3) * 0.04,
      color: i % 7 === 0 ? '#ff6b9d' : '#8899aa'
    }
  })
})

const obstacles = computed(() => [
  { x: -2.2, y: -4.5, w: 1.2, h: 0.8, color: '#e74c3c' },
  { x: 1.8, y: -6.2, w: 1.5, h: 1.0, color: '#e74c3c' },
  { x: -4.0, y: 2.0, w: 0.9, h: 0.9, color: '#f39c12' },
  { x: 3.5, y: 1.5, w: 1.1, h: 0.7, color: '#f39c12' }
])
</script>

<style lang="scss" scoped>
.radar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #050810;
  border: 1px solid #1e3a52;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 25%);

  &__toolbar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgb(0 0 0 / 35%);
    border-bottom: 1px solid #1e3a52;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #7ec8e3;
  }

  &__meta {
    display: flex;
    gap: 12px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #8ab4cc;
  }

  &__canvas {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  &__svg {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 180px;
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
    color: #9eb0c0;
    pointer-events: none;
    background: rgb(0 0 0 / 50%);
    border: 1px solid rgb(42 96 144 / 40%);
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

      &--trail {
        background: #2ecc71;
      }

      &--cloud {
        background: #8899aa;
        border-radius: 50%;
      }

      &--obs {
        background: transparent;
        border: 1px solid #e74c3c;
      }
    }
  }
}
</style>
