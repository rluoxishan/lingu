<template>
  <div class="state-transition-panel">
    <div class="state-transition-panel__header">
      <span>状态变迁</span>
      <span class="state-transition-panel__tag">Foxglove · State Transitions</span>
    </div>
    <Echart :height="chartHeight" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { WORK_STATUS_MAP } from '../../types'

const props = withDefaults(
  defineProps<{
    statusHistory: { time: string; value: number }[]
    chartHeight?: number
  }>(),
  { chartHeight: 150 }
)

const STATUS_COLOR: Record<number, string> = {
  0: '#e67e22',
  1: '#3498db',
  2: '#e74c3c',
  3: '#f39c12',
  4: '#c0392b'
}

const chartOptions = computed<EChartsOption>(() => {
  const times = props.statusHistory.map((d) => d.time)
  const values = props.statusHistory.map((d) => d.value)
  const last = values[values.length - 1] ?? 0

  return {
    grid: { left: 52, right: 12, top: 16, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = (params as { axisValue: string; data: number }[])[0]
        if (!p) return ''
        const label = WORK_STATUS_MAP[p.data as keyof typeof WORK_STATUS_MAP]?.label ?? p.data
        return `${p.axisValue}<br/>${label} (${p.data})`
      }
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { fontSize: 10, color: '#999', interval: 'auto' },
      axisLine: { lineStyle: { color: '#eee' } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 4,
      interval: 1,
      axisLabel: {
        fontSize: 10,
        color: '#666',
        formatter: (v: number) => WORK_STATUS_MAP[v as keyof typeof WORK_STATUS_MAP]?.label ?? String(v)
      },
      splitLine: { lineStyle: { color: '#f5f5f5' } }
    },
    series: [
      {
        name: 'workStatus',
        type: 'line',
        step: 'end',
        showSymbol: false,
        data: values,
        lineStyle: { width: 2, color: STATUS_COLOR[last] ?? '#3498db' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${STATUS_COLOR[last] ?? '#3498db'}44` },
              { offset: 1, color: `${STATUS_COLOR[last] ?? '#3498db'}08` }
            ]
          }
        }
      }
    ]
  }
})
</script>

<style lang="scss" scoped>
.state-transition-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px 12px 6px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
    padding-left: 4px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
  }

  &__tag {
    font-size: 10px;
    font-weight: 400;
    color: #bbb;
  }
}
</style>
