<template>
  <div class="plot-panel" :class="{ 'plot-panel--embedded': embedded, 'plot-panel--dark': embedded }">
    <div class="plot-panel__header">电量趋势（演示）</div>
    <Echart :height="chartHeight" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    batteryHistory: { time: string; value: number }[]
    chartHeight?: number
    embedded?: boolean
  }>(),
  { chartHeight: 130, embedded: false }
)

const chartOptions = computed<EChartsOption>(() => {
  const dark = props.embedded
  const labelSize = dark ? 12 : 10
  const labelColor = dark ? '#9eb0c0' : '#666'
  const axisLineColor = dark ? '#2a4055' : '#eee'
  const splitColor = dark ? '#1e3a52' : '#f0f0f0'
  const lineColor = dark ? '#2ecc71' : '#27ae60'

  return {
    grid: {
      left: 46,
      right: 16,
      top: 16,
      bottom: dark ? 36 : 28
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: dark ? 'rgba(10, 16, 24, 0.92)' : undefined,
      borderColor: dark ? '#2a6090' : undefined,
      textStyle: { color: dark ? '#e8f0f8' : undefined, fontSize: 13 }
    },
    xAxis: {
      type: 'category',
      data: props.batteryHistory.map((d) => d.time),
      axisLabel: { fontSize: labelSize, color: labelColor, interval: 'auto' },
      axisLine: { lineStyle: { color: axisLineColor } }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: {
        fontSize: labelSize,
        color: labelColor,
        formatter: '{value}%',
        width: 38
      },
      splitLine: { lineStyle: { color: splitColor } }
    },
    series: [
      {
        name: '电量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: props.batteryHistory.map((d) => d.value),
        lineStyle: { color: lineColor, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: dark
              ? [
                  { offset: 0, color: 'rgba(46, 204, 113, 0.35)' },
                  { offset: 1, color: 'rgba(46, 204, 113, 0.02)' }
                ]
              : [
                  { offset: 0, color: 'rgba(39, 174, 96, 0.35)' },
                  { offset: 1, color: 'rgba(39, 174, 96, 0.02)' }
                ]
          }
        }
      }
    ]
  }
})
</script>

<style lang="scss" scoped>
.plot-panel {
  flex-shrink: 0;
  padding: 10px 12px 6px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgb(0 0 0 / 6%);

  &__header {
    margin-bottom: 4px;
    padding-left: 2px;
    font-size: 13px;
    font-weight: 600;
    color: #1a1a2e;
  }

  &--embedded {
    padding: 10px 14px 8px;
    background: transparent;
    box-shadow: none;

    .plot-panel__header {
      margin-bottom: 4px;
      font-size: 14px;
    }
  }

  &--dark {
    .plot-panel__header {
      font-size: 15px;
      color: #7ec8e3;
    }
  }
}
</style>
