<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="区域名称" prop="name">
        <el-input v-if="formType === 'update'" disabled v-model="formData.name" clearable placeholder="请输入区域名称" />
        <el-input v-else v-model="formData.name" clearable placeholder="请输入区域名称" />
      </el-form-item>
      <el-form-item label="车辆位置" prop="points">
        <el-input v-model="formData.points" clearable placeholder="请输入车辆位置" />
        <!-- <el-button v-if="points.length === 0" type="primary" @click="openDialog">选择地址</el-button>
        <span v-else>车辆地址:{{ points }}</span> -->
      </el-form-item>

    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>

  </Dialog>
  <PositionDialog ref="mapBox" @success="getPosition" />
</template>
<script lang="ts" setup>
import * as ListApi from '@/api/regions/list'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
import PositionDialog from './PositionDialog.vue'

defineOptions({ name: 'RegionListForm' })

const { wsCache } = useCache()
const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  name: '',
  points: ''
})
const points = ref([])

const formRules = reactive({
  name: [{ required: true, message: '区域名称不能为空', trigger: 'blur' }],
  points: [{ required: true, message: '车辆位置不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, data: object) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (data) {
    // formLoading.value = true
    try {
      formData.value = Object.assign(data)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

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
    const data = formData.value as unknown as ListApi.ListVO
    if (formType.value === 'create') {
      await ListApi.createRegion(data)
      message.success(t('common.createSuccess'))
    } else {
      await ListApi.updateRegion(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
    // 清空，从而触发刷新
    wsCache.delete(CACHE_KEY.ROLE_ROUTERS)
  }
}

// 打开弹框
const mapBox = ref()
const openDialog = () => {
  console.log('mapBox', mapBox, mapBox.value)
  mapBox.value.open()
}

// 获取位置
const getPosition = (e) => {
  console.log("eeeeeee", e)
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: '',
    name: '',
    points: ''
  }
  points.value = []
  formRef.value?.resetFields()
}
</script>
