<template>
  <div class="battery-bar" :class="{ 'battery-bar--offline': !online && battery <= 0, 'battery-bar--dark': dark }">
    <div class="battery-bar__shell">
      <div
        class="battery-bar__fill"
        :style="{ width: fillWidth, backgroundColor: fillColor }"
      />
    </div>
    <div class="battery-bar__cap" />
    <span class="battery-bar__text" :style="{ color: fillColor }">{{ clamped }}%</span>
  </div>
</template>

<script setup lang="ts">
import { getBatteryLevelColor } from '../types'

const props = withDefaults(
  defineProps<{
    battery: number
    online?: boolean
    dark?: boolean
  }>(),
  { online: true, dark: false }
)

const clamped = computed(() => Math.max(0, Math.min(100, Math.round(props.battery))))
const fillWidth = computed(() => `${clamped.value}%`)
const fillColor = computed(() => getBatteryLevelColor(clamped.value, props.online))
</script>

<style lang="scss" scoped>
.battery-bar {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &--offline .battery-bar__shell {
    border-color: #dcdfe6;
  }

  &__shell {
    position: relative;
    width: 36px;
    height: 14px;
    overflow: hidden;
    background: #f0f2f5;
    border: 1.5px solid #909399;
    border-radius: 3px;
  }

  &__fill {
    height: 100%;
    border-radius: 1px;
    transition: width 0.35s ease, background-color 0.35s ease;
  }

  &__cap {
    width: 3px;
    height: 6px;
    background: #909399;
    border-radius: 0 2px 2px 0;
  }

  &__text {
    min-width: 36px;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
  }

  &--dark {
    .battery-bar__shell {
      background: #1a2838;
      border-color: #3a5a72;
    }

    .battery-bar__cap {
      background: #3a5a72;
    }

    &.battery-bar--offline .battery-bar__shell {
      border-color: #445566;
    }
  }
}
</style>
