<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" :close-on-press-escape="false" :close-on-click-modal="false">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="120px">
      <el-form-item label="设备Id" prop="deviceId">
        <el-input v-model="formData.deviceId" clearable placeholder="请输入" />
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" clearable placeholder="请输入" />
      </el-form-item>
      <el-form-item label="信息" prop="info">
        <el-input v-model="formData.info" clearable placeholder="请输入" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number class="full" v-model="formData.sort" :min="0" clearable placeholder="请输入" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="handleCancel">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as CameraApi from '@/api/car/camera'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
defineOptions({ name: 'CameraForm' })

const { wsCache } = useCache()
const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  deviceId: '',
  name: '',
  info: '',
  sort: 0
})
const taskNodes = ref<any>([]) // 列表的数据
const formRules = reactive({
  deviceId: [{ required: true, message: 'deviceId不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '摄像头名称不能为空', trigger: 'blur' }],
  info: [{ required: true, message: '摄像头信息不能为空', trigger: 'blur' }],
  sort: [{ required: true, message: '排序不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, data: object) => {
  dialogVisible.value = true
  dialogTitle.value = t(type === 'create' ? '创建摄像头' : '修改摄像头')
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (data) {
    formLoading.value = true
    try {
      formData.value = Object.assign(data)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

const handleCancel = () => {
  dialogVisible.value = false
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as CameraApi.ListVO
    if (formType.value === 'create') {
      await CameraApi.createCamera(data)
      message.success(t('common.createSuccess'))
    } else {
      await CameraApi.updateCamera(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
    wsCache.delete(CACHE_KEY.ROLE_ROUTERS)
  }
}

/** 重置表单 */
const resetForm = () => {
  formRef.value?.resetFields()
  taskNodes.value = []
}

</script>
<style scoped>
.full {
  width: 100%;
}
</style>
