<template>
  <div class="remote-drive" :class="`remote-drive--mode-${controlMode}`">
    <div class="remote-drive__topbar">
      <div class="remote-drive__status-group">
        <span class="remote-drive__pill remote-drive__pill--ok">已连接</span>
        <span
          class="remote-drive__pill"
          :class="isTakeover ? 'remote-drive__pill--active' : 'remote-drive__pill--idle'"
        >
          {{ modeStatusText }}
        </span>
      </div>
      <div class="remote-drive__mode">
        <button
          v-for="m in modes"
          :key="m.key"
          class="remote-drive__mode-btn"
          :class="{ 'remote-drive__mode-btn--active': controlMode === m.key }"
          @click="setMode(m.key)"
        >
          {{ m.label }}
        </button>
      </div>
      <div class="remote-drive__network">{{ formatTime() }}</div>
    </div>

    <!-- 自动驾驶：只读监控 -->
    <div v-if="controlMode === 'auto'" class="remote-drive__auto">
      <div class="remote-drive__auto-card">
        <span class="remote-drive__auto-label">运行模式</span>
        <span class="remote-drive__auto-value">自动驾驶</span>
      </div>
      <div v-if="hasSpeed" class="remote-drive__auto-card">
        <span class="remote-drive__auto-label">当前车速</span>
        <span class="remote-drive__auto-value">{{ speedKmh }} km/h</span>
      </div>
      <div v-if="cleanProgress != null" class="remote-drive__auto-card">
        <span class="remote-drive__auto-label">任务进度</span>
        <span class="remote-drive__auto-value">{{ cleanProgress }}%</span>
      </div>
      <div class="remote-drive__auto-card">
        <span class="remote-drive__auto-label">任务状态</span>
        <span class="remote-drive__auto-value">{{ workStatusText }}</span>
      </div>
      <p class="remote-drive__auto-hint">自动驾驶模式下控制区只读，视频以前视为主画面</p>
    </div>

    <!-- 云台控制 -->
    <PtzControlPanel
      v-else-if="controlMode === 'ptz'"
      @move="(d) => emitPtz('move', d)"
      @stop="() => emitPtz('stop')"
      @zoom="(z) => emitPtz('zoom', z)"
      @focus="(f) => emitPtz('focus', f)"
      @home="() => emitPtz('home')"
      @preset="(n) => emitPtz('preset', n)"
    />

    <!-- 远程驾驶 -->
    <template v-else>
      <div class="remote-drive__body">
        <div class="remote-drive__col">
          <div class="remote-drive__col-title">灯光 / 警示</div>
          <button
            v-for="btn in lightButtons"
            :key="btn.key"
            class="remote-drive__aux-btn"
            :class="{ 'remote-drive__aux-btn--on': auxOn.has(btn.key) }"
            @click="toggleAux(btn.key, btn.label)"
          >
            {{ btn.label }}
          </button>
        </div>

        <div class="remote-drive__wasd">
          <div class="remote-drive__wasd-row">
            <button
              class="remote-drive__key remote-drive__key--wide"
              :class="{ 'remote-drive__key--active': pressedKeys.has('W') }"
              @mousedown="emitPress('W')"
              @mouseup="emitRelease('W')"
              @mouseleave="emitRelease('W')"
            >
              <span class="remote-drive__key-letter">W</span>
              <span class="remote-drive__key-action">前进</span>
            </button>
          </div>
          <div class="remote-drive__wasd-row">
            <button
              class="remote-drive__key"
              :class="{ 'remote-drive__key--active': pressedKeys.has('A') }"
              @mousedown="emitPress('A')"
              @mouseup="emitRelease('A')"
              @mouseleave="emitRelease('A')"
            >
              <span class="remote-drive__key-letter">A</span>
              <span class="remote-drive__key-action">左转</span>
            </button>
            <button
              class="remote-drive__key"
              :class="{ 'remote-drive__key--active': pressedKeys.has('S') }"
              @mousedown="emitPress('S')"
              @mouseup="emitRelease('S')"
              @mouseleave="emitRelease('S')"
            >
              <span class="remote-drive__key-letter">S</span>
              <span class="remote-drive__key-action">后退</span>
            </button>
            <button
              class="remote-drive__key"
              :class="{ 'remote-drive__key--active': pressedKeys.has('D') }"
              @mousedown="emitPress('D')"
              @mouseup="emitRelease('D')"
              @mouseleave="emitRelease('D')"
            >
              <span class="remote-drive__key-letter">D</span>
              <span class="remote-drive__key-action">右转</span>
            </button>
          </div>
          <div class="remote-drive__drive-mode">前进模式</div>
        </div>

        <div class="remote-drive__center">
          <div class="remote-drive__speed">
            <span class="remote-drive__speed-value">{{ speedKmh }}</span>
            <span class="remote-drive__speed-unit">km/h</span>
            <span class="remote-drive__speed-target">目标 {{ targetSpeedKmh }} km/h</span>
          </div>
          <div class="remote-drive__gears">
            <span class="remote-drive__gear-label">档位选择</span>
            <div class="remote-drive__gears-row">
              <button
                v-for="g in gears"
                :key="g"
                class="remote-drive__gear"
                :class="{ 'remote-drive__gear--active': gear === g }"
                @click="emit('update:gear', g)"
              >
                {{ g }}
              </button>
            </div>
          </div>
          <div class="remote-drive__action-text">{{ currentAction || '待机' }}</div>
        </div>

        <div class="remote-drive__col">
          <div class="remote-drive__col-title">作业功能</div>
          <button
            v-for="btn in workButtons"
            :key="btn.key"
            class="remote-drive__aux-btn"
            :class="{ 'remote-drive__aux-btn--on': auxOn.has(btn.key) }"
            @click="toggleAux(btn.key, btn.label)"
          >
            {{ btn.label }}
          </button>
        </div>
      </div>

      <div class="remote-drive__bottom">
        <div class="remote-drive__actions">
          <button class="remote-drive__action-btn" @click="emit('horn')">
            <Icon icon="ep:microphone" :size="18" />
            喇叭
          </button>
          <button
            class="remote-drive__action-btn remote-drive__action-btn--danger"
            @click="emit('emergency-stop')"
          >
            <Icon icon="ep:switch-button" :size="20" />
            急停
          </button>
          <button
            class="remote-drive__action-btn remote-drive__action-btn--takeover"
            :class="{ 'remote-drive__action-btn--takeover-on': isTakeover }"
            @click="toggleTakeover"
          >
            {{ isTakeover ? '退出接管' : '远程接管' }}
          </button>
          <button class="remote-drive__action-btn" @click="emit('clear-logs')">清空日志</button>
        </div>
      </div>
    </template>

    <div class="remote-drive__log">
      <div v-for="(log, idx) in controlLogs" :key="idx" class="remote-drive__log-item">
        <span class="remote-drive__log-time">{{ log.time }}</span>
        <span>{{ log.text }}</span>
      </div>
      <div v-if="!controlLogs.length" class="remote-drive__log-empty">暂无操作记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PtzControlPanel from './PtzControlPanel.vue'
import type { MonitorControlMode } from '../types'
import { WORK_STATUS_MAP, type WorkStatusValue } from '../../types'

const props = withDefaults(
  defineProps<{
    controlMode?: MonitorControlMode
    pressedKeys: Set<string>
    mockSpeed: number
    currentAction: string
    gear: string
    controlLogs: { time: string; text: string }[]
    takeover?: boolean
    workStatus?: number
    cleanProgress?: number | null
  }>(),
  {
    controlMode: 'remote',
    takeover: false,
    workStatus: 0,
    cleanProgress: null
  }
)

const emit = defineEmits<{
  press: [string]
  release: [string]
  'emergency-stop': []
  'clear-logs': []
  horn: []
  'update:gear': [string]
  'update:takeover': [boolean]
  'update:controlMode': [MonitorControlMode]
  aux: [label: string, on: boolean]
  ptz: [string, string | number?]
}>()

const modes: { key: MonitorControlMode; label: string }[] = [
  { key: 'auto', label: '自动驾驶' },
  { key: 'remote', label: '远程驾驶' },
  { key: 'ptz', label: '云台控制' }
]

const lightButtons = [
  { key: 'work-light', label: '工作灯' },
  { key: 'turn-left', label: '左转灯' },
  { key: 'turn-right', label: '右转灯' },
  { key: 'high-beam', label: '远光' },
  { key: 'warning', label: '警示' }
]

const workButtons = [
  { key: 'clean', label: '清扫' },
  { key: 'sprinkle', label: '洒水' },
  { key: 'suction', label: '吸污' },
  { key: 'unload', label: '卸料' },
  { key: 'reverse', label: '倒车' }
]

const gears = ['P', 'N', 'R', 'D']
const auxOn = ref(new Set<string>())
const takeoverLocal = ref(props.takeover)

watch(
  () => props.takeover,
  (v) => {
    takeoverLocal.value = v
  }
)

const controlMode = computed({
  get: () => props.controlMode,
  set: (v) => emit('update:controlMode', v)
})

const isTakeover = computed({
  get: () => takeoverLocal.value,
  set: (v) => {
    takeoverLocal.value = v
    emit('update:takeover', v)
  }
})

const hasSpeed = computed(() => props.mockSpeed > 0.01)
const speedKmh = computed(() => (props.mockSpeed * 3.6).toFixed(0))
const targetSpeedKmh = computed(() => (props.mockSpeed > 0 ? (props.mockSpeed * 3.6).toFixed(1) : '0.0'))

const workStatusText = computed(() => {
  return WORK_STATUS_MAP[props.workStatus as WorkStatusValue]?.label ?? `未知(${props.workStatus})`
})

const modeStatusText = computed(() => {
  if (props.controlMode === 'auto') return '自动驾驶监控'
  if (props.controlMode === 'ptz') return '云台控制中'
  return isTakeover.value ? '远程接管中' : '监控模式'
})

const formatTime = () => {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const setMode = (key: MonitorControlMode) => {
  controlMode.value = key
}

const emitPress = (key: string) => emit('press', key)
const emitRelease = (key: string) => emit('release', key)

const toggleAux = (key: string, label: string) => {
  const next = new Set(auxOn.value)
  const on = !next.has(key)
  if (on) next.add(key)
  else next.delete(key)
  auxOn.value = next
  emit('aux', label, on)
}

const toggleTakeover = () => {
  isTakeover.value = !isTakeover.value
}

const emitPtz = (action: string, value?: string | number) => {
  emit('ptz', action, value)
}
</script>

<style lang="scss" scoped>
.remote-drive {
  overflow: hidden;
  background: linear-gradient(180deg, #0e1520 0%, #0a0f18 100%);
  border: 1px solid #1a3a52;
  border-radius: 12px;
  box-shadow:
    0 4px 24px rgb(0 0 0 / 35%),
    0 0 20px rgb(0 200 255 / 6%);

  &--mode-ptz {
    border-color: #2a6090;
  }

  &__topbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgb(0 0 0 / 35%);
    border-bottom: 1px solid #1e3a52;
  }

  &__status-group {
    display: flex;
    gap: 8px;
  }

  &__pill {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;

    &--ok {
      color: #fff;
      background: #27ae60;
      box-shadow: 0 0 8px rgb(39 174 96 / 40%);
    }

    &--active {
      color: #fff;
      background: #2980b9;
    }

    &--idle {
      color: #8899aa;
      background: #1e2838;
    }
  }

  &__mode {
    display: flex;
    gap: 6px;
  }

  &__mode-btn {
    padding: 6px 14px;
    font-size: 12px;
    color: #8899aa;
    cursor: pointer;
    background: #141e2a;
    border: 1px solid #2a4055;
    border-radius: 6px;
    transition: all 0.15s;

    &--active {
      color: #fff;
      background: linear-gradient(180deg, #2a6090 0%, #1e4a70 100%);
      border-color: #00d4ff;
      box-shadow: 0 0 12px rgb(0 212 255 / 25%);
    }
  }

  &__network {
    font-size: 12px;
    color: #667788;
  }

  &__auto {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    padding: 24px 20px 12px;
  }

  &__auto-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: rgb(0 0 0 / 25%);
    border: 1px solid #2a4055;
    border-radius: 10px;
  }

  &__auto-label {
    font-size: 12px;
    color: #667788;
  }

  &__auto-value {
    font-size: 20px;
    font-weight: 700;
    color: #00d4ff;
  }

  &__auto-hint {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 12px;
    color: #556677;
    text-align: center;
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: flex-start;
    justify-content: center;
    padding: 18px 20px 12px;
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 88px;
  }

  &__col-title {
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #556677;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  &__aux-btn {
    min-width: 88px;
    padding: 8px 12px;
    font-size: 12px;
    color: #8899aa;
    cursor: pointer;
    background: #141e2a;
    border: 1px solid #2a4055;
    border-radius: 8px;
    transition: all 0.15s;

    &--on {
      color: #fff;
      background: linear-gradient(180deg, #27ae60 0%, #1e8449 100%);
      border-color: #2ecc71;
      box-shadow: 0 0 10px rgb(46 204 113 / 30%);
    }
  }

  &__wasd {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  &__wasd-row {
    display: flex;
    gap: 8px;
  }

  &__key {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 76px;
    height: 76px;
    cursor: pointer;
    user-select: none;
    background: #141e2a;
    border: 2px solid #2a5068;
    border-radius: 12px;
    transition: all 0.12s;

    &--wide {
      width: 76px;
    }

    &--active {
      background: #2980b9;
      border-color: #00d4ff;
      box-shadow: 0 0 16px rgb(0 212 255 / 30%);
      transform: scale(0.96);

      .remote-drive__key-letter,
      .remote-drive__key-action {
        color: #fff;
      }
    }
  }

  &__key-letter {
    font-size: 24px;
    font-weight: 700;
    color: #dde4ec;
  }

  &__key-action {
    margin-top: 4px;
    font-size: 11px;
    color: #778899;
  }

  &__drive-mode {
    margin-top: 4px;
    font-size: 12px;
    color: #7ec8e3;
  }

  &__center {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    min-width: 160px;
  }

  &__speed {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__speed-value {
    font-size: 52px;
    font-weight: 700;
    line-height: 1;
    color: #f1c40f;
    text-shadow: 0 0 20px rgb(241 196 15 / 30%);
  }

  &__speed-unit {
    margin-top: 4px;
    font-size: 14px;
    color: #8899aa;
  }

  &__speed-target {
    margin-top: 6px;
    font-size: 12px;
    color: #667788;
  }

  &__gears {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }

  &__gear-label {
    font-size: 11px;
    color: #556677;
  }

  &__gears-row {
    display: flex;
    gap: 6px;
  }

  &__gear {
    width: 40px;
    height: 40px;
    font-size: 16px;
    font-weight: 700;
    color: #8899aa;
    cursor: pointer;
    background: #141e2a;
    border: 2px solid #2a4055;
    border-radius: 8px;
    transition: all 0.15s;

    &--active {
      color: #fff;
      background: #27ae60;
      border-color: #2ecc71;
    }
  }

  &__action-text {
    font-size: 13px;
    color: #7ec8e3;
  }

  &__bottom {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    align-items: center;
    justify-content: center;
    padding: 12px 20px 16px;
    border-top: 1px solid #1e3a52;
  }

  &__tank {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 180px;
  }

  &__tank-row {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: #8899aa;

    span:first-child {
      width: 42px;
    }

    span:last-child {
      width: 32px;
      text-align: right;
    }
  }

  &__bar {
    flex: 1;
    height: 8px;
    overflow: hidden;
    background: #1a2332;
    border-radius: 4px;
  }

  &__bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #2980b9, #00d4ff);
    border-radius: 4px;

    &--warn {
      background: linear-gradient(90deg, #e67e22, #f1c40f);
    }
  }

  &__devices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__device {
    padding: 6px 10px;
    font-size: 11px;
    color: #667788;
    background: #141e2a;
    border: 1px solid #334;
    border-radius: 6px;

    &--on {
      color: #2ecc71;
      border-color: #27ae60;
    }
  }

  &__progress {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 12px;
    color: #8899aa;
  }

  &__progress-ring {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    font-size: 14px;
    font-weight: 700;
    color: #00d4ff;
    border: 3px solid #2980b9;
    border-radius: 50%;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__action-btn {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    min-width: 100px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    color: #dde4ec;
    cursor: pointer;
    background: #141e2a;
    border: 1px solid #2a5068;
    border-radius: 8px;
    transition: all 0.15s;

    &--danger {
      color: #fff;
      background: #c0392b;
      border-color: #e74c3c;
    }

    &--takeover {
      color: #8899aa;
      border-color: #3498db;
    }

    &--takeover-on {
      color: #fff;
      background: #2980b9;
    }
  }

  &__log {
    max-height: 88px;
    padding: 8px 16px 12px;
    overflow-y: auto;
    background: rgb(0 0 0 / 30%);
    border-top: 1px solid #1e3a52;
  }

  &__log-item {
    display: flex;
    gap: 12px;
    padding: 3px 0;
    font-size: 12px;
    color: #8899aa;
  }

  &__log-time {
    flex-shrink: 0;
    color: #556677;
  }

  &__log-empty {
    font-size: 12px;
    color: #556677;
    text-align: center;
  }
}

@media (width <= 900px) {
  .remote-drive__auto {
    grid-template-columns: 1fr 1fr;
  }

  .remote-drive__body {
    flex-direction: column;
    align-items: center;
  }

  .remote-drive__col {
    flex-flow: row wrap;
    justify-content: center;
  }
}
</style>
