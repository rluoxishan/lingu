<template>
  <Dialog v-model="dialogVisible" title="详情" width="800">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" label-width="150px">
      <span v-if="!formData">暂无数据</span>
      <el-form-item v-for="(value, item, index) in formData" :key="index" :label="item + '：'">
        <span v-if="item === 'taskNodes'">
          <span v-for="(tItem, tIndex) in value" :key="tIndex">
            <span v-for="(dValue, dItem, dIndex) in tItem" :key="dIndex">
              {{ dItem }}：{{ dValue }}<br />
            </span>
          </span>
        </span>
        <span v-else> {{ value }}</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="dialogVisible = false"
        >确 定</el-button
      >
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
defineOptions({ name: 'TaskDetail' })

const dialogVisible = ref(false) // 弹窗的是否展示
const formLoading = ref(false) //
const formData = ref({})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (data: string) => {
  formData.value = JSON.parse(JSON.stringify(data))
  dialogVisible.value = true
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>
