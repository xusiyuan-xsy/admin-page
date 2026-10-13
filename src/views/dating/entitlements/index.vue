<template>
  <div class="app-container">
    <el-form inline @submit.prevent="search">
      <el-form-item label="客户编号"><el-input v-model="userIdInput" clearable style="width: 200px" @keyup.enter="search" /></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="entitlementId" label="权益编号" width="100" />
      <el-table-column prop="userName" label="客户" min-width="100" />
      <el-table-column prop="userId" label="客户编号" width="100" />
      <el-table-column prop="packageName" label="套餐" min-width="150" />
      <el-table-column prop="totalTimes" label="总次数" width="90" align="center" />
      <el-table-column prop="usedTimes" label="已用次数" width="95" align="center" />
      <el-table-column prop="remainingTimes" label="剩余次数" width="95" align="center" />
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ statuses[row.status] || row.status }}</el-tag></template></el-table-column>
      <el-table-column prop="createTime" label="开通时间" width="165" />
      <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-tooltip content="权益详情"><el-button icon="View" link aria-label="权益详情" @click="detail = row; open = true" /></el-tooltip></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
    <el-drawer v-model="open" title="权益详情" size="min(640px, 100vw)">
      <template v-if="detail">
        <el-descriptions :column="1" border class="mb8">
          <el-descriptions-item label="来源订单">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detail.userName }}</el-descriptions-item>
          <el-descriptions-item label="套餐">{{ detail.packageName }}</el-descriptions-item>
          <el-descriptions-item label="总次数 / 已用 / 剩余">{{ detail.totalTimes }} / {{ detail.usedTimes }} / {{ detail.remainingTimes }}</el-descriptions-item>
          <el-descriptions-item label="开通人">{{ detail.createBy }}</el-descriptions-item>
        </el-descriptions>
        <RuleSnapshot :snapshot="detail.ruleSnapshot" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="DatingEntitlements">
import { listEntitlements } from '@/api/dating/billing'
import RuleSnapshot from '../components/RuleSnapshot.vue'
const { proxy } = getCurrentInstance()
const statuses = { ACTIVE: '服务中', EXHAUSTED: '次数耗尽', SUCCESS_CLOSED: '成功结案' }
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const detail = ref(null)
const userIdInput = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, userId: undefined })
async function load() {
  loading.value = true
  try { const res = await listEntitlements(query); rows.value = res.rows; total.value = res.total }
  finally { loading.value = false }
}
function search() {
  if (userIdInput.value && !/^[1-9]\d*$/.test(userIdInput.value)) return proxy.$modal.msgWarning('客户编号必须为正整数')
  query.userId = userIdInput.value || undefined
  query.pageNum = 1
  load()
}
function reset() { userIdInput.value = ''; search() }
onMounted(load)
</script>
