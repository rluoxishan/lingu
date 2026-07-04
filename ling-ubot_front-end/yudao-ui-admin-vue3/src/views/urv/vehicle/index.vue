<template>
  <doc-alert :title="t('view.urv.vehicle.longTitle')" url="http://8.155.18.62:48080/doc.html#/all/%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0%20-%20%E5%95%86%E5%AE%B6/updateVehicle"/>

  <!-- Search -->
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="80px"
    >
      <el-form-item :label="t('view.urv.vehicle.data.name')" prop="name">
        <el-input
          v-model="queryParams.name"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.vehicle.data.name').toLowerCase()} )"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px"/>
          {{ t('action.search') }}
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px"/>
          {{ t('action.reset') }}
        </el-button>
        <el-button
          type="primary"
          plain
          @click="openAction('create')"
        >
          <Icon icon="ep:plus" class="mr-5px"/>
          {{ t('action.addNew') }}
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- List -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column :label="t('view.data.id')" align="center" prop="id"/>
      <el-table-column :label="t('view.urv.vehicle.data.name')" align="center" prop="name"/>
      <el-table-column :label="t('view.urv.vehicle.data.carSn')" align="center" prop="carSn"/>
      <el-table-column :label="t('view.urv.vehicle.data.enable')" align="center" prop="enable"/>
      <el-table-column :label="t('common.created_at')" align="center" prop="createTime" width="180" :formatter="dateFormatter"/>
      <el-table-column :label="t('form.btn_actions')" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openAction('view', scope.row.id)"
          >
            <Icon icon="fa:binoculars"/>
             {{ t('action.viewLive') }}
          </el-button>
          <el-button
            link
            type="info"
            @click="openAction('update', scope.row.id)"
          >
            <Icon icon="ep:edit-pen" />
            {{ t('action.update') }}
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
          >
            <Icon icon="fa:trash"/>
             {{ t('action.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- Pagination -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- Form Modal: Add/Edit/View -->
  <VehicleForm ref="formRef" @success="getList"/>
  <VehicleViewer ref="viewerRef" @success="getList"/>

</template>

<script lang="ts" setup>
import { dateFormatter } from '@/utils/formatTime'
import { VehicleApi } from '@/api/urv/vehicle'
import VehicleForm from './VehicleForm.vue'
import VehicleViewer from './VehicleViewer.vue'

defineOptions({ name: 'VehicleManagement' })

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const total = ref(0)
const list = ref([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  carSn: undefined,
  model: undefined
})
const queryFormRef = ref()

const getList = async () => {
  loading.value = true
  try {
    const { list: resultList, total: resultTotal } = await VehicleApi.getVehiclePage(queryParams)
    list.value = resultList
    total.value = resultTotal
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  getList()
}

const formRef = ref()
const viewerRef = ref()
const openAction = (type: string, id?: number) => {
  if(type == 'view') {
    viewerRef.value.open(type, id)
  } else {
    formRef.value.open(type, id)
  }
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await VehicleApi.deleteVehicle(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {

  }
}

onMounted(() => {
  getList()
})
</script>
