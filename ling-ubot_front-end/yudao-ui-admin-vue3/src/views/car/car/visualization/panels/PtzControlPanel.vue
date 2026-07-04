<template>
  <div class="ptz-panel">
    <div class="ptz-panel__header">
      <span class="ptz-panel__title">云台控制</span>
      <span class="ptz-panel__preset">预置位 {{ preset }}</span>
    </div>

    <div class="ptz-panel__body">
      <div class="ptz-panel__pad">
        <button class="ptz-panel__dir ptz-panel__dir--up" @mousedown="emitDir('up')" @mouseup="emitStop">
          ▲
        </button>
        <div class="ptz-panel__pad-mid">
          <button class="ptz-panel__dir ptz-panel__dir--left" @mousedown="emitDir('left')" @mouseup="emitStop">
            ◀
          </button>
          <button class="ptz-panel__center" @click="emit('home')">回中</button>
          <button class="ptz-panel__dir ptz-panel__dir--right" @mousedown="emitDir('right')" @mouseup="emitStop">
            ▶
          </button>
        </div>
        <button class="ptz-panel__dir ptz-panel__dir--down" @mousedown="emitDir('down')" @mouseup="emitStop">
          ▼
        </button>
      </div>

      <div class="ptz-panel__zoom">
        <button class="ptz-panel__zoom-btn" @click="emit('zoom', 'in')">变焦 +</button>
        <button class="ptz-panel__zoom-btn" @click="emit('zoom', 'out')">变焦 −</button>
        <button class="ptz-panel__zoom-btn" @click="emit('focus', 'near')">近焦</button>
        <button class="ptz-panel__zoom-btn" @click="emit('focus', 'far')">远焦</button>
      </div>

      <div class="ptz-panel__presets">
        <button
          v-for="n in 4"
          :key="n"
          class="ptz-panel__preset-btn"
          :class="{ 'ptz-panel__preset-btn--active': preset === n }"
          @click="setPreset(n)"
        >
          位 {{ n }}
        </button>
      </div>
    </div>

    <p class="ptz-panel__hint">云台模式下主监控窗口显示 PTZ 流 · 接口待对接 dev/sub</p>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  move: [string]
  stop: []
  zoom: [string]
  focus: [string]
  home: []
  preset: [number]
}>()

const preset = ref(1)

const emitDir = (dir: string) => emit('move', dir)
const emitStop = () => emit('stop')

const setPreset = (n: number) => {
  preset.value = n
  emit('preset', n)
}
</script>

<style lang="scss" scoped>
.ptz-panel {
  padding: 16px 20px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: #00d4ff;
  }

  &__preset {
    font-size: 12px;
    color: #8899aa;
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    align-items: center;
    justify-content: center;
  }

  &__pad {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
  }

  &__pad-mid {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  &__dir {
    width: 52px;
    height: 52px;
    font-size: 16px;
    color: #dde4ec;
    cursor: pointer;
    user-select: none;
    background: #1a2838;
    border: 1px solid #2a6090;
    border-radius: 8px;
    transition: all 0.12s;

    &:active {
      background: #2980b9;
      border-color: #00d4ff;
    }
  }

  &__center {
    width: 52px;
    height: 52px;
    font-size: 12px;
    color: #f1c40f;
    cursor: pointer;
    background: #1e2838;
    border: 1px solid #f39c12;
    border-radius: 50%;
  }

  &__zoom {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  &__zoom-btn {
    min-width: 72px;
    padding: 10px 8px;
    font-size: 12px;
    color: #aab;
    cursor: pointer;
    background: #141e2a;
    border: 1px solid #334;
    border-radius: 6px;

    &:hover {
      border-color: #00d4ff;
      color: #00d4ff;
    }
  }

  &__presets {
    display: flex;
    gap: 8px;
  }

  &__preset-btn {
    width: 48px;
    height: 48px;
    font-size: 12px;
    color: #8899aa;
    cursor: pointer;
    background: #1a2332;
    border: 1px solid #334;
    border-radius: 8px;

    &--active {
      color: #fff;
      background: #2980b9;
      border-color: #00d4ff;
    }
  }

  &__hint {
    margin: 16px 0 0;
    font-size: 11px;
    color: #556677;
    text-align: center;
  }
}
</style>
