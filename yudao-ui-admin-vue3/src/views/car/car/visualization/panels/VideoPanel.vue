<template>
  <div class="video-panel" :class="`video-panel--mode-${controlMode}`">
    <div class="video-panel__toolbar">
      <div class="video-panel__mode-hint">
        <span class="video-panel__mode-dot" />
        {{ modeHint }}
      </div>
      <div class="video-panel__toolbar-actions">
        <button
          v-if="controlMode === 'remote'"
          class="video-panel__tool-btn"
          :class="{ 'video-panel__tool-btn--on': swapEnabled }"
          @click="swapEnabled = !swapEnabled"
        >
          {{ swapEnabled ? '辅窗切换：开' : '辅窗切换：关' }}
        </button>
        <span class="video-panel__main-label">主画面 · {{ CAMERA_META[effectiveMain].short }}</span>
      </div>
    </div>

    <div class="video-panel__grid">
      <div
        v-for="slot in layoutSlots"
        :key="slot.slot"
        class="video-panel__cell"
        :class="[
          `video-panel__cell--${slot.slot}`,
          {
            'video-panel__cell--main': slot.isMain,
            'video-panel__cell--ptz': slot.key === 'ptz',
            'video-panel__cell--swap': swapEnabled && !slot.isMain && controlMode === 'remote'
          }
        ]"
        @click="handleCellClick(slot.key, slot.isMain)"
      >
        <div class="video-panel__cell-scan" />
        <div class="video-panel__cell-bg" />
        <div class="video-panel__cell-content">
          <Icon
            :icon="slot.key === 'ptz' ? 'ep:aim' : 'ep:video-camera'"
            :size="slot.isMain ? 56 : 26"
            class="video-panel__icon"
          />
          <p v-if="slot.isMain" class="video-panel__hint">等待 {{ CAMERA_META[slot.key].short }} 流 · ≥720p</p>
          <p v-else class="video-panel__hint video-panel__hint--sub">NO SIGNAL</p>
        </div>
        <template v-if="slot.isMain">
          <div class="video-panel__hud-corner video-panel__hud-corner--tl" />
          <div class="video-panel__hud-corner video-panel__hud-corner--tr" />
          <div class="video-panel__hud-corner video-panel__hud-corner--bl" />
          <div class="video-panel__hud-corner video-panel__hud-corner--br" />
        </template>
        <span
          class="video-panel__badge"
          :class="{ 'video-panel__badge--main': slot.isMain, 'video-panel__badge--ptz': slot.key === 'ptz' }"
        >
          {{ CAMERA_META[slot.key].label }}
        </span>
        <span v-if="slot.isMain" class="video-panel__live">
          <span class="video-panel__live-dot" />
          LIVE
        </span>
        <span v-if="swapEnabled && !slot.isMain && controlMode === 'remote'" class="video-panel__swap-tip">
          切主
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CAMERA_META, type CameraKey, type MonitorControlMode } from '../types'

const props = withDefaults(
  defineProps<{
    controlMode?: MonitorControlMode
    mainCam?: CameraKey
  }>(),
  { controlMode: 'remote', mainCam: 'front' }
)

const emit = defineEmits<{ 'update:mainCam': [CameraKey] }>()

const swapEnabled = ref(true)

const mainCam = computed({
  get: () => props.mainCam,
  set: (v) => emit('update:mainCam', v)
})

const effectiveMain = computed<CameraKey>(() => {
  if (props.controlMode === 'ptz') return 'ptz'
  return mainCam.value === 'ptz' ? 'front' : mainCam.value
})

const modeHint = computed(() => {
  if (props.controlMode === 'auto') return '自动驾驶 · 前视监控为主，控制区只读'
  if (props.controlMode === 'ptz') return '云台控制 · 云台流占据主窗口'
  return '远程驾驶 · 五路视频，辅窗点击可切换主画面'
})

/** 5 路：主 + 4 辅 */
const cameraSet = computed(() => {
  const main = effectiveMain.value
  if (props.controlMode === 'ptz') {
    return { main, subs: ['front', 'left', 'right', 'rear'] as CameraKey[] }
  }
  const pool: CameraKey[] = ['left', 'right', 'rear', 'surround']
  return { main, subs: pool.filter((k) => k !== main) }
})

const layoutSlots = computed(() => {
  const { main, subs } = cameraSet.value
  return [
    { slot: 'left', key: subs[0], isMain: false },
    { slot: 'main', key: main, isMain: true },
    { slot: 'right', key: subs[1], isMain: false },
    { slot: 'rear', key: subs[2], isMain: false },
    { slot: 'extra', key: subs[3], isMain: false }
  ]
})

watch(
  () => props.controlMode,
  (mode) => {
    if (mode === 'ptz') mainCam.value = 'ptz'
    else if (mainCam.value === 'ptz') mainCam.value = 'front'
  },
  { immediate: true }
)

const handleCellClick = (key: CameraKey, isMain: boolean) => {
  if (isMain || props.controlMode !== 'remote' || !swapEnabled.value) return
  mainCam.value = key
}
</script>

<style lang="scss" scoped>
.video-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 400px;
  padding: 12px;
  background: linear-gradient(180deg, #0a1018 0%, #060a10 100%);
  border: 1px solid #1a3a52;
  border-radius: 12px;
  box-shadow:
    0 0 24px rgb(0 200 255 / 8%),
    inset 0 1px 0 rgb(255 255 255 / 4%);

  &--mode-ptz {
    border-color: #2a6090;
    box-shadow: 0 0 28px rgb(52 152 219 / 15%);
  }

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }

  &__mode-hint {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: #9ec8e0;
  }

  &__mode-dot {
    width: 8px;
    height: 8px;
    background: #00d4ff;
    border-radius: 50%;
    box-shadow: 0 0 8px #00d4ff;
    animation: pulse 1.5s infinite;
  }

  &__toolbar-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  &__tool-btn {
    padding: 4px 10px;
    font-size: 11px;
    color: #8899aa;
    cursor: pointer;
    background: rgb(0 0 0 / 35%);
    border: 1px solid #334;
    border-radius: 4px;

    &--on {
      color: #00d4ff;
      border-color: #00d4ff;
    }
  }

  &__main-label {
    font-size: 11px;
    font-weight: 600;
    color: #f1c40f;
  }

  &__grid {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(120px, 1fr) minmax(260px, 2.4fr) minmax(120px, 1fr);
    grid-template-rows: 1fr 1fr;
    grid-template-areas:
      'left main right'
      'rear main extra';
    gap: 8px;
    min-height: 360px;
  }

  &__cell {
    position: relative;
    overflow: hidden;
    cursor: default;
    background: #050810;
    border: 1px solid #1e3a52;
    border-radius: 8px;
    transition: all 0.2s;

    &--left {
      grid-area: left;
    }

    &--main {
      grid-area: main;
      border-color: #2a6090;
      box-shadow: inset 0 0 30px rgb(0 212 255 / 6%);
    }

    &--right {
      grid-area: right;
    }

    &--rear {
      grid-area: rear;
    }

    &--extra {
      grid-area: extra;
    }

    &--ptz {
      border-color: #3498db;

      &.video-panel__cell--main {
        box-shadow:
          inset 0 0 40px rgb(52 152 219 / 12%),
          0 0 16px rgb(52 152 219 / 20%);
      }
    }

    &--swap {
      cursor: pointer;

      &:hover {
        border-color: #00d4ff;
        box-shadow: 0 0 12px rgb(0 212 255 / 20%);
      }
    }
  }

  &__cell-scan {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgb(0 212 255 / 2%) 3px,
      rgb(0 212 255 / 2%) 4px
    );
  }

  &__cell-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, #0d1520 0%, #050810 70%);
  }

  &__cell-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 100px;
  }

  &__icon {
    color: #3a5a72;
  }

  &__cell--main &__icon {
    color: #4a8ab0;
  }

  &__hint {
    margin: 10px 0 0;
    font-size: 13px;
    color: #9eb0c0;

    &--sub {
      font-size: 11px;
      letter-spacing: 1px;
      color: #708090;
    }
  }

  &__hud-corner {
    position: absolute;
    z-index: 2;
    width: 18px;
    height: 18px;
    pointer-events: none;
    border: 2px solid #00d4ff;

    &--tl {
      top: 8px;
      left: 8px;
      border-right: none;
      border-bottom: none;
    }

    &--tr {
      top: 8px;
      right: 8px;
      border-bottom: none;
      border-left: none;
    }

    &--bl {
      bottom: 8px;
      left: 8px;
      border-top: none;
      border-right: none;
    }

    &--br {
      right: 8px;
      bottom: 8px;
      border-top: none;
      border-left: none;
    }
  }

  &__badge {
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 3;
    padding: 4px 9px;
    font-size: 11px;
    font-weight: 600;
    color: #c8d4e0;
    background: rgb(0 0 0 / 60%);
    border-radius: 3px;

    &--main {
      color: #00d4ff;
      background: rgb(0 60 90 / 70%);
    }

    &--ptz {
      color: #7ec8e3;
    }
  }

  &__live {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 3px 8px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    background: rgb(231 76 60 / 85%);
    border-radius: 3px;
  }

  &__live-dot {
    width: 5px;
    height: 5px;
    background: #fff;
    border-radius: 50%;
    animation: blink 1s infinite;
  }

  &__swap-tip {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 3;
    padding: 2px 6px;
    font-size: 9px;
    color: #00d4ff;
    background: rgb(0 0 0 / 50%);
    border-radius: 3px;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }
}

@media (width <= 900px) {
  .video-panel__grid {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      'main main'
      'left right'
      'rear extra';
    min-height: 520px;
  }
}
</style>
