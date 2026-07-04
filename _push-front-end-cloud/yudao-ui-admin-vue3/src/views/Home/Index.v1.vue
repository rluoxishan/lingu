<template>
  <div class="retail-dashboard">
    <!-- 第一行：左侧统计板块 + 右侧地图板块 -->
    <el-row :gutter="16" class="mb-16px first-row">
      <!-- 左侧统计板块（占2/5） -->
      <el-col :span="10">
        <!-- 概览板块 -->
        <el-card shadow="never" class="mb-16px">
          <template #header>
            <CardTitle title="运营概览" />
          </template>
          <el-row :gutter="16" class="overview-row">
            <el-col :span="12" class="mb-16px overview-col">
              <div class="overview-item">
                <div class="overview-value-wrapper">
                  <span class="overview-number">{{ overviewData.totalDevices }}</span>
                  <span class="overview-unit">台</span>
                </div>
                <div class="overview-label">设备总数</div>
              </div>
            </el-col>
            <el-col :span="12" class="mb-16px overview-col">
              <div class="overview-item">
                <div class="overview-value-wrapper">
                  <span class="overview-unit">￥</span>
                  <span class="overview-number">{{ formatMoneyNumber(overviewData.totalRevenue) }}</span>
                  <span class="overview-unit">{{ formatMoneyUnit(overviewData.totalRevenue) }}</span>
                </div>
                <div class="overview-label">总营业额</div>
              </div>
            </el-col>
            <el-col :span="12" class="overview-col">
              <div class="overview-item">
                <div class="overview-value-wrapper">
                  <span class="overview-unit">￥</span>
                  <span class="overview-number">{{ formatMoneyNumber(overviewData.totalProfit) }}</span>
                  <span class="overview-unit">{{ formatMoneyUnit(overviewData.totalProfit) }}</span>
                </div>
                <div class="overview-label">总盈利额</div>
              </div>
            </el-col>
            <el-col :span="12" class="overview-col">
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
            </el-col>
          </el-row>
        </el-card>

        <!-- 设备状态 -->
        <el-card shadow="never" class="mb-16px">
          <template #header>
            <CardTitle title="设备状态" />
          </template>
          <Echart :height="300" :options="deviceStatusChartOptions" />
        </el-card>

        <!-- 营业额板块 -->
        <el-card shadow="never" class="revenue-card">
          <template #header>
            <CardTitle title="营业额统计" />
          </template>
          <Echart :height="300" :options="revenueChartOptions" />
        </el-card>
      </el-col>

      <!-- 右侧地图板块（占3/5） -->
      <el-col :span="14">
        <el-card shadow="never" class="map-card">
          <template #header>
            <CardTitle title="车辆位置与状态" />
          </template>
          <!-- 地图容器 -->
          <div class="map-container">
            <VehicleLocationMap />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 第二行：排名统计（三列并排） -->
    <el-row :gutter="16">
      <!-- 最高销售货品排名 -->
      <el-col :span="8">
        <el-card shadow="never" class="rank-card">
          <template #header>
            <CardTitle title="最高销售货品排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topProducts"
              :key="index"
              class="rank-item"
              :class="`rank-${index + 1}`"
            >
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="rank-content">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-value">￥{{ formatMoney(item.value) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 最高销售地点排名 -->
      <el-col :span="8">
        <el-card shadow="never" class="rank-card">
          <template #header>
            <CardTitle title="最高销售地点排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topLocations"
              :key="index"
              class="rank-item"
              :class="`rank-${index + 1}`"
            >
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="rank-content">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-value">￥{{ formatMoney(item.value) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 最高销售时段排名 -->
      <el-col :span="8">
        <el-card shadow="never" class="rank-card">
          <template #header>
            <CardTitle title="最高销售时段排名" />
          </template>
          <div class="rank-list">
            <div
              v-for="(item, index) in topTimeSlots"
              :key="index"
              class="rank-item"
              :class="`rank-${index + 1}`"
            >
              <div class="rank-number">{{ index + 1 }}</div>
              <div class="rank-content">
                <div class="rank-name">{{ item.name }}</div>
                <div class="rank-value">￥{{ formatMoney(item.value) }}</div>
              </div>
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

// 概览数据
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
    formatter: '{a} <br/>{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: 30,
    top: 'center',
    data: ['离线', '零售中', '运行中', '充电中'],
    textStyle: {
      color: '#ffffff'
    }
  },
  series: [
    {
      name: '设备状态',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 16,
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
    formatter: (params: any) => {
      const param = params[0]
      return `${param.name}<br/>${param.seriesName}: ￥${formatMoney(param.value)}`
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    data: ['当日营业额', '当前周营业额', '当前月营业额'],
    axisTick: {
      alignWithLabel: true
    }
  },
  yAxis: {
    type: 'value',
    axisLabel: {
      formatter: (value: number) => {
        if (value >= 10000) {
          return (value / 10000).toFixed(1) + '万'
        }
        return value.toString()
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
        formatter: (params: any) => {
          return '￥' + formatMoney(params.value)
        }
      }
    }
  ]
}) as EChartsOption

// 最高销售货品排名
const topProducts = ref([
  { name: '可乐', value: 12500 },
  { name: '文创1', value: 9800 },
  { name: '零食1', value: 7200 }
])

// 最高销售地点排名
const topLocations = ref([
  { name: 'XX1地点', value: 45600 },
  { name: 'XX2地点', value: 38900 },
  { name: 'XX3地点', value: 32100 }
])

// 最高销售时段排名
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
</script>

<style scoped lang="scss">
.retail-dashboard {
  padding: 16px;

  .first-row {
    :deep(.el-row) {
      align-items: stretch;
    }

    :deep(.el-col) {
      display: flex;
      flex-direction: column;
    }
  }

  .revenue-card {
    flex: 1;
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    :deep(.echart) {
      flex: 1;
    }
  }

  :deep(.overview-row) {
    align-items: stretch;
  }

  .overview-col {
    display: flex;
    flex-direction: column;
  }

  .overview-item {
    text-align: center;
    padding: 24px 16px;
    border-radius: 8px;
    background: var(--left-menu-bg-color, #001529);
    transition: all 0.3s;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 120px;

    &:hover {
      transform: translateY(-2px);
      background: var(--left-menu-bg-light-color, #0f2438);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .overview-value-wrapper {
      display: flex;
      align-items: baseline;
      justify-content: center;
      margin-bottom: 12px;
      gap: 4px;
      flex-wrap: wrap;

      .overview-number {
        font-size: 32px;
        font-weight: 700;
        color: #ffffff;
        line-height: 1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .overview-unit {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        opacity: 0.9;
        line-height: 1;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .overview-separator {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        opacity: 0.7;
        margin: 0 4px;
        line-height: 1;
      }
    }

    .overview-label {
      font-size: 14px;
      color: #ffffff;
      opacity: 0.9;
      font-weight: 500;
    }
  }

  .rank-list {
    padding: 8px 0;

      .rank-item {
      display: flex;
      align-items: center;
      padding: 12px 8px;
      margin-bottom: 8px;
      border-radius: 4px;
      transition: all 0.3s;
      background: var(--left-menu-bg-color, #001529);

      &:hover {
        background: var(--left-menu-bg-light-color, #0f2438);
      }

      &.rank-1 {
        background: rgba(64, 158, 255, 0.5);
        border-left: 3px solid #409eff;

        .rank-number {
          background: #409eff;
          color: #fff;
        }
      }

      &.rank-2 {
        background: rgba(103, 194, 58, 0.5);
        border-left: 3px solid #67c23a;

        .rank-number {
          background: #67c23a;
          color: #fff;
        }
      }

      &.rank-3 {
        background: rgba(230, 162, 60, 0.5);
        border-left: 3px solid #e6a23c;

        .rank-number {
          background: #e6a23c;
          color: #fff;
        }
      }

      .rank-number {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .rank-content {
        flex: 1;

        .rank-name {
          font-size: 14px;
          color: #ffffff;
          margin-bottom: 4px;
          opacity: 0.9;
        }

        .rank-value {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
        }
      }
    }
  }

  .map-card {
    height: 100%;
    display: flex;
    flex-direction: column;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 20px;
    }

    .map-container {
      flex: 1;
      background-color: #f5f7fa;
      border-radius: 4px;
      position: relative;
      min-height: 600px;
      overflow: hidden;

      :deep(#container) {
        width: 100%;
        height: 100%;
      }
    }
  }
}
</style>
