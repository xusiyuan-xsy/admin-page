<template>
  <div class="app-container success-cases">
    <el-form inline @submit.prevent="search" class="case-filters">
      <el-form-item label="客户"><el-input v-model="query.keyword" placeholder="结案时客户姓名" clearable @keyup.enter="search" /></el-form-item>
      <el-form-item label="脱单日期"><el-date-picker v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" /></el-form-item>
      <el-form-item label="负责红娘"><el-select v-model="query.matchmakerId" filterable clearable style="width: 180px"><el-option v-for="s in matchmakers" :key="s.matchmakerId" :value="s.matchmakerId" :label="`${s.matchmakerName || '红娘'} #${s.matchmakerId}`" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <div class="case-stats" v-loading="loading">
      <el-statistic title="成功案例（对）" :value="stats.caseCount" />
      <el-statistic title="成功脱单（人）" :value="stats.peopleCount" />
    </div>
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="caseId" label="案例编号" width="100" />
      <el-table-column prop="lowName" label="客户一" min-width="140" />
      <el-table-column prop="highName" label="客户二" min-width="140" />
      <el-table-column prop="pairId" label="配对编号" width="100" />
      <el-table-column prop="successAt" label="脱单确认时间" width="170" />
      <el-table-column prop="confirmedBy" label="结案操作人" width="120" />
      <el-table-column prop="createTime" label="结案登记时间" width="170" />
      <el-table-column label="操作" width="85" fixed="right"><template #default="{ row }"><el-tooltip content="案例详情"><el-button link type="primary" icon="View" aria-label="案例详情" @click="showDetail(row.caseId)" v-hasPermi="['dating:success:query']" /></el-tooltip></template></el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-drawer v-model="detailOpen" title="成功案例详情" size="min(760px, 100vw)" class="dating-success-drawer">
      <div v-loading="detailLoading" class="case-detail">
        <template v-if="detail">
        <div class="case-heading"><h3>案例 #{{ detail.successCase.caseId }}</h3><el-tag type="success">成功结案</el-tag></div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="脱单确认时间">{{ detail.successCase.successAt }}</el-descriptions-item>
          <el-descriptions-item label="结案登记时间">{{ detail.successCase.createTime }}</el-descriptions-item>
          <el-descriptions-item label="结案操作人">{{ detail.successCase.confirmedBy }}</el-descriptions-item>
          <el-descriptions-item label="关联配对">
            <span>#{{ detail.successCase.pairId }}</span>
            <el-button link type="primary" icon="View" class="ml10" @click="openPair" v-hasPermi="['dating:match:query']">配对记录</el-button>
          </el-descriptions-item>
          <el-descriptions-item label="推荐记录">#{{ detail.successCase.recommendationId }}</el-descriptions-item>
          <el-descriptions-item label="确认凭证编号">{{ detail.confirmation.evidence }}</el-descriptions-item>
          <el-descriptions-item label="脱单核实记录"><span class="case-note">{{ detail.confirmation.note }}</span></el-descriptions-item>
        </el-descriptions>
        <h3 class="section-title">结案快照</h3>
        <el-table :data="detail.members">
          <el-table-column prop="name" label="客户" min-width="120" />
          <el-table-column prop="matchmakerName" label="负责红娘" min-width="120" />
          <el-table-column prop="retainedTimes" label="保留余次" width="100" />
        </el-table>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="DatingSuccessCases">
import * as api from '@/api/dating/success'
const router = useRouter()
const query = reactive({ pageNum: 1, pageSize: 10, keyword: '', matchmakerId: undefined })
const dates = ref([])
const rows = ref([])
const total = ref(0)
const stats = ref({ caseCount: 0, peopleCount: 0 })
const matchmakers = ref([])
const loading = ref(false)
const detail = ref(null)
const detailOpen = ref(false)
const detailLoading = ref(false)
let requestId = 0
let detailRequest = 0
async function load() {
  const current = ++requestId
  loading.value = true
  const params = { ...query, from: dates.value?.[0], to: dates.value?.[1] }
  try {
    const [list, counts] = await Promise.all([api.listSuccessCases(params), api.successStats(params)])
    if (current !== requestId) return
    rows.value = list.rows
    total.value = list.total
    stats.value = counts.data
  } finally { if (current === requestId) loading.value = false }
}
function search() { query.pageNum = 1; load() }
function reset() { dates.value = []; Object.assign(query, { pageNum: 1, keyword: '', matchmakerId: undefined }); load() }
async function showDetail(id) {
  const current = ++detailRequest
  detailLoading.value = true
  detail.value = null
  detailOpen.value = true
  try { const res = await api.getSuccessCase(id); if (current === detailRequest) detail.value = res.data }
  finally { if (current === detailRequest) detailLoading.value = false }
}
function openPair() {
  detailOpen.value = false
  router.push({ path: '/dating/matches', query: { pairId: String(detail.value.successCase.pairId) } })
}
onMounted(() => { load(); api.successMatchmakers().then(res => { matchmakers.value = res.data }) })
</script>

<style scoped>
.case-stats { display: flex; flex-wrap: wrap; gap: 32px 64px; padding: 16px 0 22px; margin-bottom: 16px; border-bottom: 1px solid var(--el-border-color-lighter); }
.case-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 20px; }
.case-heading h3 { margin: 0; font-size: 18px; overflow-wrap: anywhere; }
.section-title { font-size: 14px; margin: 24px 0 12px; }
.case-note { white-space: pre-wrap; overflow-wrap: anywhere; }
.case-detail { min-height: 160px; }
@media (max-width: 680px) {
  .case-filters :deep(.el-form-item) { display: flex; margin-right: 0; }
  .case-filters :deep(.el-form-item__content) { min-width: 0; }
  .case-filters :deep(.el-date-editor) { width: 100%; min-width: 0; }
  .case-filters :deep(.el-range-input) { min-width: 0; }
}
</style>
<style>
.dating-success-drawer .el-drawer__body { min-width: 0; padding: 16px; }
.dating-success-drawer .el-descriptions__cell { overflow-wrap: anywhere; }
.dating-success-drawer .el-descriptions__label { width: 120px; }
</style>
