<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
      <el-form-item label="店铺名称" prop="name">
        <el-input v-model="formData.name" clearable placeholder="请输入店铺名称" />
      </el-form-item>
      <el-form-item label="绑定车辆" prop="bindDevice">
        <el-select v-model="formData.bindDevice" class="w-80" placeholder="请选择绑定车辆" clearable>
          <el-option v-for="item in carList" :key="item.id" :label="item.name" :value="item.id" />
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
import * as ShopApi from '@/api/mall/shop'
import * as CarApi from '@/api/car/list'

defineOptions({ name: 'ShopForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: '',
  name: '',
  bindDevice: '',
})
const formRules = reactive({
  name: [{ required: true, message: '车辆名称不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const carList = ref<CarApi.ListVO[]>([]) // 所有店铺
const open = async (type: string, data: object) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  carList.value = await CarApi.getAllCar()
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
    const data = formData.value as unknown as ShopApi.ShopVO
    if (formType.value === 'create') {
      await ShopApi.createShop(data)
      message.success(t('common.createSuccess'))
    } else {
      await ShopApi.updateShop(data)
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
    id: '',
    name: '',
  }
  formRef.value?.resetFields()
}
</script>
