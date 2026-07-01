<template>
  <div class="state-panel" :class="{ 'state-panel--compact': compact, 'state-panel--dark': dark }">
    <div class="state-panel__header">
      <span class="state-panel__header-dot" v-if="dark" />
      设备状态
    </div>
    <div class="state-panel__rows">
      <div class="state-panel__row">
        <span class="state-panel__label">在线</span>
        <span class="state-panel__content">
          <span :class="['status-tag', getStatusTagClass(vehicle.online ? 'green' : 'red')]">
            {{ vehicle.online ? '在线' : '离线' }}
          </span>
        </span>
      </div>
      <div class="state-panel__row">
        <span class="state-panel__label">工作状态</span>
        <span class="state-panel__content">
          <span :class="['status-tag', getStatusTagClass(getWorkStatusTone(vehicle.workStatus))]">
            {{ formatWorkStatus(vehicle.workStatus) }}
          </span>
        </span>
      </div>
      <div class="state-panel__row">
        <span class="state-panel__label">电量</span>
        <span class="state-panel__content">
          <BatteryBar :battery="vehicle.battery" :online="vehicle.online" :dark="dark" />
        </span>
      </div>
      <div class="state-panel__row">
        <span class="state-panel__label">当前任务</span>
        <span class="state-panel__content state-panel__text">{{ formatTaskId(vehicle.taskId) }}</span>
      </div>
      <div class="state-panel__row">
        <span class="state-panel__label">任务名称</span>
        <span class="state-panel__content state-panel__text">{{ vehicle.taskName || '-' }}</span>
      </div>
      <div class="state-panel__row">
        <span class="state-panel__label">告警</span>
        <span
          class="state-panel__content state-panel__text"
          :class="{ 'state-panel__text--danger': hasFault(vehicle) }"
        >
          {{ formatFault(vehicle) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BatteryBar from '../../components/BatteryBar.vue'
import {
  formatFault,
  formatTaskId,
  formatWorkStatus,
  getWorkStatusClass,
  hasFault,
  type VehicleStatusVO
} from '../../types'

withDefaults(
  defineProps<{
    vehicle: VehicleStatusVO
    compact?: boolean
    dark?: boolean
  }>(),
  { dark: false }
)

const getWorkStatusTone = (status: number) => {
  const cls = getWorkStatusClass(status)
  if (cls.includes('green')) return 'green'
  if (cls.includes('red')) return 'red'
  if (cls.includes('blue')) return 'blue'
  if (cls.includes('orange')) return 'orange'
  return 'yellow'
}

const getStatusTagClass = (tone: string) => {
  return `status-tag--${tone}`
}
</script>

<style lang="scss" scoped>
.state-panel {
  display: flex;
  flex-direction: column;
  padding: 12px 14px;
  background: #fff;

  &__header {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a2e;
  }

  &__header-dot {
    width: 6px;
    height: 6px;
    background: #00d4ff;
    border-radius: 50%;
    box-shadow: 0 0 6px #00d4ff;
  }

  &__rows {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
  }

  &__row {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 10px;
    align-items: center;
    min-height: 36px;
    padding: 7px 0;
    border-bottom: 1px solid #f2f4f7;

    &:last-child {
      border-bottom: none;
    }
  }

  &__label {
    flex-shrink: 0;
    font-size: 13px;
    line-height: 1.4;
    color: #909399;
  }

  &__content {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__text {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    color: #303133;
    word-break: break-all;

    &--danger {
      color: #e74c3c;
    }
  }

  &--compact {
    padding: 10px 12px;

    .state-panel__header {
      margin-bottom: 8px;
      font-size: 13px;
    }

    .state-panel__row {
      grid-template-columns: 64px 1fr;
      min-height: 32px;
      padding: 5px 0;
    }

    .state-panel__label {
      font-size: 12px;
    }

    .state-panel__text {
      font-size: 13px;
    }
  }

  &--dark {
    background: transparent;

    .state-panel__header {
      font-size: 15px;
      color: #7ec8e3;
    }

    .state-panel__row {
      border-bottom-color: rgb(30 58 82 / 80%);
    }

    .state-panel__label {
      font-size: 13px;
      color: #9eb0c0;
    }

    .state-panel__text {
      font-size: 14px;
      color: #e8f0f8;

      &--danger {
        color: #ff6b6b;
      }
    }
  }
}

.status-tag {
  display: inline-block;
  width: fit-content;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  border-radius: 10px;

  &--green {
    color: #27ae60;
    background: #e8f8ef;
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

  &--yellow {
    color: #f39c12;
    background: #fef5e7;
  }
}

.state-panel--dark .status-tag {
  &--green {
    color: #5ddea0;
    background: rgb(39 174 96 / 18%);
    border: 1px solid rgb(46 204 113 / 35%);
  }

  &--red {
    color: #ff7b72;
    background: rgb(231 76 60 / 15%);
    border: 1px solid rgb(231 76 60 / 35%);
  }

  &--blue {
    color: #6ec1ff;
    background: rgb(52 152 219 / 15%);
    border: 1px solid rgb(52 152 219 / 35%);
  }

  &--orange {
    color: #ffb366;
    background: rgb(230 126 34 / 15%);
    border: 1px solid rgb(230 126 34 / 35%);
  }

  &--yellow {
    color: #ffd166;
    background: rgb(243 156 18 / 15%);
    border: 1px solid rgb(243 156 18 / 35%);
  }
}
</style>
