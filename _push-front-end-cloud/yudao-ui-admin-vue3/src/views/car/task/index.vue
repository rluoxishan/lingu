<template>
  <!-- 搜索工作栏 -->
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="设备id" prop="deviceId">
        <el-input v-model="queryParams.deviceId" class="!w-240px" clearable placeholder="请输入设备id"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="任务id" prop="taskId">
        <el-input v-model="queryParams.taskId" class="!w-240px" clearable placeholder="请输入任务id"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="任务名" prop="taskName">
        <el-input v-model="queryParams.taskName" class="!w-240px" clearable placeholder="请输入任务名"
          @keyup.enter="handleQuery" />
      </el-form-item>

      <el-form-item>
        <el-button v-hasPermi="['device:query:task']" @click="handleQuery">
          <Icon class="mr-5px" icon="ep:search" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon class="mr-5px" icon="ep:refresh" />
          重置
        </el-button>
        <el-button v-hasPermi="['device:create:task']" plain type="primary" @click="openForm('create', {})">
          <Icon class="mr-5px" icon="ep:plus" />
          新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-if="refreshTable" v-loading="loading" :data="list" :default-expand-all="isExpandAll" row-key="id">
      <el-table-column :show-overflow-tooltip="true" label="设备id" prop="deviceId" />
      <el-table-column :show-overflow-tooltip="true" label="任务id" prop="taskId" />
      <el-table-column :show-overflow-tooltip="true" label="任务名" prop="taskName" />
      <el-table-column :show-overflow-tooltip="true" label="开始时间" prop="startTime" />
      <el-table-column :show-overflow-tooltip="true" label="返回点" prop="returnPoint" />
      <el-table-column :show-overflow-tooltip="true" label="循环天数" prop="cycleDays" />
      <el-table-column :show-overflow-tooltip="true" label="循环类型" prop="cycleType">
        <template #default="scope">
          <span v-if="scope.row.cycleType === 'EVERY_WEEK'">每周</span>
          <span v-else-if="scope.row.cycleType === 'ODD_WEEK'">单周</span>
          <span v-else-if="scope.row.cycleType === 'EVEN_WEEK'">双周</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column :show-overflow-tooltip="true" label="循环次数" prop="cycleCount" />
      <el-table-column :show-overflow-tooltip="true" label="执行模式" prop="executionMode">
        <template #default="scope">
          {{ scope.row.executionMode === 'IMMEDIATE' ? '立即执行' : '计划任务' }}
        </template>
      </el-table-column>
      <el-table-column :show-overflow-tooltip="true" label="是否激活" prop="active">
        <template #default="scope">
          {{ scope.row.active ? '激活' : '关闭' }}
        </template>
      </el-table-column>

      <el-table-column align="center" label="操作" width="240">
        <template #default="scope">
          <el-button v-hasPermi="['device:update:task']" link type="primary" @click="openForm('update', scope.row)">
            修改
          </el-button>
          <el-button v-hasPermi="['device:delete:task']" link type="danger" @click="handleDelete(scope.row.id)">
            删除
          </el-button>
          <el-button v-hasPermi="['device:instructions']" link type="primary" @click="handleOrder(scope.row)">
            下发指令
          </el-button>
          <el-button v-hasPermi="['device:query:task']" link type="primary" @click="handleDetail(scope.row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination v-model:limit="queryParams.pageSize" v-model:page="queryParams.pageNo" :total="total"
      @pagination="getList" />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <TaskForm ref="formRef" @success="getList" />
  <TaskDetail ref="detailRef" @success="getList" />
</template>
<script lang="ts" setup>
import * as ListApi from '@/api/car/task'
import TaskForm from './listForm.vue'
import TaskDetail from './detail.vue'
import { IssueInstructions } from '@/api/car/monitor'

defineOptions({ name: 'CarList' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗
const router = useRouter() // 路由对象
const route = useRoute()

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<any>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  deviceId: undefined,
  taskId: undefined,
  taskName: undefined
})
const queryFormRef = ref() // 搜索的表单
const isExpandAll = ref(false) // 是否展开，默认全部折叠
const refreshTable = ref(true) // 重新渲染表格状态

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ListApi.getTaskList(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, data: object) => {
  formRef.value.open(type, data)
}

/** 删除按钮操作 */
const handleDelete = async (id: string) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ListApi.deleteCar(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch { }
}

const detailRef = ref()
const handleDetail = (data: object) => {
  detailRef.value.open(data)
}

// 下发任务命令
const handleOrder = async (row) => {
  const { id, deviceId, ...rest } = row
  let params = {
    deviceId,
    type: '2010001',
    data: rest
  }
  const { code, data } = await IssueInstructions(params)
  console.log('code', code, data)
  if (code == 0) {
    message.success('下发成功')
  } else {
    message.warning('下发失败')
  }
}

/** 初始化 **/
onMounted(() => {
  console.log('router', router, route, route.query)
  if (route.query && route.query.deviceId) {
    queryParams.deviceId = route.query.deviceId
  }
  getList()
})
</script>