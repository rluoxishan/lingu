<template>
  <div class="retail-dashboard">
    <!-- 主要内容区域：左侧、中间地图、右侧 -->
    <el-row :gutter="16" class="main-row">
      <!-- 左侧列：运营概览、设备状态（占1/5） -->
      <el-col :span="5" class="left-column">
        <!-- 运营概览 -->
        <el-card shadow="never" class="overview-card mb-16px">
          <template #header>
            <CardTitle title="运营概览" />
          </template>
          <div class="overview-container">
            <div class="overview-item">
              <div class="overview-value-wrapper">
                <span class="overview-number">{{ overviewData.totalDevices }}</span>
                <span class="overview-unit">台</span>
              </div>
              <div class="overview-label">总体零售设备数量</div>
            </div>
            <div class="overview-item">
              <div class="overview-value-wrapper">
                <span class="overview-unit">￥</span>
                <span class="overview-number">{{ formatMoneyNumber(overviewData.totalRevenue) }}</span>
                <span class="overview-unit">{{ formatMoneyUnit(overviewData.totalRevenue) }}</span>
              </div>
              <div class="overview-label">总营业额</div>
            </div>
            <div class="overview-item">
              <div class="overview-value-wrapper">
                <span class="overview-unit">￥</span>
                <span class="overview-number">{{ formatMoneyNumber(overviewData.totalProfit) }}</span>
                <span class="overview-unit">{{ formatMoneyUnit(overviewData.totalProfit) }}</span>
              </div>
              <div class="overview-label">总盈利额</div>
            </div>
            <div class="overview-item">
              <div class="overview-value-wrapper">
                <span class="overview-number">{{ overviewData.totalMileage }}</span>
                <span class="overview-unit">km</span>
                <span class="overview-separator">/</span>
                <span class="overview-number">{{ overviewData.totalOperatingTime }}</span>
                <span class="overview-unit">h</span>
              </div>
              <div class="overview-label">总里程/运营时间</div>
            </div>
          </div>
        </el-card>

        <!-- 设备状态 -->
        <el-card shadow="never" class="device-status-card mb-16px">
          <template #header>
            <CardTitle title="设备状态" />
          </template>
          <Echart :height="200" :options="deviceStatusChartOptions" />
        </el-card>

        <!-- 营业额统计 -->
        <el-card shadow="never" class="revenue-card">
          <template #header>
            <CardTitle title="营业额统计" />
          </template>
          <Echart :height="200" :options="revenueChartOptions" />
        </el-card>
      </el-col>

      <!-- 中间列：地图（占3/5） -->
      <el-col :span="14" class="center-column">
        <div class="map-container">
          <VehicleLocationMap :use-menu-theme="true" />
        </div>
      </el-col>

      <!-- 右侧列：排名统计（占1/5） -->
      <el-col :span="5" class="right-column">
        <!-- 最高销售货品排名 -->
        <el-card shadow="never" class="rank-card mb-16px">
          <template #header>
            <CardTitle title="最高销售货品排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topProducts"
              :key="index"
              class="rank-item"
            >
              <div class="rank-header">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-name">{{ item.name }}</span>
                <span class="rank-value">￥{{ formatMoney(item.value) }}</span>
              </div>
              <el-progress
                :percentage="getRankPercentage(item.value, topProducts)"
                :color="getRankColor(index + 1)"
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>

        <!-- 最高销售地点排名 -->
        <el-card shadow="never" class="rank-card mb-16px">
          <template #header>
            <CardTitle title="最高销售地点排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topLocations"
              :key="index"
              class="rank-item"
            >
              <div class="rank-header">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-name">{{ item.name }}</span>
                <span class="rank-value">￥{{ formatMoney(item.value) }}</span>
              </div>
              <el-progress
                :percentage="getRankPercentage(item.value, topLocations)"
                :color="getRankColor(index + 1)"
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>

        <!-- 最高销售时段排名 -->
        <el-card shadow="never" class="rank-card">
          <template #header>
            <CardTitle title="最高销售时段排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topTimeSlots"
              :key="index"
              class="rank-item"
            >
              <div class="rank-header">
                <span class="rank-number">{{ index + 1 }}</span>
                <span class="rank-name">{{ item.name }}</span>
                <span class="rank-value">￥{{ formatMoney(item.value) }}</span>
              </div>
              <el-progress
                :percentage="getRankPercentage(item.value, topTimeSlots)"
                :color="getRankColor(index + 1)"
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { EChartsOption } from 'echarts'
import { CardTitle } from '@/components/Card'
import { Echart } from '@/components/Echart'
import VehicleLocationMap from '@/views/map/location/index.vue'

defineOptions({ name: 'RetailDashboard' })

// 运营概览数据
const overviewData = reactive({
  totalDevices: 200,
  totalRevenue: 1258000,
  totalProfit: 356800,
  totalMileage: 12500,
  totalOperatingTime: 8760
})

// 设备状态圆环图配置
const deviceStatusChartOptions = reactive<EChartsOption>({
  tooltip: {
    trigger: 'item',
    formatter: '{a} <br/>{b}: {c}台 ({d}%)',
    textStyle: {
      fontSize: 11
    }
  },
  legend: {
    orient: 'horizontal',
    bottom: 5,
    left: 'center',
    data: ['离线', '零售中', '运行中', '充电中'],
    textStyle: {
      color: '#ffffff',
      fontSize: 10
    },
    itemWidth: 10,
    itemHeight: 10,
    itemGap: 15
  },
  series: [
    {
      name: '设备状态',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: [
        { value: 20, name: '离线', itemStyle: { color: '#909399' } },
        { value: 80, name: '零售中', itemStyle: { color: '#409eff' } },
        { value: 60, name: '运行中', itemStyle: { color: '#67c23a' } },
        { value: 40, name: '充电中', itemStyle: { color: '#e6a23c' } }
      ]
    }
  ]
}) as EChartsOption

// 营业额柱形图配置
const revenueChartOptions = reactive<EChartsOption>({
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    },
    textStyle: {
      fontSize: 11
    },
    formatter: (params: any) => {
      const param = params[0]
      return `${param.name}<br/>${param.seriesName}: ￥${formatMoney(param.value)}`
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '10%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['当日营业额', '当前周营业额', '当前月营业额'],
    axisTick: {
      alignWithLabel: true
    },
    axisLabel: {
      color: '#ffffff',
      fontSize: 10
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      color: '#ffffff',
      fontSize: 10,
      formatter: (value: number) => {
        if (value >= 10000) {
          return (value / 10000).toFixed(1) + '万'
        }
        return value.toString()
      }
    },
    splitLine: {
      lineStyle: {
        color: 'rgba(255, 255, 255, 0.1)'
      }
    }
  },
  series: [
    {
      name: '营业额',
      type: 'bar',
      barWidth: '60%',
      data: [
        { value: 12500, itemStyle: { color: '#409eff' } },
        { value: 85600, itemStyle: { color: '#67c23a' } },
        { value: 356800, itemStyle: { color: '#e6a23c' } }
      ],
      label: {
        show: true,
        position: 'top',
        color: '#ffffff',
        fontSize: 10,
        formatter: (params: any) => {
          return '￥' + formatMoney(params.value)
        }
      }
    }
  ]
}) as EChartsOption

// 最高销售货品排名（前3）
const topProducts = ref([
  { name: '可乐', value: 12500 },
  { name: '文创1', value: 9800 },
  { name: '零食1', value: 7200 }
])

// 最高销售地点排名（前3）
const topLocations = ref([
  { name: 'XX1地点', value: 45600 },
  { name: 'XX2地点', value: 38900 },
  { name: 'XX3地点', value: 32100 }
])

// 最高销售时段排名（前3）
const topTimeSlots = ref([
  { name: '08:00-10:00', value: 25800 },
  { name: '14:00-16:00', value: 22500 },
  { name: '18:00-20:00', value: 19800 }
])

// 格式化金额
const formatMoney = (value: number): string => {
  if (value >= 10000) {
    return (value / 10000).toFixed(2) + '万'
  }
  return value.toFixed(2)
}

// 格式化金额数字部分
const formatMoneyNumber = (value: number): string => {
  if (value >= 10000) {
    return (value / 10000).toFixed(2)
  }
  return value.toFixed(2)
}

// 格式化金额单位部分
const formatMoneyUnit = (value: number): string => {
  if (value >= 10000) {
    return '万'
  }
  return ''
}

// 计算排名百分比（以最大值作为100%）
const getRankPercentage = (value: number, list: Array<{ value: number }>): number => {
  const maxValue = Math.max(...list.map(item => item.value))
  return maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
}

// 获取排名颜色
const getRankColor = (rank: number): string => {
  const colors = {
    1: '#409eff', // 蓝色
    2: '#67c23a', // 绿色
    3: '#e6a23c'  // 橙色
  }
  return colors[rank as keyof typeof colors] || '#909399'
}

</script>

<style scoped lang="scss">
.retail-dashboard {
  padding: 16px;
  background: linear-gradient(135deg, #0a1929 0%, #1a2332 100%);
  min-height: 100vh;
  color: #ffffff;

  // 摘要卡片样式
  .summary-card {
    text-align: center;

    .summary-content {
      padding: 20px;

      .summary-value {
        font-size: 36px;
        font-weight: 700;
        color: #4a90e2;
        line-height: 1;
        margin-bottom: 12px;
        text-shadow: 0 0 10px rgba(74, 144, 226, 0.6);
      }

      .summary-label {
        font-size: 14px;
        color: #ffffff;
        opacity: 0.9;
        font-weight: 500;
      }
    }
  }

  .main-row {
    :deep(.el-col) {
      display: flex;
      flex-direction: column;
    }
  }

  .left-column,
  .right-column {
    display: flex;
    flex-direction: column;
  }

  .center-column {
    display: flex;
    flex-direction: column;
  }

  // 卡片通用样式
  :deep(.el-card) {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(74, 144, 226, 0.4);
    border-radius: 8px;
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(74, 144, 226, 0.1),
      inset 0 0 20px rgba(74, 144, 226, 0.05);
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(74, 144, 226, 0.6);
      box-shadow: 
        0 6px 30px rgba(0, 0, 0, 0.6),
        0 0 30px rgba(74, 144, 226, 0.2),
        inset 0 0 30px rgba(74, 144, 226, 0.1);
    }

    .el-card__header {
      background: rgba(10, 20, 35, 0.8);
      border-bottom: 1px solid rgba(74, 144, 226, 0.3);
      padding: 12px 16px;
    }

    .el-card__body {
      padding: 16px;
    }
  }

  .overview-card {
    :deep(.el-card__body) {
      padding: 20px;
    }
  }

  .overview-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }

  .overview-item {
    text-align: center;
    padding: 16px 12px;
    border-radius: 8px;
    background: rgba(10, 25, 41, 0.6);
    border: 1px solid rgba(74, 144, 226, 0.3);
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80px;

    &:hover {
      transform: translateY(-2px);
      background: rgba(10, 25, 41, 0.8);
      border-color: rgba(74, 144, 226, 0.5);
      box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
    }

    .overview-value-wrapper {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 8px;

      .overview-number {
        font-size: 24px;
        font-weight: 700;
        color: #4a90e2;
        line-height: 1;
        text-shadow: 0 0 10px rgba(74, 144, 226, 0.6);
      }

      .overview-unit {
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        opacity: 0.9;
        line-height: 1;
      }

      .overview-separator {
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        opacity: 0.7;
        margin: 0 4px;
        line-height: 1;
      }
    }

    .overview-label {
      font-size: 12px;
      color: #ffffff;
      opacity: 0.9;
      font-weight: 500;
    }
  }

  .device-status-card,
  .revenue-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    :deep(.echart) {
      flex: 1;
      min-height: 0;
    }
  }

  .rank-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 12px;
    }
  }

  .rank-list {
    padding: 4px 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 8px;

    .rank-item {
      padding: 8px 6px;
      border-radius: 4px;
      transition: all 0.3s;
      background: rgba(10, 25, 41, 0.6);
      border: 1px solid rgba(74, 144, 226, 0.2);
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: stretch;
      min-height: 0;

      &:hover {
        background: rgba(10, 25, 41, 0.8);
        border-color: rgba(74, 144, 226, 0.4);
      }

      .rank-header {
        display: flex;
        align-items: center;
        margin-bottom: 6px;
        gap: 6px;
        flex-shrink: 0;

        .rank-number {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
          background: rgba(74, 144, 226, 0.3);
          color: #ffffff;
        }

        .rank-name {
          flex: 1;
          font-size: 11px;
          color: #ffffff;
          opacity: 0.9;
        }

        .rank-value {
          font-size: 11px;
          font-weight: 600;
          color: #4a90e2;
          text-shadow: 0 0 8px rgba(74, 144, 226, 0.4);
        }
      }

      :deep(.el-progress) {
        flex-shrink: 0;
        
        .el-progress-bar {
          .el-progress-bar__outer {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            height: 6px;
          }
        }
      }
    }
  }

  .map-container {
    flex: 1;
    position: relative;
    min-height: 0;
    overflow: hidden;

    :deep(#container) {
      width: 100%;
      height: 100%;
    }
  }

  // 摘要卡片样式
  .summary-card {
    text-align: center;

    .summary-content {
      padding: 20px;

      .summary-value {
        font-size: 36px;
        font-weight: 700;
        color: #4a90e2;
        line-height: 1;
        margin-bottom: 12px;
        text-shadow: 0 0 10px rgba(74, 144, 226, 0.6);
      }

      .summary-label {
        font-size: 14px;
        color: #ffffff;
        opacity: 0.9;
        font-weight: 500;
      }
    }
  }


  // ECharts 图表样式
  :deep(.echart) {
    background: transparent;
  }
}
</style>