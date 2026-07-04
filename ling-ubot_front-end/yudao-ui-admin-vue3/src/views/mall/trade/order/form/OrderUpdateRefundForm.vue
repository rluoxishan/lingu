<template>
  <Dialog v-model="dialogVisible" title="退款" width="45%">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" label-width="80px">
      <el-form-item label="退款金额">
        <el-input-number
          disabled
          v-model="formData.refundPrice"
          :rows="3"
          placeholder="请输入退款金额"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="退款原因">
        <el-input
          v-model="formData.applyReason"
          :rows="3"
          placeholder="请输入退款原因"
          type="textarea"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as TradeOrderApi from '@/api/mall/trade/order'

defineOptions({ name: 'OrderUpdateRefundForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formData = ref({
  orderItemId: '', // 订单项id
  way: 10,
  applyReason: '',
  refundPrice: 0
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (row: TradeOrderApi.OrderVO) => {
  resetForm()
  // 设置数据
  console.log('row=============', row)
  formData.value.orderItemId = row?.items[0].id
  formData.value.refundPrice = row?.items[0].payPrice
  dialogVisible.value = true
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 提交请求
  formLoading.value = true
  try {
    const data = unref(formData)
    console.log('data', data)
    await TradeOrderApi.updateOrderRefund(data)
    message.success(t('common.updateSuccess'))
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success', true)
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    orderItemId: '', // 订单项id
    refundPrice: 0, // 订单备注
    way: 10,
    applyReason: ''
  }
  formRef.value?.resetFields()
}
</script>
