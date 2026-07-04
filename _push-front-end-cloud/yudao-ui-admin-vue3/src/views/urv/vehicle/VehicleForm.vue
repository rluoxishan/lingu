<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item :label="t('view.urv.vehicle.data.name')" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.vehicle.data.name') })"
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.carSn')" prop="carSn">
        <el-input
          v-model="formData.carSn"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.vehicle.data.carSn') })"
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.groupMemberId')" prop="groupMemberId">
        <el-input
          v-model="formData.groupMemberId"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.vehicle.data.groupMemberId') })"
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.vehicle.data.model')" prop="model">
        <el-input
          v-model="formData.model"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.vehicle.data.model') })"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">
        {{ t('form.btn_submit') }}
      </el-button>
      <el-button @click="dialogVisible = false">{{ t('form.btn_cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">

import { VehicleApi, VehicleVO } from '@/api/urv/vehicle'
import {ref} from "vue";

defineOptions({ name: 'VehicleForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formData = ref({
  Id: undefined,
  name: undefined,
  carSn: undefined,
  groupMemberId: undefined,
  model: undefined,
})
const formRules = reactive({
  name: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.vehicle.data.name') }),
      trigger: 'blur'
    }
  ],
  groupMemberId: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.vehicle.data.groupMemberId') }),
      trigger: 'blur'
    }
  ],
  carSn: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.vehicle.data.carSn') }),
      trigger: 'blur'
    }
  ],
  model: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.vehicle.data.model') }),
      trigger: 'blur'
    }
  ],
})

const formRef = ref()

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (id) {
    formLoading.value = true
    try {
      formData.value = await VehicleApi.getVehicle(id)
    } finally {
      formLoading.value = false
    }
  }
}

defineExpose({ open })

const emit = defineEmits(['success'])

const submitForm = async () => {
  await formRef.value.validate()
  formLoading.value = true
  try {
    const data = formData.value as unknown as VehicleVO
    if (formType.value === 'create') {
      await VehicleApi.createVehicle(data)
      message.success(t('common.createSuccess'))
    } else {
      await VehicleApi.updateVehicle(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  formData.value = {
    Id: undefined,
    name: undefined,
    carSn: undefined,
    groupMemberId: undefined,
    model: undefined,
  }
  formRef.value?.resetFields()
}

</script>
