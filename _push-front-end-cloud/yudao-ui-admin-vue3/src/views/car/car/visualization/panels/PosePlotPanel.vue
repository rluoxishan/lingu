<template>
  <div class="pose-plot-panel">
    <div class="pose-plot-panel__header">
      <span>坐标与航向</span>
      <span class="pose-plot-panel__tag">Foxglove · Plot</span>
    </div>
    <Echart :height="chartHeight" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from 'echarts'

const props = withDefaults(
  defineProps<{
    poseHistory: { time: string; x: number; y: number; heading: number }[]
    chartHeight?: number
  }>(),
  { chartHeight: 150 }
)

const chartOptions = computed<EChartsOption>(() => {
  const times = props.poseHistory.map((d) => d.time)

  return {
    grid: { left: 44, right: 44, top: 28, bottom: 28 },
    legend: {
      data: ['X (m)', 'Y (m)', '航向 (°)'],
      top: 0,
      right: 0,
      textStyle: { fontSize: 10, color: '#666' },
      itemWidth: 14,
      itemHeight: 8
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { fontSize: 10, color: '#999', interval: 'auto' },
      axisLine: { lineStyle: { color: '#eee' } }
    },
    yAxis: [
      {
        type: 'value',
        name: 'm',
        nameTextStyle: { fontSize: 10, color: '#999' },
        axisLabel: { fontSize: 10, color: '#999' },
        splitLine: { lineStyle: { color: '#f5f5f5' } }
      },
      {
        type: 'value',
        name: '°',
        min: 0,
        max: 360,
        nameTextStyle: { fontSize: 10, color: '#999' },
        axisLabel: { fontSize: 10, color: '#999' },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'X (m)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: props.poseHistory.map((d) => +d.x.toFixed(2)),
        lineStyle: { width: 2, color: '#3498db' }
      },
      {
        name: 'Y (m)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: props.poseHistory.map((d) => +d.y.toFixed(2)),
        lineStyle: { width: 2, color: '#2ecc71' }
      },
      {
        name: '航向 (°)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: false,
        data: props.poseHistory.map((d) => Math.round(d.heading)),
        lineStyle: { width: 1.5, color: '#e67e22', type: 'dashed' }
      }
    ]
  }
})
</script>

<style lang="scss" scoped>
.pose-plot-panel {
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
