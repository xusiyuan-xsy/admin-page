<template>
  <div class="app-container recovery-workbench">
    <header class="workbench-heading"><h2>扣次异常工作台</h2><el-button icon="Refresh" :loading="tab === 'monitor' ? monitorLoading : loading" @click="refresh">刷新</el-button></header>
    <el-tabs v-model="tab" @tab-change="changeTab">
      <el-tab-pane label="异常任务" name="issues">
        <el-form inline class="issue-filters" @submit.prevent="search">
          <el-form-item label="配对编号"><el-input v-model="pairInput" inputmode="numeric" clearable aria-label="配对编号" @keyup.enter="search" /></el-form-item>
          <el-form-item label="异常类型"><el-select v-model="kind" clearable aria-label="异常类型"><el-option v-for="(label, value) in kindLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
          <el-form-item label="跟进进度"><el-select v-model="handling" clearable aria-label="跟进进度"><el-option v-for="(label, value) in handlingLabels" :key="value" :label="label" :value="value" /></el-select></el-form-item>
          <el-form-item><el-checkbox v-model="mine">我认领的</el-checkbox><el-checkbox v-model="overdueOnly">仅看跟进逾期</el-checkbox></el-form-item>
          <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
        </el-form>
        <el-alert v-if="failed" title="异常任务加载失败或无权访问" type="error" show-icon :closable="false" />
        <el-table v-else v-loading="loading" :data="rows" empty-text="暂无可见异常任务">
          <el-table-column prop="taskId" label="任务" width="80" />
          <el-table-column label="配对" min-width="180"><template #default="{ row }"><div>#{{ row.pairId }}</div><span>{{ row.lowName }} / {{ row.highName }}</span></template></el-table-column>
          <el-table-column label="扣次客户" min-width="130"><template #default="{ row }">{{ row.customerName }} <small>#{{ row.userId }}</small></template></el-table-column>
          <el-table-column prop="ownerName" label="负责红娘" min-width="110" />
          <el-table-column label="异常跟进" min-width="150"><template #default="{ row }"><div>{{ row.handlerName || '未认领' }}</div><small>{{ handlingLabels[row.handlingStatus] || '未认领' }}</small></template></el-table-column>
          <el-table-column label="跟进截止" width="180"><template #default="{ row }"><div>{{ row.dueAt || '-' }}</div><el-tag v-if="row.followupOverdue" type="danger" size="small">已逾期</el-tag></template></el-table-column>
          <el-table-column label="类型" width="140"><template #default="{ row }"><el-tag :type="issueKind(row) === 'ERROR' ? 'danger' : issueKind(row) === 'BLOCKED' ? 'warning' : 'info'">{{ kindLabels[issueKind(row)] }}</el-tag></template></el-table-column>
          <el-table-column prop="attempts" label="失败次数" width="90" />
          <el-table-column label="异常原因" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ issueKind(row) === 'BLOCKED' ? row.blockedReason || '业务条件受阻' : errorLabels[row.errorCode] || '任务处理超时' }}</template></el-table-column>
          <el-table-column prop="firstFailureAt" label="首次技术失败" width="170" />
          <el-table-column prop="lastFailureAt" label="最近技术失败" width="170" />
          <el-table-column label="下次自动处理" width="170"><template #default="{ row }">{{ row.status === 'READY' ? row.nextAttemptAt : '-' }}</template></el-table-column>
          <el-table-column label="操作" width="158" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="配对详情"><el-button link type="primary" icon="View" aria-label="配对详情" @click="openPair(row)" v-hasPermi="['dating:match:list']" /></el-tooltip>
              <el-tooltip content="处理历史"><el-button link type="primary" icon="Clock" aria-label="处理历史" @click="history.open(row)" /></el-tooltip>
              <el-tooltip content="责任跟进"><el-button link type="primary" icon="User" aria-label="责任跟进" @click="followup.open(row)" /></el-tooltip>
              <el-tooltip :content="row.retryAllowed ? '重新核算扣次' : '当前任务不可人工重试'"><span v-hasPermi="['dating:deduction:retry']"><el-button link type="warning" icon="RefreshRight" aria-label="重新核算扣次" :disabled="!row.retryAllowed" @click="retryDialog.open(row)" /></span></el-tooltip>
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="!failed && total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
      </el-tab-pane>
      <el-tab-pane v-if="canMonitor" label="恢复监控" name="monitor">
        <el-alert v-if="monitorFailed" title="恢复监控加载失败或无权访问" type="error" :closable="false" show-icon />
        <section v-else v-loading="monitorLoading">
          <template v-if="overview">
            <div class="monitor-heading"><el-tag :type="overview.health === 'SUCCEEDED' ? 'success' : 'warning'">{{ healthLabels[overview.health] || '状态未知' }}</el-tag><span>最近调度：{{ overview.lastRun?.startedAt || '-' }}</span></div>
            <dl class="queue-counts">
              <div v-for="(label, key) in queueLabels" :key="key"><dt>{{ label }}</dt><dd>{{ overview.queue[key] }}</dd></div>
              <div><dt>历史未结束批次</dt><dd>{{ overview.staleRuns }}</dd></div>
            </dl>
          </template>
          <h3>恢复批次</h3>
          <el-table :data="runs" empty-text="暂无恢复批次">
            <el-table-column prop="runId" label="批次编号" min-width="240" show-overflow-tooltip />
            <el-table-column prop="startedAt" label="开始时间" width="170" />
            <el-table-column prop="finishedAt" label="结束时间" width="170" />
            <el-table-column label="状态" width="100"><template #default="{ row }">{{ healthLabels[row.status] || '状态未知' }}</template></el-table-column>
            <el-table-column prop="scanned" label="扫描" width="80" />
            <el-table-column prop="processed" label="已处理" width="80" />
            <el-table-column prop="failed" label="失败" width="80" />
            <el-table-column prop="recordFailures" label="留痕失败" width="100" />
            <el-table-column label="失败分类" min-width="160"><template #default="{ row }">{{ errorLabels[row.errorCode] || '-' }}</template></el-table-column>
          </el-table>
          <pagination v-show="runTotal > 0" :total="runTotal" v-model:page="runQuery.pageNum" v-model:limit="runQuery.pageSize" @pagination="loadMonitor" />
        </section>
      </el-tab-pane>
    </el-tabs>
    <TaskHistory ref="history" @changed="load" />
    <FollowupDrawer ref="followup" @changed="load" />
    <RetryDialog ref="retryDialog" @retried="load" />
  </div>
</template>

<script setup name="DatingRecovery">
import { ElMessage } from 'element-plus'
import { checkPermi } from '@/utils/permission'
import { listExceptions, recoveryOverview, recoveryRuns } from '@/api/dating/recovery'
import TaskHistory from './TaskHistory.vue'
import RetryDialog from './RetryDialog.vue'
import FollowupDrawer from './FollowupDrawer.vue'
import { errorLabels, healthLabels, kindLabels, issueKind } from './labels'
const router = useRouter()
const route = useRoute()
const tab = ref('issues')
const canMonitor = computed(() => checkPermi(['dating:recovery:query']))
const pairInput = ref(typeof route.query.pairId === 'string' && /^[1-9]\d*$/.test(route.query.pairId) ? route.query.pairId : '')
const kind = ref('')
const handling = ref('')
const mine = ref(false)
const overdueOnly = ref(false)
const handlingLabels = { UNASSIGNED: '未认领', IN_PROGRESS: '处理中', WAITING: '等待处理' }
const query = reactive({ pageNum: 1, pageSize: 10, pairId: pairInput.value || undefined, kind: undefined })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const failed = ref(false)
const history = ref()
const followup = ref()
const retryDialog = ref()
const overview = ref(null)
const runs = ref([])
const runTotal = ref(0)
const runQuery = reactive({ pageNum: 1, pageSize: 10 })
const monitorLoading = ref(false)
const monitorFailed = ref(false)
const queueLabels = { ready: '待处理', due: '已到处理时间', overdue: '处理超时', errors: '技术异常', blocked: '业务受阻', pending: '服务条件待满足' }
let request = 0
let monitorRequest = 0
async function load() {
  const current = ++request
  loading.value = true
  failed.value = false
  rows.value = []
  try {
    const res = await listExceptions({ ...query })
    if (current === request) {
      rows.value = res.rows; total.value = res.total
      if (!rows.value.length && total.value > 0 && query.pageNum > 1) {
        query.pageNum = Math.ceil(total.value / query.pageSize)
        return load()
      }
    }
  } catch { if (current === request) failed.value = true }
  finally { if (current === request) loading.value = false }
}
function search() {
  const pair = pairInput.value.trim()
  if (pair && (!/^[1-9]\d*$/.test(pair) || pair.length > 18)) return ElMessage.warning('配对编号须为18位以内的正整数')
  Object.assign(query, { pageNum: 1, pairId: pair || undefined, kind: kind.value || undefined,
    handling: handling.value || undefined, mine: mine.value, overdueOnly: overdueOnly.value })
  load()
}
function reset() { pairInput.value = ''; kind.value = ''; handling.value = ''; mine.value = false; overdueOnly.value = false; search() }
function openPair(row) { router.push({ path: '/dating/matches', query: { pairId: row.pairId } }) }
async function loadMonitor() {
  if (!canMonitor.value) return
  const current = ++monitorRequest
  monitorLoading.value = true
  monitorFailed.value = false
  overview.value = null
  runs.value = []
  try {
    const [summary, batches] = await Promise.all([recoveryOverview(), recoveryRuns({ ...runQuery })])
    if (current === monitorRequest) { overview.value = summary.data; runs.value = batches.rows; runTotal.value = batches.total }
  } catch { if (current === monitorRequest) monitorFailed.value = true }
  finally { if (current === monitorRequest) monitorLoading.value = false }
}
function changeTab(value) { if (value === 'monitor') loadMonitor() }
function refresh() { return tab.value === 'monitor' ? loadMonitor() : load() }
onMounted(load)
onBeforeUnmount(() => { request++; monitorRequest++ })
</script>

<style scoped>
.recovery-workbench { min-width: 0; }
.workbench-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
h2 { margin: 0; font-size: 18px; line-height: 1.5; }
h3 { font-size: 15px; margin: 20px 0 14px; }
.issue-filters .el-input, .issue-filters .el-select { width: 190px; }
.monitor-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; font-size: 13px; margin: 16px 0; }
.queue-counts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--el-border-color-lighter); }
.queue-counts dt { font-size: 13px; color: var(--el-text-color-secondary); }
.queue-counts dd { margin: 8px 0 0; font-size: 22px; }
small { color: var(--el-text-color-secondary); }
@media (max-width: 600px) {
  .issue-filters .el-form-item { display: flex; margin-right: 0; }
  .issue-filters .el-input, .issue-filters .el-select { width: 100%; min-width: 0; }
  .workbench-heading h2 { font-size: 16px; }
}
</style>
