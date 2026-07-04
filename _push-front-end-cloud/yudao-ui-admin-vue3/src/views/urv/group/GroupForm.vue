<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
    >
      <el-form-item :label="t('view.urv.group.data.name')" prop="name">
        <el-input
          v-model="formData.name"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.group.data.name') })"
        />
      </el-form-item>
      <el-form-item :label="t('view.urv.group.data.tenantId')" prop="tenantId">
        <el-input-number
          v-model="formData.tenantId"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.group.data.tenantId') })"
          :min="1"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">{{
          t('form.btn_submit')
        }}</el-button>
      <el-button @click="dialogVisible = false">{{ t('form.btn_cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { GroupApi, GroupVO } from '@/api/urv/group'
import { ref, reactive } from 'vue'

const { t } = useI18n() // Internationalization
const message = useMessage() // Message pop-up

const dialogVisible = ref(false) // Dialog visibility
const dialogTitle = ref('') // Dialog title
const formLoading = ref(false) // Form loading state
const formType = ref('') // Form type: create or update
const formData = ref({
  id: undefined,
  name: undefined,
  tenantId: undefined
})
const formRules = reactive({
  name: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.group.data.name') }),
      trigger: 'blur',
    },
  ],
  tenantId: [
    {
      required: true,
      message: t('form.exception_empty', { field: t('view.urv.group.data.tenantId') }),
      trigger: 'blur',
    },
  ],
})
const formRef = ref() // Form reference

/** Open the dialog */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // If updating, fetch data
  if (id) {
    formLoading.value = true
    try {
      formData.value = await GroupApi.getGroup(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // Expose open method

/** Submit the form */
const emit = defineEmits(['success']) // Success event for callback
const submitForm = async () => {
  await formRef.value.validate()
  formLoading.value = true
  try {
    const data = formData.value as unknown as GroupVO
    if (formType.value === 'create') {
      await GroupApi.createGroup(data)
      message.success(t('common.createSuccess'))
    } else {
      await GroupApi.updateGroup(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success') // Emit success event
  } finally {
    formLoading.value = false
  }
}

/** Reset the form */
const resetForm = () => {
  formData.value = {
    id: undefined,
    name: undefined,
    tenantId: undefined
  }
  formRef.value?.resetFields()
}
</script>
