<template>
  <div class="app-container dating-matches">
    <el-form inline @submit.prevent="search">
      <el-form-item label="客户"><el-input v-model="query.keyword" clearable placeholder="客户姓名" @keyup.enter="search" /></el-form-item>
      <el-form-item label="配对进度"><el-select v-model="query.progress" clearable style="width: 150px"><el-option v-for="(label, value) in progresses" :key="value" :label="label" :value="value" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-button class="mb8" type="primary" plain icon="Plus" @click="openRecommend" v-hasPermi="['dating:match:add']">创建推荐</el-button>
    <el-button class="mb8" icon="Warning" @click="$router.push('/dating/recovery/index')" v-hasPermi="['dating:match:query']">扣次异常工作台</el-button>
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="pairId" label="配对编号" width="100" />
      <el-table-column prop="lowName" label="客户一" min-width="130" />
      <el-table-column prop="highName" label="客户二" min-width="130" />
      <el-table-column label="进度" width="130"><template #default="{ row }"><el-tag :type="row.progress === 'REJECTED' ? 'info' : 'primary'">{{ progresses[row.progress] || row.progress }}</el-tag></template></el-table-column>
      <el-table-column prop="createBy" label="创建人" width="110" />
      <el-table-column prop="createTime" label="建立时间" width="165" />
      <el-table-column label="操作" width="85" fixed="right"><template #default="{ row }"><el-tooltip content="配对详情"><el-button link type="primary" icon="View" aria-label="配对详情" @click="showDetail(row.pairId)" v-hasPermi="['dating:match:query']" /></el-tooltip></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-drawer v-model="detailOpen" :title="detail ? `${detail.pair.lowName} / ${detail.pair.highName} · 配对 #${detail.pair.pairId}` : '配对详情'" size="min(1060px, 100vw)" class="dating-pair-drawer">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="pair-toolbar">
            <el-tag>{{ progresses[detail.pair.progress] }}</el-tag>
            <el-tooltip content="刷新记录"><el-button icon="Refresh" circle aria-label="刷新记录" @click="refreshDetail" /></el-tooltip>
            <el-button type="primary" icon="EditPen" :disabled="!inProgress" @click="openAction('event')" v-hasPermi="['dating:event:add']">登记服务事实</el-button>
            <el-button icon="Calendar" :disabled="!canArrange" @click="openAction('schedule')" v-hasPermi="['dating:appointment:add']">安排见面</el-button>
            <el-tooltip :content="successEnabled ? '登记成功脱单并结案' : '结案未启用，需先确认业务核实标准'">
              <span v-hasPermi="['dating:success:close']"><el-button type="success" icon="CircleCheck" :disabled="isClosed || !successEnabled || !inProgress" @click="openAction('success')">成功结案</el-button></span>
            </el-tooltip>
          </div>
          <div class="participants">
            <section v-for="p in detail.participants" :key="p.userId" class="participant">
              <div class="participant-heading"><h3>{{ p.name }} <small>#{{ p.userId }}</small></h3><el-tag :type="p.deductStatus === 'DEDUCTED' ? 'success' : p.deductStatus === 'BLOCKED' ? 'danger' : 'warning'">{{ deductionStatuses[p.deductStatus] }}</el-tag></div>
              <dl class="participant-facts">
                <div><dt>服务状态</dt><dd>{{ serviceStatuses[p.serviceStatus] }}</dd></div>
                <div><dt>绑定权益</dt><dd>#{{ p.entitlementId }}</dd></div>
                <div><dt>绑定权益余次</dt><dd>{{ p.remainingTimes }}</dd></div>
              </dl>
              <el-table :data="optionsFor(p)" size="small">
                <el-table-column prop="name" label="所选服务条件" min-width="110" />
                <el-table-column prop="completionStandard" label="核实标准" min-width="160" show-overflow-tooltip />
                <el-table-column label="结果" width="80"><template #default="{ row }"><el-tag size="small" :type="completedCodes.has(row.code) ? 'success' : 'info'">{{ completedCodes.has(row.code) ? '已满足' : '待完成' }}</el-tag></template></el-table-column>
              </el-table>
              <p v-if="p.blockedReason" class="blocked-reason">{{ p.blockedReason }}</p>
            </section>
          </div>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="推荐与意向" name="recommendations">
              <div v-if="latest" class="intentions">
                <div v-for="(person, i) in detail.participants" :key="person.userId" class="intention-row">
                  <span>{{ person.name }}</span><el-tag :type="intentionOf(i) === 'WILLING' ? 'success' : 'info'">{{ intentions[intentionOf(i)] }}</el-tag>
                  <el-button link type="primary" icon="Edit" :disabled="isClosed" @click="openAction('intention', person)" v-hasPermi="['dating:match:intention']">登记意向</el-button>
                </div>
              </div>
              <el-table :data="detail.recommendations">
                <el-table-column prop="id" label="推荐编号" width="100" />
                <el-table-column prop="reason" label="推荐理由" min-width="220" show-overflow-tooltip />
                <el-table-column label="客户一意向" width="110"><template #default="{ row }">{{ intentions[row.lowIntention] }}</template></el-table-column>
                <el-table-column label="客户二意向" width="110"><template #default="{ row }">{{ intentions[row.highIntention] }}</template></el-table-column>
                <el-table-column prop="createBy" label="操作人" width="100" />
                <el-table-column prop="createTime" label="推荐时间" width="165" />
              </el-table>
              <h3 class="section-title">意向记录</h3>
              <el-table :data="detail.intentions" size="small">
                <el-table-column label="客户" width="110"><template #default="{ row }">{{ nameOf(row.userId) }}</template></el-table-column>
                <el-table-column label="意向" width="90"><template #default="{ row }">{{ intentions[row.intention] }}</template></el-table-column>
                <el-table-column prop="reason" label="沟通记录" min-width="220" show-overflow-tooltip />
                <el-table-column prop="createBy" label="操作人" width="100" />
                <el-table-column prop="createTime" label="登记时间" width="165" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="见面记录" name="appointments">
              <el-table :data="detail.appointments">
                <el-table-column prop="appointmentId" label="编号" width="75" />
                <el-table-column prop="plannedAt" label="预约时间" width="165" />
                <el-table-column prop="place" label="地点" min-width="160" show-overflow-tooltip />
                <el-table-column label="状态" width="90"><template #default="{ row }">{{ appointmentStatuses[row.status] }}</template></el-table-column>
                <el-table-column prop="completedAt" label="完成时间" width="165" />
                <el-table-column label="操作" width="160" fixed="right">
                  <template #default="{ row }">
                    <template v-if="row.status === 'SCHEDULED' && !isClosed">
                      <el-tooltip content="改期"><el-button link icon="Calendar" aria-label="改期" :disabled="!canArrange" @click="openAction('reschedule', row)" v-hasPermi="['dating:appointment:edit']" /></el-tooltip>
                      <el-tooltip content="确认见面完成"><el-button link type="success" icon="Check" aria-label="确认见面完成" :disabled="!inProgress" @click="openAction('COMPLETE', row)" v-hasPermi="['dating:appointment:edit']" /></el-tooltip>
                      <el-tooltip content="取消见面"><el-button link type="danger" icon="Close" aria-label="取消见面" @click="openAction('CANCEL', row)" v-hasPermi="['dating:appointment:edit']" /></el-tooltip>
                      <el-tooltip content="登记爽约"><el-button link type="warning" icon="Warning" aria-label="登记爽约" @click="openAction('NO_SHOW', row)" v-hasPermi="['dating:appointment:edit']" /></el-tooltip>
                    </template>
                  </template>
                </el-table-column>
              </el-table>
              <h3 class="section-title">变更记录</h3>
              <el-table :data="detail.appointmentHistory" size="small">
                <el-table-column prop="appointmentId" label="见面编号" width="90" />
                <el-table-column label="动作" width="90"><template #default="{ row }">{{ actionLabels[row.action] }}</template></el-table-column>
                <el-table-column prop="plannedAt" label="预约时间" width="165" />
                <el-table-column prop="place" label="地点" min-width="140" />
                <el-table-column prop="reason" label="原因 / 结果" min-width="180" show-overflow-tooltip />
                <el-table-column prop="createBy" label="操作人" width="100" />
                <el-table-column prop="createTime" label="登记时间" width="165" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="服务事实" name="events">
              <el-table :data="detail.events">
                <el-table-column prop="eventId" label="编号" width="75" />
                <el-table-column label="服务选项" min-width="130"><template #default="{ row }">{{ optionName(row.optionCode) }}</template></el-table-column>
                <el-table-column prop="occurredAt" label="实际发生时间" width="165" />
                <el-table-column prop="note" label="核实记录" min-width="180" show-overflow-tooltip />
                <el-table-column prop="evidence" label="凭证编号" min-width="140" show-overflow-tooltip />
                <el-table-column prop="createBy" label="登记人" width="100" />
                <el-table-column prop="createTime" label="登记时间" width="165" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="扣次与流水" name="deductions">
              <el-table :data="detail.tasks">
                <el-table-column prop="taskId" label="任务" width="75" />
                <el-table-column label="客户" width="110"><template #default="{ row }">{{ nameOf(row.userId) }}</template></el-table-column>
                <el-table-column prop="eventId" label="事实编号" width="95" />
                <el-table-column label="处理状态" width="105"><template #default="{ row }">{{ taskStatuses[row.status] }}</template></el-table-column>
                <el-table-column label="处理结果" width="110"><template #default="{ row }">{{ deductionStatuses[row.outcome] || '-' }}</template></el-table-column>
                <el-table-column prop="attempts" label="失败次数" width="95" />
                <el-table-column prop="lastError" label="异常信息" min-width="160" show-overflow-tooltip />
                <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }">
                  <el-tooltip content="处理历史"><el-button link type="primary" icon="Clock" aria-label="处理历史" @click="taskHistory.open(row)" /></el-tooltip>
                  <el-tooltip content="重试扣次"><el-button v-if="row.status === 'ERROR' || (row.status === 'DONE' && row.outcome === 'BLOCKED')" link type="primary" icon="RefreshRight" aria-label="重试扣次" :disabled="isClosed || saving" @click="retryDialog.open({ ...row, customerName: nameOf(row.userId) })" v-hasPermi="['dating:deduction:retry']" /></el-tooltip>
                </template></el-table-column>
              </el-table>
              <h3 class="section-title">扣次流水</h3>
              <el-table :data="detail.ledger">
                <el-table-column prop="ledgerId" label="流水编号" width="95" />
                <el-table-column label="客户" width="110"><template #default="{ row }">{{ nameOf(row.userId) }}</template></el-table-column>
                <el-table-column prop="entitlementId" label="权益编号" width="95" />
                <el-table-column prop="delta" label="变动次数" width="95" />
                <el-table-column prop="balanceBefore" label="扣前余次" width="95" />
                <el-table-column prop="balanceAfter" label="扣后余次" width="95" />
                <el-table-column prop="eventId" label="触发事实" width="95" />
                <el-table-column prop="createTime" label="扣次时间" width="165" />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </template>
      </div>
    </el-drawer>
    <TaskHistory ref="taskHistory" />
    <RetryDialog ref="retryDialog" @retried="refreshDetail" />

    <el-dialog v-model="dialogOpen" :title="dialogTitle" width="620px" style="max-width: 94vw" :close-on-click-modal="false" append-to-body class="dating-workflow-dialog">
      <el-form ref="formRef" :model="draft" :rules="formRules" :validate-on-rule-change="false" label-width="106px">
        <template v-if="mode === 'recommend'">
          <el-form-item v-for="(field, index) in ['firstUserId', 'secondUserId']" :key="field" :label="index === 0 ? '客户一' : '客户二'" :prop="field">
            <el-select v-model="draft[field]" remote filterable :remote-method="keyword => searchCustomers(keyword, index)" :loading="customerLoading[index]" placeholder="搜索已开通服务的客户" style="width: 100%" @visible-change="v => v && searchCustomers('', index)">
              <el-option v-for="c in customers[index]" :key="c.userId" :value="c.userId" :label="`${c.name} / #${c.userId} / ${c.matchmakerName || '未分配'}`" :disabled="!c.matchmakerId || c.status !== '0' || !c.remainingTimes || c.userId === draft[index === 0 ? 'secondUserId' : 'firstUserId']" />
            </el-select>
          </el-form-item>
        </template>
        <template v-else-if="mode === 'intention'">
          <el-form-item label="客户">{{ target?.name }}</el-form-item>
          <el-form-item label="意向" prop="intention"><el-radio-group v-model="draft.intention"><el-radio-button value="WILLING">愿意继续</el-radio-button><el-radio-button value="REJECTED">不愿继续</el-radio-button></el-radio-group></el-form-item>
        </template>
        <template v-else-if="mode === 'event'">
          <el-form-item label="服务选项" prop="optionCode"><el-select v-model="draft.optionCode" style="width: 100%"><el-option v-for="o in manualOptions" :key="o.code" :label="o.name" :value="o.code" /></el-select></el-form-item>
          <el-form-item v-if="selectedOption" label="核实标准"><span class="standard">{{ selectedOption.completionStandard }}</span></el-form-item>
        </template>
        <template v-else-if="mode === 'success'">
          <el-form-item label="脱单确认时间" prop="occurredAt"><el-date-picker v-model="draft.occurredAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :disabled-date="date => date.getTime() > Date.now()" style="width: 100%" /></el-form-item>
          <el-form-item label="确认凭证编号" prop="evidence"><el-input v-model="draft.evidence" maxlength="200" /></el-form-item>
          <el-form-item label="双方确认" prop="bothConfirmed"><el-checkbox v-model="draft.bothConfirmed">双方已确认通过本次红娘服务脱单</el-checkbox></el-form-item>
        </template>
        <template v-if="['schedule', 'reschedule'].includes(mode)">
          <el-form-item label="预约时间" prop="plannedAt"><el-date-picker v-model="draft.plannedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></el-form-item>
          <el-form-item label="见面地点" prop="place"><el-input v-model="draft.place" maxlength="200" /></el-form-item>
          <el-form-item label="双方确认" prop="bothConfirmed"><el-checkbox v-model="draft.bothConfirmed">双方已确认本次见面安排</el-checkbox></el-form-item>
        </template>
        <template v-if="['event', 'COMPLETE'].includes(mode)">
          <el-form-item label="实际发生时间" prop="occurredAt"><el-date-picker v-model="draft.occurredAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :disabled-date="date => date.getTime() > Date.now()" style="width: 100%" /></el-form-item>
          <el-form-item label="凭证编号"><el-input v-model="draft.evidence" maxlength="200" /></el-form-item>
        </template>
        <el-form-item :label="mode === 'success' ? '脱单核实记录' : mode === 'recommend' ? '推荐理由' : mode === 'event' || mode === 'COMPLETE' ? '核实记录' : '沟通 / 原因'" prop="reason"><el-input v-model="draft.reason" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogOpen = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="submit">确认保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="DatingMatches">
import * as api from '@/api/dating/workflow'
import { successPolicy, closeSuccess } from '@/api/dating/success'
import { checkPermi } from '@/utils/permission'
import TaskHistory from '../recovery/TaskHistory.vue'
import RetryDialog from '../recovery/RetryDialog.vue'
const taskHistory = ref()
const retryDialog = ref()
const { proxy } = getCurrentInstance()
const progresses = { COMMUNICATING: '沟通意向中', IN_PROGRESS: '双方已同意', FOLLOWING: '服务跟进中', REJECTED: '暂不继续', SUCCESS_CLOSED: '成功结案', TERMINATED: '已终止' }
const serviceStatuses = { NOT_STARTED: '未开通', SERVING: '服务中', NOT_RENEWED: '未续单', SUCCESS_CLOSED: '成功结案' }
const deductionStatuses = { PENDING: '条件未全部满足', DEDUCTED: '已扣次', BLOCKED: '扣次受阻', STOPPED: '已停止扣次' }
const intentions = { PENDING: '待沟通', WILLING: '愿意继续', REJECTED: '不愿继续' }
const appointmentStatuses = { SCHEDULED: '待见面', COMPLETED: '已完成', CANCELLED: '已取消', NO_SHOW: '已爽约', TERMINATED: '已终止' }
const actionLabels = { SCHEDULE: '预约', RESCHEDULE: '改期', COMPLETE: '完成', CANCEL: '取消', NO_SHOW: '爽约', TERMINATE: '结案终止' }
const taskStatuses = { READY: '等待处理', DONE: '处理完成', ERROR: '处理异常', CANCELLED: '已终止' }
const successEnabled = ref(false)
const route = useRoute()
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', progress: '' })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const detail = ref(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
const activeTab = ref('recommendations')
const dialogOpen = ref(false)
const mode = ref('')
const target = ref(null)
const draft = ref({})
const saving = ref(false)
const formRef = ref()
const customers = ref([[], []])
const customerLoading = ref([false, false])
const customerRequests = [0, 0]
const requestKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
const isClosed = computed(() => ['SUCCESS_CLOSED', 'TERMINATED'].includes(detail.value?.pair.progress))
const inProgress = computed(() => ['IN_PROGRESS', 'FOLLOWING'].includes(detail.value?.pair.progress))
const canArrange = computed(() => inProgress.value && detail.value?.participants.every(p => p.serviceStatus === 'SERVING' && (p.remainingTimes > 0 || p.deductStatus === 'DEDUCTED')))
const latest = computed(() => detail.value?.recommendations[0])
const completedCodes = computed(() => new Set(detail.value?.events.map(e => e.optionCode) || []))
function optionsFor(p) { try { return JSON.parse(p.ruleSnapshot).options || [] } catch { return [] } }
const allOptions = computed(() => {
  const options = new Map()
  for (const p of detail.value?.participants || []) {
    for (const o of optionsFor(p)) {
      const old = options.get(o.code)
      options.set(o.code, old ? { ...old, completionStandard: `${old.completionStandard}；${p.name}：${o.completionStandard}` }
        : { ...o, completionStandard: `${p.name}：${o.completionStandard}` })
    }
  }
  return [...options.values()]
})
const manualOptions = computed(() => allOptions.value.filter(o => o.code !== 'MEETING_COMPLETED'))
const selectedOption = computed(() => manualOptions.value.find(o => o.code === draft.value.optionCode))
const optionName = code => allOptions.value.find(o => o.code === code)?.name || (code === 'MEETING_COMPLETED' ? '完成见面' : code)
const nameOf = id => detail.value?.participants.find(p => p.userId === id)?.name || `#${id}`
const intentionOf = i => latest.value?.[i === 0 ? 'lowIntention' : 'highIntention'] || 'PENDING'
const dialogTitle = computed(() => ({ recommend: '创建推荐', intention: '登记意向', event: '登记服务事实', schedule: '安排见面', reschedule: '见面改期', COMPLETE: '确认见面完成', CANCEL: '取消见面', NO_SHOW: '登记爽约', success: '登记成功脱单' })[mode.value])
const required = message => [{ required: true, message, trigger: 'change' }]
const formRules = computed(() => {
  const rules = { reason: [{ required: true, whitespace: true, message: '请输入记录内容', trigger: 'blur' }] }
  if (mode.value === 'recommend') { rules.firstUserId = required('请选择客户一'); rules.secondUserId = required('请选择客户二') }
  if (mode.value === 'intention') rules.intention = required('请选择意向')
  if (mode.value === 'event') rules.optionCode = required('请选择服务选项')
  if (['schedule', 'reschedule'].includes(mode.value)) {
    rules.plannedAt = [{ validator: (_, v, cb) => time(v) > Date.now() ? cb() : cb(new Error('预约时间必须晚于当前时间')), trigger: 'change' }]
    rules.place = [{ required: true, whitespace: true, message: '请输入见面地点', trigger: 'blur' }]
    rules.bothConfirmed = [{ validator: (_, v, cb) => v ? cb() : cb(new Error('请核实双方均已确认')), trigger: 'change' }]
  }
  if (['event', 'COMPLETE', 'success'].includes(mode.value)) rules.occurredAt = [{ validator: (_, v, cb) => v && time(v) <= Date.now() ? cb() : cb(new Error('实际时间不能为空或晚于当前时间')), trigger: 'change' }]
  if (mode.value === 'success') {
    rules.evidence = [{ required: true, whitespace: true, message: '请输入双方确认凭证编号', trigger: 'blur' }]
    rules.bothConfirmed = [{ validator: (_, v, cb) => v === true ? cb() : cb(new Error('请核实双方均已确认脱单')), trigger: 'change' }]
  }
  return rules
})
const time = value => value ? new Date(value.replace(' ', 'T')).getTime() : NaN
let loadRequest = 0
async function load() {
  const current = ++loadRequest
  loading.value = true
  try { const res = await api.listMatches(query); if (current === loadRequest) { rows.value = res.rows; total.value = res.total } }
  finally { if (current === loadRequest) loading.value = false }
}
function search() { query.pageNum = 1; load() }
function reset() { Object.assign(query, { pageNum: 1, keyword: '', progress: '' }); load() }
let detailRequest = 0
async function showDetail(id, resetTab = true) {
  const current = ++detailRequest
  detailLoading.value = true
  detailOpen.value = true
  if (resetTab) { activeTab.value = 'recommendations'; detail.value = null }
  try { const res = await api.getMatch(id); if (current === detailRequest) detail.value = res.data }
  finally { if (current === detailRequest) detailLoading.value = false }
}
function refreshDetail() { if (detail.value) return showDetail(detail.value.pair.pairId, false) }
async function searchCustomers(keyword, index) {
  const current = ++customerRequests[index]
  customerLoading.value[index] = true
  try {
    const res = await api.listAssignments({ keyword, serviceStatus: 'SERVING', pageNum: 1, pageSize: 30 })
    if (current === customerRequests[index]) customers.value[index] = res.rows
  } finally { if (current === customerRequests[index]) customerLoading.value[index] = false }
}
function openRecommend() {
  customers.value = [[], []]
  openAction('recommend')
}
function openAction(action, row = null) {
  mode.value = action
  target.value = row
  draft.value = { reason: '', requestKey: requestKey(), evidence: '', occurredAt: proxy.parseTime(new Date()), bothConfirmed: false }
  if (action === 'reschedule') Object.assign(draft.value, { plannedAt: row.plannedAt, place: row.place })
  dialogOpen.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function submit() {
  if (saving.value || !await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    const d = draft.value
    const id = detail.value?.pair.pairId
    const action = mode.value
    if (['event', 'COMPLETE'].includes(action)) await proxy.$modal.confirm('确认服务事实已经核实？满足本人全部服务条件的客户将自动扣减一次。')
    if (action === 'success') await proxy.$modal.confirm('确认双方成功脱单并结案？系统将先核算已登记事实，再停止双方服务和相关待见面安排，取消双方未支付订单。剩余次数保留但不可继续使用；本操作不可撤销。')
    let result
    if (action === 'recommend') result = await api.recommend({ firstUserId: d.firstUserId, secondUserId: d.secondUserId, reason: d.reason, requestKey: d.requestKey })
    else if (action === 'success') result = await closeSuccess(id, { successAt: d.occurredAt, bothConfirmed: d.bothConfirmed, note: d.reason, evidence: d.evidence })
    else if (action === 'intention') result = await api.recordIntention(latest.value.id, { userId: target.value.userId, intention: d.intention, reason: d.reason })
    else if (action === 'event') result = await api.recordEvent(id, { optionCode: d.optionCode, occurredAt: d.occurredAt, note: d.reason, evidence: d.evidence, requestKey: d.requestKey })
    else if (['schedule', 'reschedule'].includes(action)) {
      const payload = { plannedAt: d.plannedAt, place: d.place, reason: d.reason, bothConfirmed: d.bothConfirmed }
      result = action === 'schedule' ? await api.schedule(id, payload) : await api.reschedule(target.value.appointmentId, payload)
    } else result = await api.appointmentAction(target.value.appointmentId, { action, occurredAt: action === 'COMPLETE' ? d.occurredAt : null, reason: d.reason, evidence: d.evidence })
    dialogOpen.value = false
    proxy.$modal.msgSuccess(action === 'success' ? `结案完成，成功案例 #${result.data.caseId}` : ['event', 'COMPLETE'].includes(action) ? '服务事实已保存，扣次结果可在流水中查看' : '记录已保存')
    if (checkPermi(['dating:match:query'])) {
      if (action === 'recommend') await showDetail(result.data)
      else await refreshDetail()
    }
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') console.error('流程记录保存失败', error)
  } finally { saving.value = false }
}
function openRoutePair() {
  const id = route.query.pairId
  if (typeof id === 'string' && /^\d+$/.test(id) && checkPermi(['dating:match:query'])) showDetail(id)
}
watch(() => route.query.pairId, openRoutePair)
onMounted(() => {
  load()
  openRoutePair()
  if (checkPermi(['dating:success:close'])) successPolicy().then(res => { successEnabled.value = res.data?.enabled === true }).catch(() => { successEnabled.value = false })
})
</script>

<style scoped>
.pair-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 20px; }
.pair-toolbar .el-button + .el-button { margin-left: 0; }
.participants { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-bottom: 22px; }
.participant { min-width: 0; border-bottom: 1px solid var(--el-border-color-lighter); padding-bottom: 16px; }
.participant-heading { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.participant-heading h3 { font-size: 16px; margin: 0 0 8px; overflow-wrap: anywhere; }
.participant-heading small { color: var(--el-text-color-secondary); font-size: 12px; font-weight: normal; }
.participant-facts { display: flex; flex-wrap: wrap; gap: 18px; margin: 12px 0; font-size: 13px; }
.participant-facts dt { color: var(--el-text-color-secondary); margin-bottom: 6px; }
.participant-facts dd { margin: 0; }
.section-title { font-size: 14px; margin: 22px 0 12px; }
.intentions { display: flex; flex-wrap: wrap; gap: 16px 28px; margin-bottom: 18px; }
.intention-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.blocked-reason { color: var(--el-color-danger); font-size: 13px; overflow-wrap: anywhere; }
.standard { font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
@media (max-width: 680px) { .participants { grid-template-columns: minmax(0, 1fr); gap: 16px; } }
</style>

<style>
.dating-pair-drawer .el-drawer__title { overflow-wrap: anywhere; font-size: 16px; }
.dating-pair-drawer .el-drawer__body { min-width: 0; padding: 16px; }
.dating-workflow-dialog .el-checkbox { height: auto; white-space: normal; }
.dating-workflow-dialog .el-checkbox__label { white-space: normal; line-height: 1.5; }
.dating-workflow-dialog .el-select { min-width: 0; }
</style>
