<template>
  <Dialog
    :title="dialogTitle"
    v-model="dialogVisible"
    @close="onClose"
  >
    <el-form
      :model="liveData"
      label-width="100px"
      v-loading="viewerLoading"
    >
      <el-form-item :label="t('view.data.summary')">
        <el-input
          :value="vehicleSummary"
          disabled
        />
      </el-form-item>
      <el-form-item :label="t('common.updated')">
        <el-input
          :value="t('common.secs_ago', { durationInSeconds:  updated })"
          disabled
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.latitude')">
        <el-input
          v-model="liveData.currentLatitude"
          disabled
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.longitude')">
        <el-input
          v-model="liveData.currentLongitude"
          disabled
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.location')">
        <VehicleMapViewer ref="mapViewer" :vehicleSummary="vehicleSummary" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="focus" type="primary" :disabled="viewerLoading">
        <Icon icon="ep:map-location" class="mr-5px"/>
        {{ t('map.focus') }}
      </el-button>
      <el-button @click="dialogVisible = false">{{ t('form.btn_cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, defineExpose, nextTick } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import VehicleMapViewer from '@/components/AMap/VehicleMapViewer.vue'
import { VehicleApi } from '@/api/urv/vehicle'

const {t} = useI18n()
const message = useMessage()

const vehicleId = ref()
const vehicleSummary = ref('')

const dialogVisible = ref(false)
const dialogTitle = ref('')
const viewerLoading = ref(false)
const mapViewer = ref<InstanceType<typeof VehicleMapViewer> | null>(null) // Properly type mapViewer ref
const updated = ref()

const liveData = ref<{
  vehicleId: number | undefined;
  currentLatitude: number | undefined;
  currentLongitude: number | undefined;
  timestamp: number | undefined;
}>({
  vehicleId: undefined,
  currentLatitude: undefined,
  currentLongitude: undefined,
  timestamp: undefined,
})

const masterData = ref({
  Id: undefined,
  name: undefined,
  carSn: undefined,
})


const open = async (type: string, id?: number) => {
  if (id) {
    viewerLoading.value = true
    try {
      vehicleId.value = id
      masterData.value = await VehicleApi.getVehicle(vehicleId.value)

      vehicleSummary.value = masterData.value.name + ' (' + masterData.value.carSn + ')'

      dialogVisible.value = true
      dialogTitle.value = t('action.' + type)
      await nextTick()
      resume()
    } finally {
      viewerLoading.value = false
    }
  }
}

defineExpose({ open } )

const updateLiveData = async () => {
  viewerLoading.value = false
  if (!vehicleId.value) {
    return
  }
  try {
    liveData.value = await VehicleApi.getVehicleLiveData(vehicleId.value)

    updated.value = ((Date.now() / 1000) - (liveData.value.timestamp ?? 0)).toFixed(0)

    // Ensure mapViewer is initialized and setLocationMarker exists
    if (mapViewer.value && mapViewer.value.mapActions?.setLocationMarker) {
      mapViewer.value.mapActions.setLocationMarker(
        liveData.value.currentLatitude,
        liveData.value.currentLongitude
      )
    } else {
      message.error(t('view.urv.vehicle.error.loading'))
    }
    viewerLoading.value = false
  } catch (error) {
    viewerLoading.value = true
    message.error(t('view.urv.vehicle.error.loading'))
  }
}

const { pause, resume } = useIntervalFn(updateLiveData, 1000)

const focus = () => {
  if (mapViewer.value && mapViewer.value.mapActions?.focus) {
    mapViewer.value.mapActions.focus()
  } else {
    message.error(t('view.urv.vehicle.error.loading'))
  }
}

const onClose = () => {
  pause()
}

onMounted(async () => {
  await nextTick()
  if (mapViewer.value) {
    message.error(t('view.urv.vehicle.error.loading'))
  } else {
    message.error(t('view.urv.vehicle.error.loading'))
  }
  pause()
})

</script>
