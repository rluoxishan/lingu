<template>
  <div class="vehicle-page">
    <div class="vehicle-page__header">
      <h1 class="vehicle-page__title">车辆管理</h1>
    </div>

    <div class="vehicle-page__card">
      <div class="vehicle-page__toolbar">
        <div class="vehicle-page__section-title">
          <Icon icon="ep:van" :size="18" class="mr-8px" />
          <span>所有车辆信息</span>
        </div>
        <div class="vehicle-page__toolbar-right">
          <div class="vehicle-page__toolbar-actions">
            <el-button @click="getList">
              <Icon icon="ep:refresh" class="mr-4px" />
              刷新
            </el-button>
            <el-button type="primary" class="vehicle-page__register-btn" @click="handleRegister">
              <Icon icon="ep:plus" class="mr-4px" />
              注册新车
            </el-button>
          </div>
        </div>
      </div>

      <div class="vehicle-page__filters">
        <el-input
          v-model="queryParams.keyword"
          placeholder="设备ID / 名称 / 描述 / 任务"
          clearable
          class="vehicle-page__search"
          @keyup.enter="handleQuery"
          @clear="handleQuery"
        >
          <template #prefix>
            <Icon icon="ep:search" />
          </template>
        </el-input>
        <el-select
          v-model="queryParams.regionName"
          placeholder="所属区域"
          clearable
          filterable
          class="vehicle-page__select vehicle-page__select--wide"
          @change="handleQuery"
        >
          <el-option
            v-for="item in regionOptions"
            :key="item.value || 'all'"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryParams.workStatus"
          placeholder="工作状态"
          class="vehicle-page__select"
          @change="handleQuery"
        >
          <el-option
            v-for="item in workStatusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryParams.online"
          placeholder="在线状态"
          class="vehicle-page__select"
          @change="handleQuery"
        >
          <el-option
            v-for="item in onlineOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-select
          v-model="queryParams.alert"
          placeholder="告警状态"
          class="vehicle-page__select"
          @change="handleQuery"
        >
          <el-option
            v-for="item in alertOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-4px" />
          查询
        </el-button>
        <el-button link type="primary" @click="resetQuery">重置</el-button>
        <span v-if="filteredTotal !== allTotal" class="vehicle-page__filter-hint">
          筛选 {{ filteredTotal }} / 共 {{ allTotal }} 辆
        </span>
        <el-button class="vehicle-page__emergency-btn" @click="handleBatchEmergencyStop">
          <Icon icon="ep:switch-button" class="mr-4px" />
          批量急停
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        row-key="vehicleId"
        :stripe="false"
        class="vehicle-page__table"
        :header-cell-style="tableHeaderStyle"
      >
        <el-table-column label="序号" align="center" width="60">
          <template #default="{ $index }">
            {{ (queryParams.pageNo - 1) * queryParams.pageSize + $index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="设备ID" align="center" prop="vehicleId" min-width="128" show-overflow-tooltip fixed="left" />
        <el-table-column label="车辆名称" align="center" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.vehicleName || '-' }}</template>
        </el-table-column>
        <el-table-column label="区域" align="center" min-width="108" show-overflow-tooltip>
          <template #default="{ row }">{{ row.regionName || '-' }}</template>
        </el-table-column>
        <el-table-column label="描述" align="center" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.vehicleDescription || '-' }}</template>
        </el-table-column>
        <el-table-column label="地图" align="center" width="88">
          <template #default="{ row }">
            <span
              class="vehicle-page__map-cap"
              :class="{
                'vehicle-page__map-cap--full':
                  row.positionXyz || row.positionLonLat || row.positionRaw,
                'vehicle-page__map-cap--route': row.regionName
              }"
            >
              {{ formatMapCapability(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="在线" align="center" width="72">
          <template #default="{ row }">
            <span :class="['status-tag', row.online ? 'status-tag--green' : 'status-tag--red']">
              {{ row.online ? '在线' : '离线' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="工作状态" align="center" width="90">
          <template #default="{ row }">
            <span :class="['status-tag', getWorkStatusClass(row.workStatus)]">
              {{ formatWorkStatus(row.workStatus) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="电量" align="center" width="100">
          <template #default="{ row }">
            <BatteryBar :battery="row.battery" :online="row.online" />
          </template>
        </el-table-column>
        <el-table-column label="当前站点" align="center" min-width="96" show-overflow-tooltip>
          <template #default="{ row }">{{ formatInNodeLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="当前任务" align="center" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="vehicle-page__task-cell">
              <span>{{ formatListTask(row) }}</span>
              <span
                v-if="row.taskProgress != null && row.workStatus === 1"
                class="vehicle-page__task-progress"
              >
                {{ row.taskProgress }}%
              </span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="更新" align="center" width="96" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="vehicle-page__time">{{ formatUpdatedAtShort(row.updatedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="告警" align="center" width="80">
          <template #default="{ row }">
            <el-tooltip v-if="hasFault(row) && row.alertMsg" :content="row.alertMsg" placement="top">
              <span class="status-tag status-tag--red">有告警</span>
            </el-tooltip>
            <span v-else-if="hasFault(row)" class="status-tag status-tag--red">有告警</span>
            <span v-else class="status-tag status-tag--grey">正常</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right" width="210">
          <template #default="{ row }">
            <div class="vehicle-page__actions">
              <el-tooltip content="详情" placement="top">
                <el-button link type="primary" @click="handleDetail(row)">
                  <Icon icon="ep:view" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button link type="primary" @click="handleEdit(row)">
                  <Icon icon="ep:edit-pen" />
                </el-button>
              </el-tooltip>
              <el-tooltip :content="isRunning(row.vehicleId) ? '暂停' : '启动'" placement="top">
                <el-button
                  link
                  :type="isRunning(row.vehicleId) ? 'warning' : 'success'"
                  @click="handleToggleRun(row)"
                >
                  <Icon :icon="isRunning(row.vehicleId) ? 'ep:video-pause' : 'ep:video-play'" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="监控" placement="top">
                <el-button link type="primary" @click="handleMonitor(row)">
                  <Icon icon="ep:monitor" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="row.deleted" content="恢复" placement="top">
                <el-button link type="primary" @click="handleRecover(row)">
                  <Icon icon="ep:refresh-left" />
                </el-button>
              </el-tooltip>
              <el-tooltip v-else content="删除" placement="top">
                <el-button link type="danger" @click="handleDelete(row)">
                  <Icon icon="ep:delete" />
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="vehicle-page__pagination">
        <el-pagination
          v-model:current-page="queryParams.pageNo"
          v-model:page-size="queryParams.pageSize"
          :total="filteredTotal"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" title="设备详情" size="520px" destroy-on-close>
      <template v-if="detailRow">
        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">基本信息</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="设备ID">{{ detailRow.vehicleId }}</el-descriptions-item>
            <el-descriptions-item label="车辆名称">{{ detailRow.vehicleName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="车辆描述">{{ detailRow.vehicleDescription || '-' }}</el-descriptions-item>
            <el-descriptions-item label="所属区域">{{ detailRow.regionName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="所属租户">
              {{ detailRow.tenantName || '-' }}
              <span v-if="detailRow.tenantId != null" class="vehicle-page__detail-muted">（ID: {{ detailRow.tenantId }}）</span>
            </el-descriptions-item>
            <el-descriptions-item label="EMQX用户名称">
              <span class="vehicle-page__emqx">{{ detailRow.emqxUsername || detailRow.clientId || '-' }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detailRow.clientId && detailRow.clientId !== detailRow.emqxUsername" label="Client ID">
              <span class="vehicle-page__emqx">{{ detailRow.clientId }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="允许连接EMQX">
              {{ formatBool(detailRow.enableConnectToEmqx) }}
            </el-descriptions-item>
            <el-descriptions-item label="注册时间">
              {{ formatUpdatedAt(detailRow.createTime) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">连接与在线</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="在线状态">
              <span :class="['status-tag', detailRow.online ? 'status-tag--green' : 'status-tag--red']">
                {{ detailRow.online ? '在线' : '离线' }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="最近连接">
              {{ formatUpdatedAt(detailRow.connectedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="最近断开">
              {{ formatUpdatedAt(detailRow.disconnectedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="数据更新时间">
              {{ formatUpdatedAt(detailRow.updatedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="本地运行">
              {{ isRunning(detailRow.vehicleId) ? '已启动' : '未启动' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">运行状态</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="工作状态">
              <span :class="['status-tag', getWorkStatusClass(detailRow.workStatus)]">
                {{ formatWorkStatus(detailRow.workStatus) }}
              </span>
              <span class="vehicle-page__detail-muted">（{{ detailRow.workStatus }}）</span>
            </el-descriptions-item>
            <el-descriptions-item label="机器人状态">
              {{ formatRobotStatus(detailRow.robotStatus) }}
            </el-descriptions-item>
            <el-descriptions-item label="电量">
              <BatteryBar :battery="detailRow.battery" :online="detailRow.online" />
            </el-descriptions-item>
            <el-descriptions-item label="车速">
              {{ formatSpeedMps(detailRow.speedMps ?? detailRow.vehicleInfo?.vehicleSpeed) }}
            </el-descriptions-item>
            <el-descriptions-item label="刹车状态">
              {{ detailRow.brakeStatus ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="驾驶模式">
              {{ formatDrivingMode(detailRow.vehicleInfo?.drivingMode) }}
            </el-descriptions-item>
            <el-descriptions-item label="里程">
              {{ detailRow.vehicleInfo?.odometry != null ? `${detailRow.vehicleInfo.odometry} m` : '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">任务与站点</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务ID">{{ formatTaskId(detailRow.taskId) }}</el-descriptions-item>
            <el-descriptions-item label="任务名称">{{ detailRow.taskName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="任务进度">
              {{ formatPercent(detailRow.taskProgress) }}
            </el-descriptions-item>
            <el-descriptions-item label="是否在站点">
              {{ formatBool(detailRow.isInNode) }}
            </el-descriptions-item>
            <el-descriptions-item label="当前站点">{{ detailRow.inNodeName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="进站时间">
              {{ detailRow.inNodeTime ? formatUpdatedAt(detailRow.inNodeTime) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="下一站点">{{ detailRow.nextNodeName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="预计到达">
              {{ detailRow.nextNodeTime ? formatUpdatedAt(detailRow.nextNodeTime) : '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">位置信息</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="地图坐标">
              {{ formatPositionFull(detailRow.positionXyz) }}
            </el-descriptions-item>
            <el-descriptions-item label="经纬度">
              {{ formatPositionLonLat(detailRow.positionLonLat, detailRow.positionRaw) }}
            </el-descriptions-item>
            <el-descriptions-item label="航向">
              {{ formatHeading(detailRow.heading ?? detailRow.positionXyz?.yaw) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="vehicle-page__detail-section">
          <div class="vehicle-page__detail-title">故障与告警</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="故障状态">
              {{ detailRow.faultSummary?.hasFault ? '有故障' : '正常' }}
            </el-descriptions-item>
            <el-descriptions-item label="故障数量">
              {{ detailRow.faultSummary?.faultCount ?? 0 }}
            </el-descriptions-item>
            <el-descriptions-item label="最高故障等级">
              {{ detailRow.faultSummary?.highestFaultLevel ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="告警信息">
              <span :class="{ 'text-danger': hasFault(detailRow) }">
                {{ formatFault(detailRow) }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </template>
    </el-drawer>

    <ListForm ref="formRef" @success="getList" />
  </div>
</template>

<script setup lang="ts">
import * as ListApi from '@/api/car/list'
import { VehicleApi } from '@/api/car/vehicle'
import { RegionApi } from '@/api/car/region'
import { mapDeviceDetail } from '@/api/car/vehicle/mapper'
import { buildMonitorRouteQuery } from '../monitor/monitorNavigation'
import BatteryBar from '../car/components/BatteryBar.vue'
import ListForm from './listForm.vue'
import { MOCK_VEHICLES } from '../car/mock'
import {
  formatBool,
  formatDrivingMode,
  formatFault,
  formatHeading,
  formatInNodeLabel,
  formatListTask,
  formatPercent,
  formatPositionFull,
  formatPositionLonLat,
  formatRobotStatus,
  formatSpeedMps,
  formatTaskId,
  formatUpdatedAt,
  formatUpdatedAtShort,
  formatWorkStatus,
  formatMapCapability,
  getWorkStatusClass,
  hasFault,
  ONLINE_FILTER_OPTIONS,
  WORK_STATUS_FILTER_OPTIONS,
  type VehicleStatusVO
} from '../car/types'

defineOptions({ name: 'CarList' })

const message = useMessage()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const formRef = ref<InstanceType<typeof ListForm>>()

const useMock = import.meta.env.VITE_VEHICLE_USE_MOCK === 'true'

const loading = ref(false)
const allList = ref<VehicleStatusVO[]>([])
const filteredList = ref<VehicleStatusVO[]>([])
const allTotal = ref(0)
const filteredTotal = ref(0)
const workStatusOptions = WORK_STATUS_FILTER_OPTIONS
const onlineOptions = ONLINE_FILTER_OPTIONS
const alertOptions = [
  { label: '全部告警', value: 'all' },
  { label: '有告警', value: 'fault' },
  { label: '正常', value: 'normal' }
] as const
const regionOptions = ref<{ label: string; value: string }[]>([{ label: '全部区域', value: '' }])

const detailVisible = ref(false)
const detailRow = ref<VehicleStatusVO | null>(null)
/** 本地记录启动/暂停状态（待对接写接口） */
const runningIds = ref<Set<string>>(new Set())

const queryParams = reactive({
  keyword: '',
  regionName: '',
  workStatus: -1,
  online: 'all' as (typeof ONLINE_FILTER_OPTIONS)[number]['value'],
  alert: 'all' as (typeof alertOptions)[number]['value'],
  pageNo: 1,
  pageSize: 10
})

const tableHeaderStyle = {
  background: '#f8f9fb',
  color: '#333',
  fontWeight: '600'
}

const isRunning = (vehicleId: string) => runningIds.value.has(vehicleId)

/** 筛选后的当前页（pageNo 变化时自动重算，避免分页事件时序问题） */
const list = computed(() => {
  const start = (queryParams.pageNo - 1) * queryParams.pageSize
  return filteredList.value.slice(start, start + queryParams.pageSize)
})

const applyFilters = (source: VehicleStatusVO[]) => {
  let data = [...source]
  const keyword = queryParams.keyword.trim().toLowerCase()
  if (keyword) {
    data = data.filter(
      (item) =>
        item.vehicleId.toLowerCase().includes(keyword) ||
        (item.vehicleName && item.vehicleName.toLowerCase().includes(keyword)) ||
        (item.vehicleDescription && item.vehicleDescription.toLowerCase().includes(keyword)) ||
        (item.regionName && item.regionName.toLowerCase().includes(keyword)) ||
        (item.inNodeName && item.inNodeName.toLowerCase().includes(keyword)) ||
        (item.taskName && item.taskName.toLowerCase().includes(keyword)) ||
        (item.taskId && item.taskId.toLowerCase().includes(keyword))
    )
  }
  if (queryParams.regionName) {
    data = data.filter((item) => item.regionName === queryParams.regionName)
  }
  if (queryParams.workStatus !== -1) {
    data = data.filter((item) => item.workStatus === queryParams.workStatus)
  }
  if (queryParams.online === 'online') {
    data = data.filter((item) => item.online)
  } else if (queryParams.online === 'offline') {
    data = data.filter((item) => !item.online)
  }
  if (queryParams.alert === 'fault') {
    data = data.filter((item) => hasFault(item))
  } else if (queryParams.alert === 'normal') {
    data = data.filter((item) => !hasFault(item))
  }

  filteredTotal.value = data.length
  filteredList.value = data
  // 筛选后若当前页超出范围，回到第一页
  const maxPage = Math.max(1, Math.ceil(data.length / queryParams.pageSize) || 1)
  if (queryParams.pageNo > maxPage) {
    queryParams.pageNo = 1
  }
}

const syncRegionOptions = (vehicles: VehicleStatusVO[]) => {
  const names = new Set<string>()
  for (const item of regionOptions.value) {
    if (item.value) names.add(item.value)
  }
  for (const v of vehicles) {
    if (v.regionName) names.add(v.regionName)
  }
  regionOptions.value = [
    { label: '全部区域', value: '' },
    ...[...names].sort().map((name) => ({ label: name, value: name }))
  ]
}

const loadRegionOptions = async () => {
  if (useMock) return
  try {
    const page = await RegionApi.selectRegionByPage(1, 100)
    const names = page.list.map((r) => r.name).filter(Boolean)
    if (names.length > 0) {
      regionOptions.value = [
        { label: '全部区域', value: '' },
        ...names.map((name) => ({ label: name, value: name }))
      ]
    }
  } catch {
    // 区域接口失败时仍可从车辆列表推导
  }
}

const getList = async () => {
  loading.value = true
  try {
    if (useMock) {
      allList.value = [...MOCK_VEHICLES]
    } else {
      allList.value = await VehicleApi.getVehicleStatusList()
    }
    allTotal.value = allList.value.length
    syncRegionOptions(allList.value)
    applyFilters(allList.value)
  } catch (e) {
    console.error('[vehicle-list]', e)
    message.error('加载车辆列表失败，请确认已登录且网络正常')
    allList.value = []
    filteredList.value = []
    allTotal.value = 0
    filteredTotal.value = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  applyFilters(allList.value)
}

const handleSizeChange = () => {
  queryParams.pageNo = 1
  applyFilters(allList.value)
}

const resetQuery = () => {
  queryParams.keyword = ''
  queryParams.regionName = ''
  queryParams.workStatus = -1
  queryParams.online = 'all'
  queryParams.alert = 'all'
  queryParams.pageNo = 1
  applyFilters(allList.value)
}

const handleDetail = async (row: VehicleStatusVO) => {
  detailRow.value = { ...row }
  detailVisible.value = true
  if (useMock) return
  try {
    const { detail, pageMeta } = await VehicleApi.selectDeviceDetail(row.vehicleId)
    detailRow.value = mapDeviceDetail(
      row.vehicleId,
      detail,
      pageMeta.online ?? row.online,
      { id: row.vehicleId, ...pageMeta }
    )
  } catch {
    // 保留列表数据
  }
}

const handleRegister = () => openForm('create')

const openForm = (type: string, data: Record<string, unknown> = {}) => {
  formRef.value?.open(type, data)
}

function toListFormData(row: VehicleStatusVO) {
  return {
    id: row.vehicleId,
    name: row.vehicleName ?? '',
    info: row.vehicleDescription ?? '',
    enableConnectToEmqx: row.enableConnectToEmqx ?? false,
    tenantId: row.tenantId ?? 1,
    regionName: row.regionName ?? ''
  }
}
const handleBatchEmergencyStop = async () => {
  const onlineIds = allList.value.filter((v) => v.online).map((v) => v.vehicleId)
  if (onlineIds.length === 0) {
    message.warning('当前无在线车辆')
    return
  }
  try {
    await message.confirm(`确认对 ${onlineIds.length} 辆在线车辆执行批量急停？`, '批量急停')
  } catch {
    return
  }
  if (useMock) {
    message.warning('Mock 模式：未下发云平台')
    return
  }
  loading.value = true
  try {
    const { ok, failed, total } = await VehicleApi.batchEmergencyStop(onlineIds)
    if (failed === 0) {
      message.success(`已对 ${ok}/${total} 辆车下发急停`)
    } else {
      message.warning(`急停完成：成功 ${ok}，失败 ${failed}（共 ${total}）`)
    }
  } catch (e) {
    message.error(e instanceof Error ? e.message : '批量急停失败')
  } finally {
    loading.value = false
  }
}
const handleEdit = (row: VehicleStatusVO) => openForm('update', toListFormData(row))

const handleToggleRun = (row: VehicleStatusVO) => {
  if (!row.online) {
    message.warning('设备离线，无法启动')
    return
  }
  const next = new Set(runningIds.value)
  if (next.has(row.vehicleId)) {
    next.delete(row.vehicleId)
    message.success(`已暂停：${row.vehicleId}`)
  } else {
    next.add(row.vehicleId)
    message.success(`已启动：${row.vehicleId}`)
  }
  runningIds.value = next
}

const handleMonitor = (row: VehicleStatusVO) => {
  const pos =
    row.positionLonLat != null
      ? `${row.positionLonLat.lon},${row.positionLonLat.lat}`
      : row.positionRaw
  const posXyz =
    row.positionXyz != null ? `${row.positionXyz.x},${row.positionXyz.y}` : undefined

  router.push({
    path: '/car/monitor',
    query: buildMonitorRouteQuery(
      {
        id: row.vehicleId,
        regionName: row.regionName || undefined,
        online: row.online ? '1' : '0',
        pos: pos || undefined,
        posXyz: posXyz || undefined
      },
      route.fullPath
    )
  })
}

const handleDelete = async (row: VehicleStatusVO) => {
  if (isRunning(row.vehicleId)) {
    message.warning('请先暂停设备后再删除')
    return
  }
  try {
    await message.delConfirm(`确认删除设备「${row.vehicleId}」吗？`)
    await ListApi.deleteCar(row.vehicleId)
    message.success(t('common.delSuccess'))
    runningIds.value.delete(row.vehicleId)
    if (detailRow.value?.vehicleId === row.vehicleId) {
      detailVisible.value = false
      detailRow.value = null
    }
    await getList()
  } catch {
    // 用户取消或请求失败
  }
}

const handleRecover = async (row: VehicleStatusVO) => {
  try {
    await ListApi.recoverCar(row.vehicleId)
    message.success(t('common.success'))
    await getList()
  } catch {
    // 请求失败
  }
}

onMounted(async () => {
  const q = router.currentRoute.value.query.keyword
  if (typeof q === 'string' && q.trim()) {
    queryParams.keyword = q.trim()
  }
  await loadRegionOptions()
  await getList()
})
</script>

<style lang="scss" scoped>
.vehicle-page {
  min-height: 100%;
  padding: 0 4px 16px;
  background: #f0f2f5;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8px 12px;
  }

  &__title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
  }

  &__card {
    padding: 20px 24px 24px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 4px rgb(0 0 0 / 6%);
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__section-title {
    display: flex;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
    color: #333;
  }

  &__toolbar-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  &__toolbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__register-btn {
    background: #1a2744 !important;
    border-color: #1a2744 !important;
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__search {
    width: 260px;
  }

  &__select {
    width: 130px;

    &--wide {
      width: 160px;
    }
  }

  &__filter-hint {
    font-size: 13px;
    color: #909399;
  }

  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  &__emergency-btn {
    color: #e74c3c !important;
    border-color: #e74c3c !important;

    &:hover {
      color: #fff !important;
      background: #e74c3c !important;
    }
  }

  &__table {
    width: 100%;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  &__emqx {
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    color: #606266;
  }

  &__task-cell {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    justify-content: center;
  }

  &__task-progress {
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
    color: #3498db;
    background: #ebf5fb;
    border-radius: 4px;
  }

  &__map-cap {
    font-size: 12px;
    color: #909399;

    &--route {
      color: #3498db;
    }

    &--full {
      font-weight: 600;
      color: #27ae60;
    }
  }

  &__time {
    font-size: 12px;
    color: #606266;
  }

  &__detail-section {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__detail-title {
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
  }

  &__detail-muted {
    margin-left: 6px;
    font-size: 12px;
    color: #909399;
  }
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  border-radius: 10px;

  &--green {
    color: #27ae60;
    background: #e8f8ef;
  }

  &--yellow {
    color: #f39c12;
    background: #fef5e7;
  }

  &--red {
    color: #e74c3c;
    background: #fdecea;
  }

  &--blue {
    color: #3498db;
    background: #ebf5fb;
  }

  &--orange {
    color: #e67e22;
    background: #fdf2e9;
  }

  &--grey {
    color: #95a5a6;
    background: #f4f6f6;
  }
}

.text-danger {
  color: #e74c3c;
}
</style>
