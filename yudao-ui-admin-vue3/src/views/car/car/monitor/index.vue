<template>

  <div class="monitor-page">

    <div class="monitor-page__header">

      <div class="monitor-page__header-left">

        <h1 class="monitor-page__title">远程监控与控制 · {{ vehicleId }}</h1>

        <el-tag v-if="liveTelemetry" size="small" type="success" effect="plain">云平台遥测</el-tag>

        <el-tag v-else size="small" type="warning" effect="plain">

          {{ telemetryError ? '遥测离线 · 演示数据' : '加载遥测…' }}

        </el-tag>

        <el-tag size="small" type="info" effect="plain">控制 Mock 日志</el-tag>

      </div>

      <el-button class="monitor-page__back" @click="goBack">

        <Icon icon="ep:arrow-left" class="mr-4px" />

        返回列表

      </el-button>

    </div>



    <div class="monitor-page__telemetry">

      <div v-for="item in telemetryItems" :key="item.label" class="telemetry-card">

        <span class="telemetry-card__label">{{ item.label }}</span>

        <span class="telemetry-card__value">{{ item.value }}</span>

        <span v-if="item.unit" class="telemetry-card__unit">{{ item.unit }}</span>

      </div>

      <div class="monitor-page__live">

        <span class="monitor-page__live-dot" :class="{ 'monitor-page__live-dot--off': !liveTelemetry }" />

        {{ liveTelemetry ? 'Live' : 'Demo' }}

      </div>

    </div>



    <div class="monitor-page__top">

      <div class="monitor-page__map-cell">

        <MapXYPanel

          :device-id="vehicleId"

          :pose="mockState.pose"

          :history-points="mockState.history"

          :planned-points="mockState.planned"

          :work-status="mockState.vehicle.workStatus"

          panel-title="室内地图 · 远景轨迹"

          v-model:follow="mapFollow"

        />

      </div>

      <div class="monitor-page__map-cell">

        <RadarPanel

          :history-points="mockState.history"

          :planned-points="mockState.planned"

          :heading-deg="mockState.pose.headingDeg"

          :throttle="displaySpeedMps"

          :brake="displaySpeedMps > 0 ? 0 : 15"

        />

      </div>

      <div class="monitor-page__status-col">

        <StatePanel :vehicle="mockState.vehicle" dark />

        <PlotPanel :battery-history="mockState.batteryHistory" :chart-height="150" embedded />

      </div>

    </div>



    <div class="monitor-page__video-zone">

      <VideoPanel v-model:main-cam="mainCam" :control-mode="controlMode" />

    </div>



    <RemoteDrivePanel

      v-model:control-mode="controlMode"

      :pressed-keys="pressedKeys"

      :mock-speed="displaySpeedMps"

      :current-action="currentAction"

      v-model:gear="gear"

      v-model:takeover="remoteTakeover"

      :control-logs="controlLogs"

      :work-status="mockState.vehicle.workStatus"

      :clean-progress="mockState.vehicle.taskProgress ?? 80"

      @press="pressKey"

      @release="releaseKey"

      @emergency-stop="handleEmergencyStop"

      @clear-logs="clearLogs"

      @horn="handleHorn"

      @aux="handleAux"

      @ptz="handlePtz"

    />

  </div>

</template>



<script setup lang="ts">

import { createMonitorMockState, tickMonitorMock } from '../visualization/mockMonitor'

import { dispatchMonitorControl } from '../visualization/monitorControl'

import {

  buildAuxByLabel,

  buildEmergencyStop,

  buildGearCommand,

  buildGimbalCommand,

  buildHorn,

  buildRemoteDriveCommand,

  buildRemoteDriveStop,

  type DriveKey

} from '../visualization/mqttPayload'

import MapXYPanel from '../visualization/panels/MapXYPanel.vue'

import PlotPanel from '../visualization/panels/PlotPanel.vue'

import RadarPanel from '../visualization/panels/RadarPanel.vue'

import RemoteDrivePanel from '../visualization/panels/RemoteDrivePanel.vue'

import StatePanel from '../visualization/panels/StatePanel.vue'

import VideoPanel from '../visualization/panels/VideoPanel.vue'

import type { CameraKey, MonitorControlMode, MonitorMockState } from '../visualization/types'

import { useMonitorVehicle } from './useMonitorVehicle'



defineOptions({ name: 'CarCarMonitor' })



const route = useRoute()

const router = useRouter()

const message = useMessage()



const vehicleId = computed(() => (route.params.vehicleId as string) || 'LU2606000100')

const mapFollow = ref(true)

const gear = ref('N')

const remoteTakeover = ref(false)

const controlMode = ref<MonitorControlMode>('remote')

const mainCam = ref<CameraKey>('front')



const mockState = reactive<MonitorMockState>(createMonitorMockState(vehicleId.value))

const { liveTelemetry, telemetryError, tickLiveCharts } = useMonitorVehicle(vehicleId, mockState)



const KEY_ACTION_MAP: Record<string, string> = {

  W: '前进',

  S: '后退',

  A: '左转',

  D: '右转'

}



const pressedKeys = ref(new Set<string>())

const localDriveSpeed = ref(0)

const controlLogs = ref<{ time: string; text: string }[]>([])

const taskStartTime = ref(Date.now())

const clockTick = ref(0)



let simTimer: ReturnType<typeof setInterval> | null = null



const displaySpeedMps = computed(() => {

  if (mockState.vehicle.speedMps != null && pressedKeys.value.size === 0) {

    return mockState.vehicle.speedMps

  }

  return localDriveSpeed.value

})



const formatDuration = (ms: number) => {

  const totalSec = Math.floor(ms / 1000)

  const h = Math.floor(totalSec / 3600)

  const m = Math.floor((totalSec % 3600) / 60)

  const s = totalSec % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

}



const telemetryItems = computed(() => {

  void clockTick.value

  return [

    {

      label: '任务时长',

      value: formatDuration(Date.now() - taskStartTime.value),

      unit: ''

    },

    {

      label: '剩余里程',

      value: mockState.vehicle.vehicleInfo?.odometry != null

        ? Math.max(0, 100 - mockState.vehicle.vehicleInfo.odometry).toFixed(2)

        : Math.max(0, 97.16 - mockState.history.length * 0.05).toFixed(2),

      unit: 'km'

    },

    {

      label: '距下一停靠点',

      value: mockState.vehicle.nextNodeName ? '—' : Math.max(0, 18.94 - mockState.history.length * 0.03).toFixed(2),

      unit: mockState.vehicle.nextNodeName ? '' : 'km'

    },

    {

      label: '当前车速',

      value: displaySpeedMps.value.toFixed(2),

      unit: 'm/s'

    }

  ]

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



const resetMockState = (id: string) => {

  const next = createMonitorMockState(id)

  mockState.vehicle = next.vehicle

  mockState.pose = next.pose

  mockState.history = next.history

  mockState.planned = next.planned

  mockState.batteryHistory = next.batteryHistory

  mockState.statusHistory = next.statusHistory

  mockState.poseHistory = next.poseHistory

  taskStartTime.value = Date.now()

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

  mockState.vehicle.workStatus = 4

  await logControl(buildEmergencyStop())

  message.warning('急停（Mock 日志，未真实下发）')

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

  router.push('/car/car')

}



const startSimulation = () => {

  stopSimulation()

  simTimer = setInterval(() => {

    if (liveTelemetry.value) {

      tickLiveCharts()

    } else {

      tickMonitorMock(mockState)

    }

    clockTick.value++

  }, 1000)

}



const stopSimulation = () => {

  if (simTimer) {

    clearInterval(simTimer)

    simTimer = null

  }

}



watch(vehicleId, (id) => {

  resetMockState(id)

  addLog(`[${id}] 切换设备`)

})



onMounted(() => {

  window.addEventListener('keydown', handleKeyDown)

  window.addEventListener('keyup', handleKeyUp)

  addLog(`[${vehicleId.value}] 进入远程监控与控制`)

  startSimulation()

})



onUnmounted(() => {

  window.removeEventListener('keydown', handleKeyDown)

  window.removeEventListener('keyup', handleKeyUp)

  stopSimulation()

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



  &__header-left {

    display: flex;

    flex-wrap: wrap;

    gap: 8px;

    align-items: center;



    :deep(.el-tag) {

      font-size: 12px;

    }



    :deep(.el-tag--warning) {

      color: #ffd166;

      background: rgb(243 156 18 / 12%);

      border-color: rgb(243 156 18 / 35%);

    }



    :deep(.el-tag--success) {

      color: #a8e6cf;

      background: rgb(39 174 96 / 15%);

      border-color: rgb(39 174 96 / 35%);

    }



    :deep(.el-tag--info) {

      color: #aab;

      background: rgb(100 120 140 / 15%);

      border-color: rgb(100 120 140 / 30%);

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



  &__telemetry {

    display: flex;

    flex-wrap: wrap;

    gap: 10px;

    align-items: center;

    padding: 0 8px 12px;

  }



  &__live {

    display: flex;

    gap: 6px;

    align-items: center;

    margin-left: auto;

    font-size: 13px;

    font-weight: 600;

    color: #b8c8d8;

  }



  &__live-dot {

    width: 8px;

    height: 8px;

    background: #e74c3c;

    border-radius: 50%;

    animation: pulse 1.2s infinite;



    &--off {

      background: #7f8c8d;

      animation: none;

    }

  }



  &__top {

    display: grid;

    grid-template-columns: repeat(3, 1fr);

    gap: 12px;

    min-height: 420px;

    padding: 0 8px;

    margin-bottom: 12px;

    align-items: stretch;

  }



  &__map-cell {

    min-width: 0;

    overflow: hidden;



    :deep(.map-xy-panel),

    :deep(.radar-panel) {

      height: 100%;

    }

  }



  &__status-col {

    display: flex;

    flex-direction: column;

    min-width: 0;

    height: 100%;

    overflow: hidden;

    background: linear-gradient(180deg, #0e1520 0%, #0a1018 100%);

    border: 1px solid #1a3a52;

    border-radius: 10px;

    box-shadow: 0 0 16px rgb(0 200 255 / 6%);



    :deep(.state-panel) {

      flex: 0 0 auto;

      padding: 14px 16px;

      border-radius: 0;

      box-shadow: none;

    }



    :deep(.plot-panel) {

      flex: 1 1 auto;

      min-height: 168px;

      padding: 12px 16px 10px;

      border-top: 1px solid #1e3a52;

      border-radius: 0;

      box-shadow: none;

    }

  }



  &__video-zone {

    min-height: 440px;

    padding: 0 8px;

    margin-bottom: 12px;

  }

}



@keyframes pulse {

  0%,

  100% {

    opacity: 1;

  }



  50% {

    opacity: 0.4;

  }

}



.telemetry-card {

  display: flex;

  gap: 8px;

  align-items: baseline;

  padding: 8px 16px;

  background: rgb(14 21 32 / 90%);

  border: 1px solid #1e3a52;

  border-radius: 8px;

  box-shadow: 0 0 12px rgb(0 200 255 / 5%);



  &__label {

    font-size: 13px;

    color: #9eb0c0;

  }



  &__value {

    font-size: 20px;

    font-weight: 700;

    color: #f1c40f;

  }



  &__unit {

    font-size: 12px;

    color: #a8b8c8;

  }

}



@media (width <= 1200px) {

  .monitor-page__top {

    grid-template-columns: 1fr 1fr;

    min-height: auto;

  }



  .monitor-page__map-cell {

    min-height: 240px;

    height: 240px;

  }



  .monitor-page__status-col {

    grid-column: 1 / -1;

    flex-flow: row wrap;

    height: auto;



    :deep(.state-panel),

    :deep(.plot-panel) {

      flex: 1 1 300px;

      min-height: auto;

    }

  }



  .monitor-page__video-zone {

    min-height: 480px;

  }

}



@media (width <= 768px) {

  .monitor-page__top {

    grid-template-columns: 1fr;

  }



  .monitor-page__map-cell,

  .monitor-page__status-col {

    grid-column: 1;

  }



  .monitor-page__status-col {

    flex-direction: column;

  }



  .monitor-page__telemetry {

    .telemetry-card {

      flex: 1 1 calc(50% - 10px);

    }

  }

}

</style>


