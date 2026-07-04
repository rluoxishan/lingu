<template>
  <doc-alert :title="t('view.urv.group.longTitle')" url="http://8.155.18.62:48080/doc.html#/all/%E7%AE%A1%E7%90%86%E5%90%8E%E5%8F%B0%20-%20%E9%9B%86%E5%9B%A2/createGroup"/>

  <!-- Search -->
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="80px"
    >
      <el-form-item :label="t('view.urv.group.data.tenantId')" prop="tenantId">
        <el-input
          v-model="queryParams.name"
          :placeholder="t('form.prompt_enter', { field: t('view.urv.group.data.tenantId').toLowerCase() })"
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
          @click="openForm('create')"
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
      <el-table-column :label="t('view.urv.group.data.name')" align="center" prop="name"/>
      <el-table-column :label="t('view.urv.group.data.tenantId')" align="center" prop="tenantId"/>
      <el-table-column
        :label="t('common.created_at')"
        align="center"
        prop="createTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column
        :label="t('common.updated_at')"
        align="center"
        prop="updateTime"
        width="180"
        :formatter="dateFormatter"
      />
      <el-table-column :label="t('form.btn_actions')" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
          >
            <!-- <el-button
              link
              type="primary"
              @click="openForm('update', scope.row.id)"
              v-hasPermi="['system:business:update']"
            > -->
            <Icon icon="ep:edit-pen"/>
            {{ t('action.update') }}
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
          >
            <!-- <el-button
              link
              type="danger"
              @click="handleDelete(scope.row.id)"
              v-hasPermi="['system:business:delete']"
            > -->
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

  <!-- Form Modal: Add/Edit -->
  <GroupForm ref="formRef" @success="getList"/>
</template>

<script lang="ts" setup>
import {dateFormatter} from '@/utils/formatTime'
import { GroupApi } from '@/api/urv/group'
import GroupForm from './GroupForm.vue'

defineOptions({name: 'GroupManagement'})

const { t } = useI18n()
const message = useMessage()

const loading = ref(false)
const total = ref(0)
const list = ref([])
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  groupId: undefined,
})
const queryFormRef = ref() // Form reference for the search filters

/** Fetch group list */
const getList = async () => {
  loading.value = true
  try {
    const {list: resultList, total: resultTotal} = await GroupApi.getGroupPage(queryParams)
    list.value = resultList
    total.value = resultTotal
  } finally {
    loading.value = false
  }
}

/** Search action */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** Reset action */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  getList()
}

/** Add/Edit action */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** Delete action */
const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await GroupApi.deleteGroup(id)
    message.success(t('common.delSuccess'))
    await getList()
  } catch {
  }
}

/** Initialize the list on component mount */
onMounted(() => {
  getList()
})
</script>
