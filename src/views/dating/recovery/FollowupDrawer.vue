<template>
  <el-drawer v-model="visible" :title="`任务 #${taskId || '-'} · 责任跟进`" size="min(840px, 100vw)" append-to-body :before-close="close">
    <div class="followup-toolbar"><el-button icon="Refresh" :loading="loading" :disabled="saving" @click="refresh">刷新</el-button></div>
    <el-alert v-if="failed" title="跟进记录加载失败或无权访问，请刷新后重试" type="error" :closable="false" show-icon />
    <section v-else v-loading="loading">
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="认领人">{{ detail.followup.handlerName || '未认领' }}</el-descriptions-item>
          <el-descriptions-item label="处理进度">{{ statuses[detail.followup.status] }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ detail.followup.dueAt || '-' }} <el-tag v-if="detail.overdue" type="danger">已逾期</el-tag></el-descriptions-item>
        </el-descriptions>
        <el-alert v-if="!detail.active" class="followup-notice" title="当前任务不在可跟进异常范围内" type="info" :closable="false" show-icon />
        <el-form v-if="canHandle && (detail.canClaim || detail.canUpdate || detail.canRelease)" label-position="top" class="followup-form" @submit.prevent>
          <el-form-item v-if="detail.canUpdate" label="处理进度">
            <el-radio-group v-model="form.status" :disabled="saving"><el-radio-button value="IN_PROGRESS">处理中</el-radio-button><el-radio-button value="WAITING">等待处理</el-radio-button></el-radio-group>
          </el-form-item>
          <el-form-item v-if="detail.canClaim || detail.canUpdate" label="截止时间">
            <el-date-picker v-model="form.dueAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" format="YYYY-MM-DD HH:mm:ss" :disabled="saving" clearable aria-label="跟进截止时间" />
          </el-form-item>
          <el-form-item label="跟进说明" required>
            <el-input v-model="form.note" type="textarea" :rows="4" maxlength="500" show-word-limit :disabled="saving" aria-label="跟进说明" />
          </el-form-item>
          <div class="followup-actions">
            <el-button v-if="detail.canClaim" type="primary" icon="User" :loading="saving" :disabled="uncertain" @click="submit('CLAIM')">认领</el-button>
            <el-button v-if="detail.canUpdate" type="primary" icon="Check" :loading="saving" :disabled="uncertain" @click="submit('UPDATE')">保存跟进</el-button>
            <el-button v-if="detail.canRelease" type="warning" icon="Unlock" :disabled="saving || uncertain" @click="submit('RELEASE')">释放责任</el-button>
          </div>
        </el-form>
        <el-alert v-if="uncertain" title="提交未确认，请先刷新核对最新记录；填写内容已保留" type="warning" :closable="false" show-icon />
      </template>
    </section>
    <h3>跟进历史</h3>
    <el-alert v-if="historyFailed" title="跟进历史加载失败，请刷新重试" type="error" :closable="false" show-icon />
    <el-table v-else v-loading="historyLoading" :data="rows" empty-text="暂无跟进记录">
      <el-table-column label="动作" width="90"><template #default="{ row }">{{ actions[row.action] }}</template></el-table-column>
      <el-table-column prop="createBy" label="操作人" min-width="120" />
      <el-table-column label="进度" width="110"><template #default="{ row }">{{ statuses[row.status] }}</template></el-table-column>
      <el-table-column prop="dueAt" label="截止时间" width="170" />
      <el-table-column label="说明" min-width="240"><template #default="{ row }"><span class="followup-note">{{ row.note }}</span></template></el-table-column>
      <el-table-column prop="createTime" label="记录时间" width="170" />
    </el-table>
    <pagination v-show="!historyFailed && total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadHistory" />
  </el-drawer>
</template>

<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { checkPermi } from '@/utils/permission'
import { getFollowup, followupHistory, saveFollowup } from '@/api/dating/recovery'
const emit = defineEmits(['changed'])
const statuses = { UNASSIGNED: '未认领', IN_PROGRESS: '处理中', WAITING: '等待处理' }
const actions = { CLAIM: '认领', UPDATE: '更新进度', RELEASE: '释放责任' }
const canHandle = computed(() => checkPermi(['dating:exception:handle']))
const visible = ref(false)
const taskId = ref(null)
const detail = ref(null)
const loading = ref(false)
const failed = ref(false)
const saving = ref(false)
const uncertain = ref(false)
const historyLoading = ref(false)
const historyFailed = ref(false)
const rows = ref([])
const total = ref(0)
const form = reactive({ status: 'IN_PROGRESS', dueAt: null, note: '' })
const query = reactive({ pageNum: 1, pageSize: 10 })
let request = 0
let historyRequest = 0
async function loadDetail() {
  const current = ++request
  loading.value = true
  failed.value = false
  detail.value = null
  try {
    const res = await getFollowup(taskId.value)
    if (current !== request) return
    detail.value = res.data
    form.status = res.data.followup.status === 'WAITING' ? 'WAITING' : 'IN_PROGRESS'
    form.dueAt = res.data.followup.dueAt
    uncertain.value = false
  } catch { if (current === request) failed.value = true }
  finally { if (current === request) loading.value = false }
}
async function loadHistory() {
  const current = ++historyRequest
  historyLoading.value = true
  historyFailed.value = false
  rows.value = []
  try {
    const res = await followupHistory(taskId.value, { ...query })
    if (current === historyRequest) { rows.value = res.rows; total.value = res.total }
  } catch { if (current === historyRequest) historyFailed.value = true }
  finally { if (current === historyRequest) historyLoading.value = false }
}
async function refresh() { await Promise.all([loadDetail(), loadHistory()]) }
async function submit(action) {
  if (saving.value || loading.value || uncertain.value || !detail.value) return
  const note = form.note.trim()
  if (!note) return ElMessage.warning('请填写跟进说明')
  if (action === 'RELEASE') {
    try { await ElMessageBox.confirm('确认释放当前责任认领？', '释放责任', { type: 'warning' }) }
    catch { return }
  }
  saving.value = true
  try {
    await saveFollowup(taskId.value, { action, version: detail.value.followup.version,
      status: action === 'UPDATE' ? form.status : null,
      dueAt: action === 'RELEASE' ? null : form.dueAt || null, note })
    form.note = ''
    ElMessage.success('跟进记录已保存')
    emit('changed')
    query.pageNum = 1
    await refresh()
  } catch { uncertain.value = true }
  finally { saving.value = false }
}
function open(row) {
  if (saving.value) return
  taskId.value = row.taskId
  form.note = ''
  uncertain.value = false
  query.pageNum = 1
  total.value = 0
  visible.value = true
  refresh()
}
function close(done) { if (!saving.value) { request++; historyRequest++; done() } }
onBeforeUnmount(() => { request++; historyRequest++ })
defineExpose({ open })
</script>

<style scoped>
.followup-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
.followup-form, .followup-notice { margin-top: 16px; }
.followup-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.followup-actions .el-button { margin: 0; }
.followup-note { white-space: pre-wrap; overflow-wrap: anywhere; }
.followup-form :deep(.el-date-editor) { width: 100%; max-width: 320px; }
h3 { font-size: 15px; margin: 24px 0 12px; }
</style>
