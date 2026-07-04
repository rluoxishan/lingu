<template>
  <Dialog v-model="dialogVisible" title="详情" width="800">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" label-width="150px">
      <span v-if="!formData">暂无数据</span>
      <el-form-item v-for="(value, item, index) in formData" :key="index" :label="item + '：'">
        {{ value }}
      </el-form-item>

    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="dialogVisible = false">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ListApi from '@/api/car/list'

defineOptions({ name: 'ListDetail' })


const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false) // 
const formData = ref({})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (id: string) => {
  formData.value = ''
  dialogVisible.value = true
  let detail = await ListApi.getDetail(id)
  if (detail) {
    formData.value = Object.assign(detail)
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调

</script>
