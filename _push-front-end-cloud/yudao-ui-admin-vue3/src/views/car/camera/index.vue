<template>
  <!-- 搜索工作栏 -->
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item>
        <el-button v-hasPermi="['camera:create']" plain type="primary"
          @click="openForm('create', { deviceId: queryParams.deviceId })">
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
      <el-table-column :show-overflow-tooltip="true" label="名称" prop="name" />
      <el-table-column :show-overflow-tooltip="true" label="信息" prop="info" />
      <el-table-column :show-overflow-tooltip="true" label="排序" prop="sort" />

      <el-table-column align="center" label="操作" width="240">
        <template #default="scope">
          <el-button v-hasPermi="['camera:update']" link type="primary" @click="openForm('update', scope.row)">
            修改
          </el-button>
          <el-button v-hasPermi="['camera:delete']" link type="danger" @click="handleDelete(scope.row.id)">
            删除
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
</template>
<script lang="ts" setup>
import * as CarmeraApi from '@/api/car/camera'
import TaskForm from './listForm.vue'
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
  name: undefined,
  info: undefined
})
const queryFormRef = ref() // 搜索的表单
const isExpandAll = ref(false) // 是否展开，默认全部折叠
const refreshTable = ref(true) // 重新渲染表格状态

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await CarmeraApi.getCameraList(queryParams)
    list.value = data
    total.value = data.length
  } finally {
    loading.value = false
  }
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
    await CarmeraApi.deleteCamera(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch { }
}

/** 初始化 **/
onMounted(() => {
  if (route.query && route.query.id) {
    queryParams.deviceId = route.query.id
  }
  getList()
})
</script>