<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item :label="t('view.urv.business.data.name')" prop="name">
        <el-input
          v-model="formData.name"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.name') })"/>
      </el-form-item>
      <el-form-item :label="t('view.urv.business.data.country')" prop="country">
        <el-input
          v-model="formData.country"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.country') })"/>
      </el-form-item>
      <el-form-item :label="t('view.urv.business.data.province')" prop="province">
        <el-input
          v-model="formData.province"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.province') })"/>
      </el-form-item>
      <el-form-item :label="t('view.urv.business.data.city')" prop="city">
        <el-input
          v-model="formData.city"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.city') })"/>
      </el-form-item>
      <el-form-item :label="t('view.urv.business.data.address')" prop="address">
        <el-input
          v-model="formData.address"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.address') })"/>
      </el-form-item>
      <el-form-item :label="t('view.urv.business.data.coordinate')" prop="coordinate">
        <el-input
          v-model="formData.coordinate"
                  :placeholder="t('form.prompt_enter', { field: t('view.urv.business.data.coordinate') })"/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">{{
          t('form.btn_submit')
        }}
      </el-button>
      <el-button @click="dialogVisible = false">{{ t('form.btn_cancel') }}</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">

import {BusinessApi, BusinessVO} from '@/api/urv/business'

/** BPM 流程分类 表单 */
defineOptions({name: 'BusinessForm'})

const {t} = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  Id: undefined,
  name: undefined,
  country: undefined,
  province: undefined,
  city: undefined,
  address: undefined,
  coordinate: undefined
})
const formRules = reactive({
  Id: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.id')}),
      trigger: 'blur'
    },
  ],
  name: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.name')}),
      trigger: 'blur'
    },
  ],
  country: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.country')}),
      trigger: 'blur'
    },
  ],
  province: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.province')}),
      trigger: 'blur'
    },
  ],
  city: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.city')}),
      trigger: 'blur'
    },
  ],
  address: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.address')}),
      trigger: 'blur'
    },
  ],
  coordinate: [
    {
      required: true,
      message: t('form.exception_empty', {field: t('view.urv.business.data.coordinate')}),
      trigger: 'blur'
    },
  ],
});
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await BusinessApi.getBusiness(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({open}) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as BusinessVO
    if (formType.value === 'create') {
      await BusinessApi.createBusiness(data)
      message.success(t('common.createSuccess'))
    } else {
      await BusinessApi.updateBusiness(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    Id: undefined,
    name: undefined,
    country: undefined,
    province: undefined,
    city: undefined,
    address: undefined,
    coordinate: undefined
  }
  formRef.value?.resetFields()
}

</script>
