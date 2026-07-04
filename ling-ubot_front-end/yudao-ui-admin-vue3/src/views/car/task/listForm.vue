<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" :close-on-press-escape="false" :close-on-click-modal="false">
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="120px">
      <el-form-item label="设备id" prop="deviceId">
        <el-select v-hasPermi="['device:instructions']" v-model="formData.deviceId" class="w-80" placeholder="请选择绑定车辆"
          clearable @change="handleDeviceChange">
          <el-option v-for="item in carList" :key="item.id" :label="item.id" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="任务名" prop="taskName">
        <el-input v-model="formData.taskName" maxlength="15" clearable placeholder="请输入任务名（15字以内）" />
      </el-form-item>

      <el-form-item label="任务节点添加" prop="taskNodes">
        <el-select v-show="false" v-model="formData.taskNodes" />
        <el-button class="mt-2" @click.prevent="addItems()">
          <Icon icon="ep:plus" />
        </el-button>
      </el-form-item>
      <div style="height: 200px; overflow-y: scroll">
        <div v-for="(domain, index) in taskNodes" :key="index">
          <el-form-item :label="'序号' + (index + 1)" :prop="domain.order + ''">
            <el-input-number class="full" disabled v-model="domain.order" placeholder="序号" />
          </el-form-item>
          <el-form-item :label="'站点名' + (index + 1)" :prop="domain.taskPoint">
            <el-select filterable default-first-option :reserve-keyword="false" placeholder="站点名"
              v-model="domain.taskPoint">
              <!-- allow-create -->
              <el-option v-for="item in returnPointsList" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
          <el-form-item :label="'时长' + (index + 1)" :prop="domain.duration">
            <el-time-picker style="width: 100%" v-model="domain.duration" format="mm:ss" value-format="mm:ss"
              placeholder="时长" />
          </el-form-item>
          <el-form-item>
            <el-button @click.prevent="removeItems(index)">
              <Icon icon="ep:minus" />
            </el-button>
          </el-form-item>
        </div>
      </div>
      <el-form-item label="返回点" prop="returnPoint">
        <el-select filterable default-first-option :reserve-keyword="false" placeholder="请选择或输入任务执行方式"
          v-model="formData.returnPoint">
          <!-- allow-create -->
          <el-option v-for="item in returnPointsList" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="循环类型" prop="cycleType">
        <el-select placeholder="请选择循环类型" v-model="formData.cycleType">
          <el-option value="EVERY_WEEK" label="每周" />
          <el-option value="ODD_WEEK" label="单周" />
          <el-option value="EVEN_WEEK" label="双周" />
        </el-select>
      </el-form-item>
      <el-form-item label="循环次数" prop="cycleCount">
        <el-input-number class="full" v-model="formData.cycleCount" clearable :step="1" placeholder="请输入循环次数" />
      </el-form-item>
      <el-form-item label="循环天数" prop="cycleDays">
        <el-select placeholder="请选择循环天数" v-model="formData.cycleDays" multiple>
          <el-option v-for="item in 7" :value="item" :label="item" :key="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="任务开始时间" prop="startTime">
        <el-time-picker style="width: 100%" v-model="formData.startTime" format="mm:ss" value-format="mm:ss"
          placeholder="请选择任务开始时间" />
      </el-form-item>
      <el-form-item label="执行模式" prop="executionMode">
        <el-select placeholder="请选择执行模式" v-model="formData.executionMode">
          <el-option value="IMMEDIATE" label="立即执行" />
          <el-option value="SCHEDULED" label="计划任务" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否激活" prop="active">
        <el-radio-group v-model="formData.active">
          <el-radio :value="true">激活 </el-radio>
          <el-radio :value="false">关闭</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="handleCancel">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ListApi from '@/api/car/task'
import * as CarApi from '@/api/car/list'
import { IssueInstructions } from '@/api/car/monitor'

import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

defineOptions({ name: 'TaskForm' })

const { wsCache } = useCache()
const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  deviceId: '',
  taskName: '',
  cycleCount: 0,
  cycleDays: 0,
  cycleType: 'EVERY_WEEK',
  startTime: '',
  active: false,
  executionMode: 'SCHEDULED',
  returnPoint: '',
  taskNodes: [],
  tenantId: 1
})
const taskNodes = ref<any>([]) // 列表的数据
const formRules = reactive({
  deviceId: [{ required: true, message: 'deviceId不能为空', trigger: 'blur' }],
  taskName: [{ required: true, message: '任务名不能为空', trigger: 'blur' }],
  returnPoint: [{ required: true, message: '返回点不能为空', trigger: 'blur' }],
  cycleType: [{ required: true, message: '循环类型不能为空', trigger: 'change' }],
  cycleCount: [{ required: true, message: '循环次数不能为空', trigger: 'blur' }],
  startTime: [{ required: true, message: '任务开始时间不能为空', trigger: 'blur' }],
  executionMode: [{ required: true, message: '请选择执行模式', trigger: 'change' }],
  active: [{ required: true, message: '请选择行模式', trigger: 'change' }],
  taskNodes: [{ required: true, message: '任务节点不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref
const returnPointsList = ref([])
const carList = ref<CarApi.ListVO[]>([]) // 所有店铺

/** 打开弹窗 */
const open = async (type: string, data: object) => {
  dialogVisible.value = true
  dialogTitle.value = t(type === 'create' ? '创建设备任务' : '修改设备任务')
  formType.value = type
  carList.value = await CarApi.getAllCar()
  resetForm()
  // 修改时，设置数据
  if (data) {
    formLoading.value = true
    try {
      formData.value = Object.assign(data)
      if (formData.value.taskNodes && formData.value.taskNodes.length > 0) {
        taskNodes.value = JSON.parse(JSON.stringify(formData.value.taskNodes))
      }
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
  // 校验任务节点
  for (let i in taskNodes.value) {
    if (!taskNodes.value[i].taskPoint) {
      message.warning(t('任务节点站点名不能为空'))
      return
    }
  }
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ListApi.ListVO
    formData.value.taskNodes = JSON.parse(JSON.stringify(taskNodes.value))
    if (formType.value === 'create') {
      await ListApi.createTask(data)
      message.success(t('common.createSuccess'))
    } else {
      await ListApi.updateTask(data)
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

const addItems = () => {
  let data = {
    duration: '00:00',
    order: taskNodes.value.length + 1,
    taskPoint: ''
  }
  taskNodes.value.push(data)
  formData.value.taskNodes = JSON.parse(JSON.stringify(taskNodes.value))
}
const removeItems = (index) => {
  taskNodes.value.splice(index, 1)
  formData.value.taskNodes = JSON.parse(JSON.stringify(taskNodes.value))
}

// 选择设备id
const handleDeviceChange = async (e) => {
  console.log('e', e)
  let params = { deviceId: e, type: '2010007' }
  const { code, data } = await IssueInstructions(params)
  if (code == 0) {
    returnPointsList.value = data
    return
  }
  returnPointsList.value = []
}
</script>
<style scoped>
.full {
  width: 100%;
}
</style>
