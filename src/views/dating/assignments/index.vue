<template>
  <div class="app-container dating-assignments">
    <el-form inline @submit.prevent="search">
      <el-form-item label="客户"><el-input v-model="query.keyword" placeholder="姓名 / 手机号" clearable @keyup.enter="search" /></el-form-item>
      <el-form-item label="服务状态">
        <el-select v-model="query.serviceStatus" clearable style="width: 150px">
          <el-option v-for="(label, value) in statuses" :key="value" :value="value" :label="label" />
        </el-select>
      </el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="userId" label="客户编号" width="95" />
      <el-table-column prop="name" label="姓名" min-width="110" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column label="负责红娘" min-width="120"><template #default="{ row }">{{ row.matchmakerName || '未分配' }}</template></el-table-column>
      <el-table-column label="服务状态" width="110"><template #default="{ row }"><el-tag :type="row.serviceStatus === 'SERVING' ? 'success' : 'info'">{{ statuses[row.serviceStatus] || row.serviceStatus }}</el-tag></template></el-table-column>
      <el-table-column label="可用次数" width="100" align="center"><template #default="{ row }">{{ row.remainingTimes ?? 0 }}</template></el-table-column>
      <el-table-column label="客户状态" width="95"><template #default="{ row }">{{ row.status === '0' ? '启用' : '停用' }}</template></el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-tooltip :content="row.matchmakerId ? '转交红娘' : '分配红娘'"><el-button link type="primary" icon="User" :aria-label="row.matchmakerId ? '转交红娘' : '分配红娘'" :disabled="row.status !== '0'" @click="openAssign(row)" v-hasPermi="['dating:assignment:edit']" /></el-tooltip>
          <el-tooltip content="分配记录"><el-button link type="primary" icon="Clock" aria-label="分配记录" @click="openHistory(row)" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-dialog v-model="assigning" :title="selected?.matchmakerId ? '转交红娘' : '分配红娘'" width="560px" style="max-width: 94vw" :close-on-click-modal="false">
      <el-form ref="formRef" :model="draft" :rules="rules" label-width="92px">
        <el-form-item label="客户">{{ selected?.name }} (#{{ selected?.userId }})</el-form-item>
        <el-form-item label="当前红娘">{{ selected?.matchmakerName || '未分配' }}</el-form-item>
        <el-form-item label="负责红娘" prop="matchmakerId">
          <el-select v-model="draft.matchmakerId" filterable remote :remote-method="searchStaff" :loading="staffLoading" placeholder="搜索账号或姓名" style="width: 100%">
            <el-option v-for="s in staff" :key="s.userId" :value="s.userId" :label="`${s.nickName} (${s.userName})`" :disabled="s.userId === selected?.matchmakerId" />
          </el-select>
        </el-form-item>
        <el-form-item label="分配原因" prop="reason"><el-input v-model="draft.reason" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item>
      </el-form>
      <template #footer><el-button @click="assigning = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="submit">确认分配</el-button></template>
    </el-dialog>
    <el-drawer v-model="historyOpen" :title="`${selected?.name || ''} · 分配记录`" size="min(760px, 100vw)">
      <el-table :data="history" v-loading="historyLoading">
        <el-table-column label="原红娘" width="100"><template #default="{ row }">{{ row.previousName || '未分配' }}</template></el-table-column>
        <el-table-column prop="nextName" label="新红娘" width="100" />
        <el-table-column prop="reason" label="原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="createBy" label="操作人" width="100" />
        <el-table-column prop="createTime" label="时间" width="165" />
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup name="DatingAssignments">
import { listAssignments, listStaff, assignCustomer, assignmentHistory } from '@/api/dating/workflow'
const { proxy } = getCurrentInstance()
const statuses = { NOT_STARTED: '未开通', SERVING: '服务中', NOT_RENEWED: '未续单', SUCCESS_CLOSED: '成功结案' }
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', serviceStatus: '' })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const assigning = ref(false)
const saving = ref(false)
const selected = ref(null)
const draft = ref({})
const staff = ref([])
const staffLoading = ref(false)
const formRef = ref()
const historyOpen = ref(false)
const historyLoading = ref(false)
const history = ref([])
const rules = {
  matchmakerId: [{ required: true, message: '请选择负责红娘', trigger: 'change' }],
  reason: [{ required: true, whitespace: true, message: '请输入分配原因', trigger: 'blur' }]
}
let staffRequest = 0
async function searchStaff(keyword) {
  const current = ++staffRequest
  staffLoading.value = true
  try { const res = await listStaff(keyword); if (current === staffRequest) staff.value = res.data }
  finally { if (current === staffRequest) staffLoading.value = false }
}
let loadRequest = 0
async function load() {
  const current = ++loadRequest
  loading.value = true
  try {
    const res = await listAssignments(query)
    if (current === loadRequest) { rows.value = res.rows; total.value = res.total }
  } finally { if (current === loadRequest) loading.value = false }
}
function search() { query.pageNum = 1; load() }
function reset() { Object.assign(query, { pageNum: 1, keyword: '', serviceStatus: '' }); load() }
function openAssign(row) {
  selected.value = row
  draft.value = { matchmakerId: undefined, expectedMatchmakerId: row.matchmakerId ?? null, reason: '' }
  assigning.value = true
  staff.value = []
  searchStaff('')
  nextTick(() => formRef.value?.clearValidate())
}
async function submit() {
  if (saving.value || !await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    await proxy.$modal.confirm(`确认将 ${selected.value.name} 分配给所选红娘？`)
    await assignCustomer(selected.value.userId, draft.value)
    assigning.value = false
    proxy.$modal.msgSuccess('分配已保存')
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') console.error('分配失败', error)
  } finally { saving.value = false }
}
async function openHistory(row) {
  selected.value = row
  history.value = []
  historyOpen.value = true
  historyLoading.value = true
  try { history.value = (await assignmentHistory(row.userId)).data }
  finally { historyLoading.value = false }
}
onMounted(load)
</script>

<style scoped>
.dating-assignments :deep(.el-select) { min-width: 0; }
</style>
