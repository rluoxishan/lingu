<template>
  <div>
    <Dialog v-model="dialogVisible" :title="dialogTitle" width="800px">
      <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="渠道状态" label-width="180px" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio
v-for="dict in getDictOptions(DICT_TYPE.COMMON_STATUS)" :key="parseInt(dict.value)"
              :value="parseInt(dict.value)">
              {{ dict.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="APPID" label-width="180px" prop="config.appId">
          <el-input v-model="formData.config.appId" clearable placeholder="请输入APPID" />
        </el-form-item>
        <el-form-item label="服务地址" label-width="180px" prop="config.serverUrl">
          <el-input v-model="formData.config.serverUrl" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="keyId" label-width="180px" prop="config.keyId">
          <el-input v-model="formData.config.keyId" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="资源类型" label-width="180px" prop="config.resourceType">
          <el-input v-model="formData.config.resourceType" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="资源密钥" label-width="180px" prop="config.resourceSecret">
          <el-input v-model="formData.config.resourceSecret" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="收费项目编号" label-width="180px" prop="config.itemNo">
          <el-input v-model="formData.config.itemNo" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="终端编号" label-width="180px" prop="config.iterminalNo">
          <el-input v-model="formData.config.iterminalNo" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="私钥文件内容" label-width="180px" prop="config.base64PrivateKeyStr">
          <el-input v-model="formData.config.base64PrivateKeyStr" clearable placeholder="请输入" />
        </el-form-item>
        <el-form-item label="备注" label-width="180px" prop="remark">
          <el-input v-model="formData.remark" :style="{ width: '100%' }" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
        <el-button @click="dialogVisible = false">取 消</el-button>
      </template>
    </Dialog>
  </div>
</template>
<script lang="ts" setup>
import { CommonStatusEnum } from '@/utils/constants'
import { DICT_TYPE, getDictOptions } from '@/utils/dict'
import * as ChannelApi from '@/api/pay/channel'

defineOptions({ name: 'ThirdChannelForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formData = ref<any>({
  appId: '',
  code: '',
  status: undefined,
  feeRate: 0,
  remark: '',
  config: {
    appId: '',
    serverUrl: '',
    KeyId: '',
    resourceType: '',
    resourceSecret: '',
    itemNo: '',
    iterminalNo: '',
    base64PrivateKeyStr: '',
  }
})
const formRules = {
  status: [{ required: true, message: '渠道状态不能为空', trigger: 'blur' }],
  'config.appId': [{ required: true, message: 'appId不能为空', trigger: 'blur' }],
  'config.serverUrl': [{ required: true, message: '服务地址', trigger: 'blur' }],
  'config.keyId': [{ required: true, message: 'keyId不能为空', trigger: 'blur' }],
  'config.resourceType': [{ required: true, message: '资源类型不能为空', trigger: 'blur' }],
  'config.resourceSecret': [{ required: true, message: '资源密钥不能为空', trigger: 'blur' }],
  'config.itemNo': [{ required: true, message: '收费项目编号不能为空', trigger: 'blur' }],
  'config.iterminalNo': [{ required: true, message: '终端编号不能为空', trigger: 'blur' }],
  'config.base64PrivateKeyStr': [{ required: true, message: '私钥文件内容不能为空', trigger: 'blur' }],
}
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (appId, code) => {
  dialogVisible.value = true
  formLoading.value = true
  resetForm(appId, code)
  // 加载数据
  try {
    const data = await ChannelApi.getChannel(appId, code)

    if (data && data.id) {
      formData.value = data
      formData.value.config = JSON.parse(data.config)
    }
    dialogTitle.value = !formData.value.id ? '创建支付渠道' : '编辑支付渠道'
  } finally {
    formLoading.value = false
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
    const data = { ...formData.value } as unknown as ChannelApi.ChannelVO
    data.config = JSON.stringify(formData.value.config)
    console.log('data.config', data.config, formData)
    if (!data.id) {
      await ChannelApi.createChannel(data)
      message.success(t('common.createSuccess'))
    } else {
      await ChannelApi.updateChannel(data)
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
const resetForm = (appId, code) => {
  formData.value = {
    appId: appId,
    code: code,
    status: CommonStatusEnum.ENABLE,
    remark: '',
    feeRate: 0,
    config: {
      appId: '',
      serverUrl: '',
      KeyId: '',
      resourceType: '',
      resourceSecret: '',
      itemNo: '',
      iterminalNo: '',
      base64PrivateKeyStr: '',
    }
  }
  formRef.value?.resetFields()
}
</script>
