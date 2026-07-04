<template>
  <div
    ref="pageRootRef"
    class="monitor-page"
    :class="{ 'monitor-page--fullscreen': isFullscreen }"
  >
    <div class="monitor-page__header">
      <div class="monitor-page__header-left">
        <h1 class="monitor-page__title">远程监控与控制 · {{ vehicleId }}</h1>
        <el-tag v-if="liveTelemetry" size="small" type="success" effect="plain">云平台遥测</el-tag>
        <el-tag v-else-if="telemetryLoading" size="small" type="info" effect="plain">加载遥测…</el-tag>
        <el-tag v-else size="small" type="warning" effect="plain">遥测离线</el-tag>
        <el-tag v-if="cameraLive" size="small" type="success" effect="plain">视频 Live</el-tag>
        <el-tag v-else-if="cameraError" size="small" type="danger" effect="plain">
          视频：{{ cameraError }}
        </el-tag>
        <el-tag v-else-if="cameraLoading" size="small" type="info" effect="plain">视频加载中…</el-tag>
        <el-tag v-if="MONITOR_PERCEPTION_DEMO && useIndoorMapPanel" size="small" type="warning" effect="dark">
          感知 Demo
        </el-tag>
      </div>
      <div class="monitor-page__header-actions">
        <el-button
          v-if="fullscreenSupported"
          class="monitor-page__icon-btn"
          :title="isFullscreen ? '退出全屏 (Esc)' : '全屏显示'"
          @click="toggleFullscreen"
        >
          <Icon :icon="isFullscreen ? 'ep:close-bold' : 'ep:full-screen'" class="mr-4px" />
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
        <el-button class="monitor-page__back" @click="goBack">
          <Icon icon="ep:arrow-left" class="mr-4px" />
          返回列表
        </el-button>
      </div>
    </div>

    <!-- 设备状态：仅展示 API 已有字段 -->
    <div v-if="deviceStatusItems.length" class="monitor-page__status-bar">
      <div
        v-for="item in deviceStatusItems"
        :key="item.label"
        class="status-chip"
        :class="item.tone ? `status-chip--${item.tone}` : ''"
      >
        <span class="status-chip__label">{{ item.label }}</span>
        <span class="status-chip__value">{{ item.value }}</span>
      </div>
    </div>
    <div v-else-if="telemetryError" class="monitor-page__status-empty">{{ telemetryError }}</div>

    <div class="monitor-page__video-zone">
      <VideoPanel
        v-model:main-cam="mainCam"
        :control-mode="controlMode"
        :stream-map="cameraStreams"
        :on-attach-stream="attachPlayer"
      />
    </div>

    <!-- 地图 | 操控 | 雷达 -->
    <div class="monitor-page__control-row">
      <div class="monitor-page__side-panel">
        <MonitorAmapPanel
          v-if="useAmapMap"
          :region-name="regionName"
          :route-raw-data="routeRawData"
          :route-loading="routeLoading"
          :route-hint="amapRouteHint"
          :route-point-count="monitorState.planned.length"
          :task-name="monitorState.vehicle.taskName"
          :vehicle-lng-lat="vehicleLngLat"
          :vehicle-history-lng-lat="vehicleHistoryLngLat"
          :heading-deg="vehicleHeadingDeg"
          :device-label="vehicleId"
        />
        <IndoorMapPanel
          v-else-if="useIndoorMapPanel"
          :device-id="vehicleId"
          :map-meta="mapMeta"
          :map-loading="mapMetaLoading"
          :map-error="mapMetaError || perceptionError"
          :pose="indoorPose"
          :history-points="mapHistory"
          :planned-points="mapPlanned"
          :obstacles="perceptionObstacles"
          :trajectory-points="perceptionTrajectory"
          :perception-live="perceptionLive"
          :perception-demo="MONITOR_PERCEPTION_DEMO"
          :ultrasonic-sense="perceptionUltrasonic"
          :work-status="monitorState.vehicle.workStatus"
          :task-name="monitorState.vehicle.taskName"
          :route-hint="mapHint"
          :has-live-position="mapHasLivePosition || !!perceptionPose"
          v-model:follow="mapFollow"
        />
        <MapXYPanel
          v-else
          :device-id="vehicleId"
          :pose="mapPose"
          :history-points="mapHistory"
          :planned-points="mapPlanned"
          :coordinate-space="mapSpace"
          :work-status="monitorState.vehicle.workStatus"
          :task-name="monitorState.vehicle.taskName"
          :route-loading="routeLoading"
          :route-hint="mapHint"
          :has-live-position="mapHasLivePosition"
          panel-title="室内地图"
          v-model:follow="mapFollow"
        />
      </div>

      <div class="monitor-page__drive-panel">
        <RemoteDrivePanel
          v-model:control-mode="controlMode"
          :pressed-keys="pressedKeys"
          :mock-speed="displaySpeedMps"
          :current-action="currentAction"
          v-model:gear="gear"
          v-model:takeover="remoteTakeover"
          :control-logs="controlLogs"
          :work-status="monitorState.vehicle.workStatus"
          :clean-progress="monitorState.vehicle.taskProgress ?? null"
          @press="pressKey"
          @release="releaseKey"
          @emergency-stop="handleEmergencyStop"
          @clear-logs="clearLogs"
          @horn="handleHorn"
          @aux="handleAux"
          @ptz="handlePtz"
        />
      </div>

      <div class="monitor-page__side-panel">
        <RadarPanel
          :history-points="mapHistory"
          :heading-deg="indoorPose.headingDeg"
          :speed-mps="apiSpeedMps"
          :grid-cells="radarGridCells"
        />
      </div>
    </div>

    <button
      v-if="isFullscreen"
      type="button"
      class="monitor-page__fs-exit"
      title="退出全屏 (Esc)"
      @click="toggleFullscreen"
    >
      <Icon icon="ep:close-bold" />
      退出全屏
    </button>
  </div>
</template>

<script setup lang="ts">
import { createMonitorMockState } from '../car/visualization/mockMonitor'
import { dispatchMonitorControl } from '../car/visualization/monitorControl'
import {
  buildAuxByLabel,
  buildEmergencyStop,
  buildGearCommand,
  buildGimbalCommand,
  buildHorn,
  buildRemoteDriveCommand,
  buildRemoteDriveStop,
  type DriveKey
} from '../car/visualization/mqttPayload'
import MapXYPanel from '../car/visualization/panels/MapXYPanel.vue'
import IndoorMapPanel from '../car/visualization/panels/IndoorMapPanel.vue'
import MonitorAmapPanel from '../car/visualization/panels/MonitorAmapPanel.vue'
import RadarPanel from '../car/visualization/panels/RadarPanel.vue'
import RemoteDrivePanel from '../car/visualization/panels/RemoteDrivePanel.vue'
import VideoPanel from '../car/visualization/panels/VideoPanel.vue'
import type { CameraKey, MonitorControlMode, MonitorMockState, VehiclePose } from '../car/visualization/types'
import { useMonitorTaskRoute } from '../car/visualization/useMonitorTaskRoute'
import {
  filterPlannedForSpace,
  mapSpacesMismatch,
  pickMapHistory,
  pickMapPose,
  resolveMapCoordinateSpace,
  vehicleMatchesMapSpace
} from '../car/visualization/useMapCoordinateSpace'
import { seedMonitorMapFromQuery } from '../car/visualization/seedMonitorMapQuery'
import {
  formatFault,
  formatTaskId,
  formatWorkStatus,
  hasFault,
  vehicleHasMapPosition,
  vehicleHasMapRoute
} from '../car/types'
import { useMonitorVehicle } from './useMonitorVehicle'
import { useMonitorCameraStreams } from './useMonitorCameraStreams'
import { useMonitorHighFreq } from './useMonitorHighFreq'
import { useMonitorIndoorMap } from './useMonitorIndoorMap'
import { MONITOR_PERCEPTION_DEMO } from './monitorPerceptionDemo'
import { useMonitorPerceptionDemo } from './useMonitorPerceptionDemo'
import { goBackToCarList } from './monitorNavigation'
import { useMonitorFullscreen } from './useMonitorFullscreen'

defineOptions({ name: 'CarCarMonitor' })

const route = useRoute()
const router = useRouter()
const message = useMessage()
const pageRootRef = ref<HTMLElement | null>(null)
const {
  isFullscreen,
  supported: fullscreenSupported,
  toggle: toggleFullscreen
} = useMonitorFullscreen(pageRootRef)

const vehicleId = computed(
  () =>
    (route.query.id as string) ||
    (route.params.vehicleId as string) ||
    'LU2606000100'
)

const mapFollow = ref(MONITOR_PERCEPTION_DEMO)
const gear = ref('N')
const remoteTakeover = ref(false)
const controlMode = ref<MonitorControlMode>('remote')
const mainCam = ref<CameraKey>('front')

const monitorState = reactive<MonitorMockState>(createMonitorMockState(vehicleId.value))

const regionName = computed(() => {
  const fromQuery = route.query.regionName
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim()
  return monitorState.vehicle.regionName?.trim() || ''
})

const { routeLoading, routeError, routeLonLat, routeRawData } = useMonitorTaskRoute(
  regionName,
  monitorState
)

const vehicleLngLat = computed((): [number, number] | null => {
  const v = monitorState.vehicle.positionLonLat
  if (v) return [v.lon, v.lat]
  if (monitorState.lonLatHistory.length > 0) {
    const last = monitorState.lonLatHistory[monitorState.lonLatHistory.length - 1]
    return [last.x, last.y]
  }
  return null
})

const vehicleHistoryLngLat = computed((): [number, number][] =>
  monitorState.lonLatHistory.map((p) => [p.x, p.y] as [number, number])
)

const vehicleHeadingDeg = computed(() => {
  const h = monitorState.vehicle.heading
  if (h == null) return monitorState.lonLatPose.headingDeg
  if (Math.abs(h) <= Math.PI * 2 + 0.01) return (h * 180) / Math.PI
  return h
})

/** GPS 任务路线 / 车辆定位 → 高德底图（与定位页一致） */
const useAmapMap = computed(() => routeLonLat.value || vehicleLngLat.value != null)

const mapSpace = computed(() =>
  resolveMapCoordinateSpace(monitorState, monitorState.planned, routeLonLat.value)
)

const mapPlanned = computed(() =>
  filterPlannedForSpace(monitorState.planned, mapSpace.value, routeLonLat.value)
)

const mapPose = computed((): VehiclePose => pickMapPose(monitorState, mapSpace.value))

const mapHistory = computed(() => pickMapHistory(monitorState, mapSpace.value))

const mapHasLivePosition = computed(() => vehicleMatchesMapSpace(monitorState, mapSpace.value))

const routeHint = computed(() => {
  if (routeLoading.value) return '任务路线加载中…'
  if (routeError.value) return routeError.value
  if (!regionName.value) return '缺少区域：请从车辆列表点「监控」进入（会带上 regionName）'
  return ''
})

const amapRouteHint = computed(() => {
  if (routeLoading.value) return '任务路线加载中…'
  if (routeError.value) return routeError.value
  if (!regionName.value) return '缺少 regionName，无法加载任务范围地图'
  if (monitorState.planned.length <= 1 && !routeLoading.value) {
    return '该区域暂无 GPS 任务路线'
  }
  return ''
})

const mapHint = computed(() => {
  const parts: string[] = []
  const v = monitorState.vehicle
  if (!vehicleHasMapPosition(v)) {
    parts.push('遥测无 position / position_xyz，无法显示车辆位置')
  }
  if (!vehicleHasMapRoute(v) && !regionName.value) {
    parts.push('无 regionName，无法加载任务路线')
  } else if (
    monitorState.planned.length <= 1 &&
    !routeLoading.value &&
    regionName.value &&
    !routeError.value
  ) {
    parts.push('该区域 device_path_info 暂无路线点')
  } else if (
    mapSpacesMismatch(monitorState, monitorState.planned, routeLonLat.value)
  ) {
    parts.push('车辆为室内坐标、路线为 GPS，当前显示任务路线（车辆三角已隐藏）')
  } else if (mapPlanned.value.length > 1) {
    parts.push(`已加载任务路线 ${mapPlanned.value.length} 点`)
  } else if (monitorState.planned.length > 1) {
    parts.push(`已加载任务路线 ${monitorState.planned.length} 点`)
  }
  if (routeHint.value) parts.unshift(routeHint.value)
  return parts.filter(Boolean).join('；')
})

const { liveTelemetry, telemetryLoading, telemetryError } = useMonitorVehicle(
  vehicleId,
  monitorState,
  regionName
)
const {
  streams: cameraStreams,
  live: cameraLive,
  error: cameraError,
  loading: cameraLoading,
  attachPlayer
} = useMonitorCameraStreams(vehicleId)

/** 室内车：无 GPS 时用 IndoorMapPanel；Demo 模式强制室内视图 */
const useIndoorMapPanel = computed(() => MONITOR_PERCEPTION_DEMO || !useAmapMap.value)

const perceptionEnabled = computed(() => useIndoorMapPanel.value && !MONITOR_PERCEPTION_DEMO)
const demoPerceptionEnabled = computed(() => useIndoorMapPanel.value && MONITOR_PERCEPTION_DEMO)

const livePerception = useMonitorHighFreq(vehicleId, perceptionEnabled)
const demoPerception = useMonitorPerceptionDemo(vehicleId, demoPerceptionEnabled)

const radarGridCells = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.radarGridCells.value : livePerception.radarGridCells.value
)
const perceptionObstacles = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.obstacles.value : livePerception.obstacles.value
)
const perceptionTrajectory = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.trajectoryPoints.value : livePerception.trajectoryPoints.value
)
const perceptionPose = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.perceptionPose.value : livePerception.perceptionPose.value
)
const perceptionMapId = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.mapId.value : livePerception.mapId.value
)
const perceptionLive = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.live.value : livePerception.live.value
)
const perceptionError = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.error.value : livePerception.error.value
)
const perceptionUltrasonic = computed(() =>
  MONITOR_PERCEPTION_DEMO ? demoPerception.ultrasonicSense.value : []
)

const { mapMeta, loading: mapMetaLoading, error: mapMetaError } = useMonitorIndoorMap(
  vehicleId,
  perceptionMapId,
  useIndoorMapPanel
)

const indoorPose = computed((): import('../car/visualization/types').VehiclePose => {
  if (perceptionPose.value) return perceptionPose.value
  return mapPose.value
})

const KEY_ACTION_MAP: Record<string, string> = {
  W: '前进',
  S: '后退',
  A: '左转',
  D: '右转'
}

const pressedKeys = ref(new Set<string>())
const localDriveSpeed = ref(0)
const controlLogs = ref<{ time: string; text: string }[]>([])

const apiSpeedMps = computed(() => {
  const v = monitorState.vehicle.speedMps
  if (v == null || pressedKeys.value.size > 0) return undefined
  return v
})

const displaySpeedMps = computed(() => {
  if (apiSpeedMps.value != null) return apiSpeedMps.value
  return localDriveSpeed.value
})

const deviceStatusItems = computed(() => {
  if (!liveTelemetry.value) return []
  const v = monitorState.vehicle
  const items: { label: string; value: string; tone?: string }[] = []

  items.push({
    label: '在线',
    value: v.online ? '在线' : '离线',
    tone: v.online ? 'ok' : 'warn'
  })
  items.push({ label: '工作状态', value: formatWorkStatus(v.workStatus) })
  items.push({ label: '电量', value: `${v.battery}%` })

  if (v.taskName) {
    items.push({ label: '当前任务', value: v.taskName })
  } else if (v.taskId && v.taskId !== '0') {
    items.push({ label: '任务ID', value: formatTaskId(v.taskId) })
  }

  if (v.speedMps != null) {
    items.push({ label: '车速', value: `${v.speedMps.toFixed(2)} m/s` })
  }
  if (v.taskProgress != null) {
    items.push({ label: '任务进度', value: `${v.taskProgress}%` })
  }
  if (v.nextNodeName) {
    items.push({ label: '下一站点', value: v.nextNodeName })
  }
  if (v.regionName) {
    items.push({ label: '区域', value: v.regionName })
  }
  if (hasFault(v)) {
    items.push({ label: '告警', value: formatFault(v), tone: 'danger' })
  }

  return items
})

const currentAction = computed(() => {
  if (pressedKeys.value.size === 0) return ''
  return [...pressedKeys.value].map((k) => KEY_ACTION_MAP[k]).join(' + ')
})

const formatTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

const addLog = (text: string) => {
  controlLogs.value.unshift({ time: formatTime(), text })
  if (controlLogs.value.length > 30) controlLogs.value.pop()
}

const logControl = async (envelope: Parameters<typeof dispatchMonitorControl>[0]) => {
  const result = await dispatchMonitorControl(envelope, vehicleId.value)
  addLog(result.text)
}

const resetMonitorState = (id: string) => {
  const next = createMonitorMockState(id)
  monitorState.vehicle = next.vehicle
  monitorState.pose = next.pose
  monitorState.history = next.history
  monitorState.lonLatPose = next.lonLatPose
  monitorState.lonLatHistory = next.lonLatHistory
  monitorState.planned = next.planned
  monitorState.batteryHistory = next.batteryHistory
  monitorState.statusHistory = next.statusHistory
  monitorState.poseHistory = next.poseHistory
}

const updateLocalSpeed = () => {
  if (pressedKeys.value.has('W')) localDriveSpeed.value = 0.8
  else if (pressedKeys.value.has('S')) localDriveSpeed.value = 0.5
  else if (pressedKeys.value.has('A') || pressedKeys.value.has('D')) localDriveSpeed.value = 0.3
  else localDriveSpeed.value = 0
}

const pressKey = async (key: string) => {
  if (pressedKeys.value.has(key)) return
  pressedKeys.value = new Set([...pressedKeys.value, key])
  updateLocalSpeed()
  if (KEY_ACTION_MAP[key]) {
    await logControl(buildRemoteDriveCommand(key as DriveKey))
  }
}

const releaseKey = async (key: string) => {
  if (!pressedKeys.value.has(key)) return
  const next = new Set(pressedKeys.value)
  next.delete(key)
  pressedKeys.value = next
  updateLocalSpeed()
  if (next.size === 0) {
    await logControl(buildRemoteDriveStop())
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (controlMode.value !== 'remote') return
  const key = e.key.toUpperCase()
  if (!KEY_ACTION_MAP[key]) return
  e.preventDefault()
  void pressKey(key)
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (controlMode.value !== 'remote') return
  const key = e.key.toUpperCase()
  if (!KEY_ACTION_MAP[key]) return
  e.preventDefault()
  void releaseKey(key)
}

const handleEmergencyStop = async () => {
  pressedKeys.value = new Set()
  localDriveSpeed.value = 0
  gear.value = 'P'
  await logControl(buildEmergencyStop())
  message.warning('已下发急停指令')
}

const handleHorn = async () => {
  await logControl(buildHorn())
}

const handleAux = async (label: string, on: boolean) => {
  const envelope = buildAuxByLabel(label, on)
  if (envelope) {
    await logControl(envelope)
  } else {
    addLog(`[${vehicleId.value}] ${label} ${on ? '开' : '关'}（未映射 MQTT）`)
  }
}

const handlePtz = async (action: string, value?: string | number) => {
  let envelope
  switch (action) {
    case 'move':
      envelope = buildGimbalCommand('MOVE_STEP', {
        pan: value === 'left' ? -5 : value === 'right' ? 5 : 0,
        tilt: value === 'up' ? 5 : value === 'down' ? -5 : 0
      })
      break
    case 'stop':
      envelope = buildGimbalCommand('STOP')
      break
    case 'zoom':
      envelope = buildGimbalCommand(value === '+' ? 'ZOOM_IN' : 'ZOOM_OUT')
      break
    case 'home':
      envelope = buildGimbalCommand('HOME')
      break
    case 'preset':
      envelope = buildGimbalCommand('GOTO_PRESET', { preset: Number(value) })
      break
    default:
      addLog(`[${vehicleId.value}] 云台 ${action}${value != null ? ` · ${value}` : ''}（未映射）`)
      return
  }
  await logControl(envelope)
}

watch(controlMode, (mode) => {
  if (mode === 'ptz') mainCam.value = 'ptz'
  else if (mainCam.value === 'ptz') mainCam.value = 'front'
  addLog(
    `[${vehicleId.value}] 切换至${mode === 'auto' ? '自动驾驶' : mode === 'ptz' ? '云台控制' : '远程驾驶'}模式`
  )
})

watch(gear, async (g, prev) => {
  if (g === prev) return
  await logControl(buildGearCommand(g))
})

const clearLogs = () => {
  controlLogs.value = []
}

const goBack = () => {
  if (isFullscreen.value) void toggleFullscreen()
  goBackToCarList(router, route)
}

watch(vehicleId, (id) => {
  resetMonitorState(id)
  seedMonitorMapFromQuery(monitorState, route.query)
  addLog(`[${id}] 切换设备`)
})

onMounted(() => {
  seedMonitorMapFromQuery(monitorState, route.query)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  addLog(`[${vehicleId.value}] 进入远程监控与控制`)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style lang="scss" scoped>
.monitor-page {
  min-height: 100%;
  padding: 0 4px 32px;
  background: linear-gradient(180deg, #0b1018 0%, #060a10 50%, #0a1018 100%);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 8px 10px;
  }

  &__header-actions {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
  }

  &__icon-btn {
    color: #aab !important;
    background: rgb(20 30 42 / 80%) !important;
    border: 1px solid #2a4055 !important;
    border-radius: 8px !important;
  }

  &__header-left {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;

    :deep(.el-tag) {
      font-size: 12px;
    }
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #e8f4fc;
  }

  &__back {
    color: #aab !important;
    background: rgb(20 30 42 / 80%) !important;
    border: 1px solid #2a4055 !important;
    border-radius: 8px !important;
  }

  &__status-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 8px 12px;
  }

  &__status-empty {
    padding: 0 8px 12px;
    font-size: 13px;
    color: #8899aa;
  }

  &__video-zone {
    min-height: 440px;
    padding: 0 8px;
    margin-bottom: 12px;
  }

  &__control-row {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(420px, 1.4fr) minmax(220px, 1fr);
    gap: 12px;
    min-height: 480px;
    padding: 0 8px;
    align-items: stretch;
  }

  &__side-panel {
    min-width: 0;
    overflow: hidden;

    :deep(.map-xy-panel),
    :deep(.indoor-map-panel),
    :deep(.monitor-amap-panel),
    :deep(.radar-panel) {
      height: 100%;
      min-height: 420px;
    }
  }

  &__drive-panel {
    min-width: 0;

    :deep(.remote-drive) {
      height: 100%;
      min-height: 420px;
    }
  }

  &--fullscreen {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 0 8px 12px;
    overflow: hidden;
    background: #060a10;

    .monitor-page__video-zone {
      flex: 0 0 38vh;
      min-height: 240px;
      max-height: 42vh;
    }

    .monitor-page__control-row {
      flex: 1;
      min-height: 0;
    }
  }

  &__fs-exit {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 10000;
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 8px 14px;
    font-size: 13px;
    color: #e8f4fc;
    cursor: pointer;
    background: rgb(0 0 0 / 65%);
    border: 1px solid #2a6090;
    border-radius: 8px;
  }
}

.status-chip {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 8px 14px;
  background: rgb(14 21 32 / 90%);
  border: 1px solid #1e3a52;
  border-radius: 8px;

  &__label {
    font-size: 13px;
    color: #9eb0c0;
  }

  &__value {
    font-size: 15px;
    font-weight: 600;
    color: #e8f0f8;
  }

  &--ok .status-chip__value {
    color: #5ddea0;
  }

  &--warn .status-chip__value {
    color: #ffd166;
  }

  &--danger .status-chip__value {
    color: #ff7b72;
  }
}

@media (width <= 1400px) {
  .monitor-page__control-row {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .monitor-page__drive-panel {
    grid-column: 1 / -1;
    order: -1;
  }
}

@media (width <= 768px) {
  .monitor-page__control-row {
    grid-template-columns: 1fr;
  }

  .monitor-page__drive-panel {
    order: 0;
  }

  .monitor-page__video-zone {
    min-height: 360px;
  }
}
</style>
