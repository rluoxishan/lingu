<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="车辆id" prop="id">
        <el-input v-if="formData.id" disabled v-model="formData.id" clearable placeholder="请输入车辆id" />
        <el-input v-else v-model="formData.id" clearable placeholder="请输入车辆id" />
      </el-form-item>
      <el-form-item label="车辆名称" prop="name">
        <el-input v-model="formData.name" clearable placeholder="请输入车辆名称" />
      </el-form-item>
      <el-form-item label="车辆描述" prop="info">
        <el-input v-model="formData.info" clearable placeholder="请输入车辆描述" />
      </el-form-item>
      <el-form-item v-if="formType === 'update'" label="EMQX" prop="enableConnectToEmqx">
        <el-radio-group v-model="formData.enableConnectToEmqx">
          <el-radio key="true" :value="true" border>允许</el-radio>
          <el-radio key="false" :value="false" border>不允许</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="formType === 'update'" label="分配租户" prop="tenantId">
        <el-select v-model="formData.tenantId" class="!w-240px" clearable placeholder="请选择租户">
          <el-option v-for="(item, index) in list" :key="index" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="formType === 'update'" label="分配区域" prop="regionName">
        <el-select v-model="formData.regionName" class="!w-240px" clearable placeholder="请选择区域">
          <el-option v-for="(item, index) in regionList" :key="index" :label="item.name" :value="item.name" />
        </el-select>
      </el-form-item>

    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ListApi from '@/api/car/list'
import * as TenantApi from '@/api/system/tenant'
import * as RegionsApi from '@/api/regions/list'

import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

defineOptions({ name: 'CarListForm' })

const { wsCache } = useCache()
const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: '',
  name: '',
  info: '',
  enableConnectToEmqx: false,
  tenantId: 1,
  regionName: ''
})
const formRules = reactive({
  name: [{ required: true, message: '车辆名称不能为空', trigger: 'blur' }],
  id: [{ required: true, message: '车辆id不能为空', trigger: 'blur' }],
  info: [{ required: true, message: '车辆描述不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, data: object = {}) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  if (formType.value === 'update') {
    getAllTenants()
    getAllRegions()
    if (data && Object.keys(data).length > 0) {
      formData.value = { ...formData.value, ...data }
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

// 查询所有租户
const list = ref([]) // 所有租户
const getAllTenants = async () => {
  try {
    let queryParams = {
      pageNo: 1,
      pageSize: 100,
    }
    let total = 0;
    const data = await TenantApi.getTenantPage(queryParams)
    list.value = data.list
    total = data.total
  } finally {

  }
}

const regionList = ref([]) // 所有区域
const getAllRegions = async () => {
  try {
    const data = await RegionsApi.getRegionsAll()
    regionList.value = data
  } finally {

  }
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
    const data = formData.value as unknown as ListApi.ListVO
    if (formType.value === 'create') {
      await ListApi.createCar(data)
      message.success(t('common.createSuccess'))
    } else {
      await ListApi.updateCar(data)
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

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: '',
    name: '',
    info: '',
    enableConnectToEmqx: false,
    tenantId: 1,
    regionName: ''
  }
  formRef.value?.resetFields()
}
</script>
