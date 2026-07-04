<template>
  <div class="radar-panel">
    <div class="radar-panel__toolbar">
      <span class="radar-panel__title">雷达感知 · 障碍物栅格</span>
      <div v-if="hasData" class="radar-panel__meta">
        <span v-if="speedMps != null">v: {{ speedMps.toFixed(2) }} m/s</span>
        <span>航向: {{ Math.round(headingDeg) }}°</span>
      </div>
    </div>
    <div class="radar-panel__canvas">
      <svg viewBox="-12 -12 24 24" class="radar-panel__svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="radarGrid" width="1" height="1" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="#0a1018" />
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#152030" stroke-width="0.04" />
          </pattern>
        </defs>
        <rect x="-12" y="-12" width="24" height="24" fill="url(#radarGrid)" />

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
        <line x1="-11" y1="0" x2="11" y2="0" stroke="#1e3a52" stroke-width="0.06" />
        <line x1="0" y1="-11" x2="0" y2="11" stroke="#1e3a52" stroke-width="0.06" />

        <!-- 占用栅格（障碍物） -->
        <rect
          v-for="(cell, i) in occupiedCells"
          :key="'cell-' + i"
          :x="cell.x - cellSize / 2"
          :y="cell.y - cellSize / 2"
          :width="cellSize"
          :height="cellSize"
          :fill="cell.fill"
          :opacity="cell.opacity"
        />

        <!-- 历史局部轨迹 -->
        <polyline
          v-if="localTrail.length > 1"
          :points="localTrailPoints"
          fill="none"
          stroke="#2ecc71"
          stroke-width="0.16"
          stroke-linejoin="round"
          opacity="0.85"
        />

        <!-- 预测运动轨迹 -->
        <polyline
          v-if="predictedPath.length > 1"
          :points="predictedPathPoints"
          fill="none"
          stroke="#00d4ff"
          stroke-width="0.14"
          stroke-dasharray="0.3 0.2"
          opacity="0.9"
        />

        <!-- 车辆（中心，指向前方 -Y） -->
        <g :transform="`rotate(${-headingDeg})`">
          <polygon points="0,-0.65 0.5,0.45 -0.5,0.45" fill="#e67e22" opacity="0.95" />
          <circle cx="0" cy="0" r="0.12" fill="#fff" />
        </g>
      </svg>

      <div v-if="hasData" class="radar-panel__legend">
        <span v-if="localTrail.length > 1"><i class="dot dot--trail"></i>历史轨迹</span>
        <span v-if="predictedPath.length > 1"><i class="dot dot--predict"></i>预测轨迹</span>
        <span v-if="occupiedCells.length"><i class="dot dot--obs"></i>障碍物</span>
      </div>

      <div v-if="!hasData" class="radar-panel__empty">
        <p>等待雷达感知数据</p>
        <p class="radar-panel__empty-hint">接入 1010003 / 感知 topic 后显示栅格障碍物</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MapPoint, RadarGridCell } from '../types'

const props = withDefaults(
  defineProps<{
    historyPoints: MapPoint[]
    headingDeg: number
    speedMps?: number
    /** 雷达栅格障碍物（后续接 API） */
    gridCells?: RadarGridCell[]
  }>(),
  { speedMps: undefined, gridCells: () => [] }
)

const cellSize = 0.45

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
  toLocalPoints(props.historyPoints.slice(-30), origin.value, props.headingDeg)
)

/** 车体坐标系下沿前进方向（-Y）的短时预测轨迹 */
const predictedPath = computed((): MapPoint[] => {
  const speed = props.speedMps
  if (speed == null || speed <= 0.01) return []
  const steps = 14
  const dt = 0.25
  const pts: MapPoint[] = [{ x: 0, y: 0 }]
  for (let i = 1; i <= steps; i++) {
    pts.push({ x: 0, y: -speed * dt * i })
  }
  return pts
})

const localTrailPoints = computed(() =>
  localTrail.value.map((p) => `${p.x},${p.y}`).join(' ')
)

const predictedPathPoints = computed(() =>
  predictedPath.value.map((p) => `${p.x},${p.y}`).join(' ')
)

/** 将 API 栅格转为 SVG 坐标（米 → 视图单位，前方向上） */
const occupiedCells = computed(() => {
  return (props.gridCells ?? []).map((cell) => ({
    x: cell.y * -1,
    y: cell.x,
    fill: cell.occupied ? '#e74c3c' : '#3d5a80',
    opacity: cell.occupied ? 0.75 : 0.35
  }))
})

const hasData = computed(
  () =>
    localTrail.value.length > 1 ||
    predictedPath.value.length > 1 ||
    occupiedCells.value.length > 0
)
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

      &--predict {
        background: #00d4ff;
      }

      &--obs {
        background: #e74c3c;
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
    color: #667788;
    pointer-events: none;
    background: rgb(5 8 16 / 72%);

    p {
      margin: 0;
    }
  }

  &__empty-hint {
    font-size: 11px;
    color: #556677;
  }
}
</style>
