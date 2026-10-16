<template>
  <div class="app-container">
    <el-form inline @submit.prevent="search">
      <el-form-item label="客户编号"><el-input v-model="userIdInput" clearable style="width: 200px" @keyup.enter="search" /></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
      <el-form-item><el-button icon="DocumentChecked" @click="checkIntegrity" :loading="checking">一致性检查</el-button></el-form-item>
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
      <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-tooltip content="权益详情"><el-button icon="View" link aria-label="权益详情" @click="showDetail(row)" /></el-tooltip></template></el-table-column>
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
        <el-alert v-for="issue in detailIssues" :key="`${issue.code}-${issue.orderId}`" :title="issueLabels[issue.code] || issue.code" type="error" :closable="false" class="mb8" />
        <el-table :data="ledger">
          <el-table-column prop="ledgerId" label="流水编号" width="90" />
          <el-table-column prop="entryType" label="类型" width="90" />
          <el-table-column prop="delta" label="变动" width="70" />
          <el-table-column prop="balanceBefore" label="变动前" width="80" />
          <el-table-column prop="balanceAfter" label="变动后" width="80" />
          <el-table-column prop="pairId" label="配对编号" width="90" />
          <el-table-column prop="eventId" label="事实编号" width="90" />
          <el-table-column prop="createBy" label="操作人" min-width="130" />
          <el-table-column prop="createTime" label="时间" min-width="180" />
        </el-table>
      </template>
    </el-drawer>
    <el-dialog v-model="issuesOpen" title="一致性检查结果" width="800px" style="max-width: 94vw">
      <el-alert v-if="issueError" title="一致性检查失败，请稍后重试" type="error" :closable="false" />
      <el-table :data="issues" v-loading="checking" :empty-text="issueError ? '检查未完成' : '当前范围未发现异常'">
        <el-table-column prop="userId" label="客户编号" width="100" />
        <el-table-column prop="orderId" label="订单编号" width="100" />
        <el-table-column prop="entitlementId" label="权益编号" width="100" />
        <el-table-column label="异常"><template #default="{ row }">{{ issueLabels[row.code] || row.code }}</template></el-table-column>
      </el-table>
      <pagination v-show="issueTotal > 0" :total="issueTotal" v-model:page="issueQuery.pageNum" v-model:limit="issueQuery.pageSize" @pagination="loadIssues" />
    </el-dialog>
  </div>
</template>

<script setup name="DatingEntitlements">
import { listEntitlements, getEntitlement, listIntegrityIssues } from '@/api/dating/billing'
import RuleSnapshot from '../components/RuleSnapshot.vue'
const { proxy } = getCurrentInstance()
const statuses = { ACTIVE: '服务中', EXHAUSTED: '次数耗尽', SUCCESS_CLOSED: '成功结案' }
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const open = ref(false)
const detail = ref(null)
const ledger = ref([])
const detailIssues = ref([])
const issues = ref([])
const issueTotal = ref(0)
const issuesOpen = ref(false)
const checking = ref(false)
const issueError = ref(false)
const issueQuery = reactive({ pageNum: 1, pageSize: 10, userId: undefined })
const issueLabels = { BALANCE_LEDGER: '权益余额与流水不一致', ORDER_PAYMENT: '订单、收款与权益不一致', SERVICE_STATUS: '客户服务状态与业务记录不一致' }
const userIdInput = ref('')
const query = reactive({ pageNum: 1, pageSize: 10, userId: undefined })
async function showDetail(row) {
  const { data } = await getEntitlement(row.entitlementId)
  detail.value = data.entitlement
  ledger.value = data.ledger
  detailIssues.value = data.issues
  open.value = true
}
async function loadIssues() {
  checking.value = true
  issueError.value = false
  issues.value = []
  issueTotal.value = 0
  try {
    const res = await listIntegrityIssues(issueQuery)
    issues.value = res.rows
    issueTotal.value = res.total
  } catch {
    issueError.value = true
  } finally { checking.value = false }
}
async function checkIntegrity() {
  if (userIdInput.value && !/^[1-9]\d*$/.test(userIdInput.value)) return proxy.$modal.msgWarning('客户编号必须为正整数')
  issueQuery.userId = userIdInput.value || undefined
  issueQuery.pageNum = 1
  await loadIssues()
  issuesOpen.value = true
}
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
