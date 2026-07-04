<template>

  <!-- 搜索工作栏 -->
  <ContentWrap>
    <el-form ref="queryFormRef" :inline="true" :model="queryParams" class="-mb-15px" label-width="68px">
      <el-form-item label="店铺名称" prop="name">
        <el-input v-model="queryParams.name" class="!w-240px" clearable placeholder="请输入店铺名称"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="绑定车辆" prop="bindDevice">
        <el-input v-model="queryParams.bindDevice" class="!w-240px" clearable placeholder="请输入车辆信息"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button v-hasPermi="['store:query']" @click="handleQuery">
          <Icon class="mr-5px" icon="ep:search" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon class="mr-5px" icon="ep:refresh" />
          重置
        </el-button>
        <el-button v-hasPermi="['store:create']" plain type="primary" @click="openForm('create', {})">
          <Icon class="mr-5px" icon="ep:plus" />
          新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-if="refreshTable" v-loading="loading" :data="list" :default-expand-all="isExpandAll" row-key="id">
      <el-table-column :show-overflow-tooltip="true" label="店铺id" prop="id" />
      <el-table-column :show-overflow-tooltip="true" label="店铺名称" prop="name" />
      <el-table-column :show-overflow-tooltip="true" label="绑定车辆" prop="bindDevice" />
      <el-table-column align="center" label="操作">
        <template #default="scope">
          <el-button v-hasPermi="['store:update']" link type="primary" @click="openForm('update', scope.row)">
            修改
          </el-button>
          <el-button v-hasPermi="['store:delete']" link type="danger" @click="handleDelete(scope.row.id)">
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
  <ShopForm ref="formRef" @success="getList" />
</template>
<script lang="ts" setup>
import * as ShopApi from '@/api/mall/shop'
import { ShopVO } from '@/api/mall/shop'
import ShopForm from './shopForm.vue'
// import ListDetail from './detail.vue'

defineOptions({ name: 'ShopList' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<any>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  id: undefined,
  name: undefined,
  bindDevice: '',
})
const queryFormRef = ref() // 搜索的表单
const isExpandAll = ref(false) // 是否展开，默认全部折叠
const refreshTable = ref(true) // 重新渲染表格状态

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ShopApi.getShopList(queryParams)
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
    await ShopApi.deleteShop(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch { }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>