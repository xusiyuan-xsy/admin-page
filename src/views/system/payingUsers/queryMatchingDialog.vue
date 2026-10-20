<template>
  <el-dialog
    title="查询匹配"
    v-model="visible"
    width="1100px"
    style="max-width: calc(100vw - 24px)"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @close="handleClose"
  >
    <div class="match-controls">
      <el-radio-group v-model="params.matchMode" aria-label="匹配方向" @change="handleSearch">
        <el-radio-button value="ONE_WAY">单向需求匹配</el-radio-button>
        <el-radio-button value="TWO_WAY">双向需求匹配</el-radio-button>
      </el-radio-group>
      <span class="source-name">{{ props.searchParams.sourceName }} #{{ params.payingId }}</span>
    </div>
    <div class="match-controls">
      <el-select v-model="params.candidateScope" aria-label="候选范围" @change="handleSearch">
        <el-option label="可服务候选" value="ELIGIBLE" />
        <el-option label="全部正常档案" value="ALL" />
      </el-select>
      <el-select v-model="params.historyFilter" aria-label="配对历史" @change="handleSearch">
        <el-option label="全部配对历史" value="ALL" />
        <el-option label="仅未配对对象" value="NEW" />
      </el-select>
      <el-select v-model="params.sortBy" aria-label="结果排序" @change="handleSearch">
        <el-option label="双向符合优先" value="MATCH" />
        <el-option label="档案编号倒序" value="RECENT" />
      </el-select>
    </div>
    <el-alert v-if="regionError" :title="regionError" type="warning" :closable="false" show-icon />
    <div class="search-toolbar">
      <div class="search-toolbar__left">
        <span class="search-toolbar__title">筛选条件</span>
      </div>
      <div class="search-toolbar__right">
        <el-button type="primary" icon="Search" size="small" :disabled="regionLoading" @click="handleSearch">查询</el-button>
        <el-button icon="RefreshLeft" size="small" :disabled="regionLoading" @click="handleReset">恢复客户需求</el-button>
        <el-button link type="primary" size="small" @click="toggleSearch">
          {{ showSearch ? '收起' : '展开' }}
        </el-button>
      </div>
    </div>

    <el-collapse-transition>
      <div v-show="showSearch">
        <el-form :model="params" :disabled="regionLoading" :inline="false" label-width="120px" size="small" class="search-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="出生年份范围">
                <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                  <el-input-number
                    v-model="params.ageMin"
                    :min="1900"
                    :max="new Date().getFullYear()"
                    controls-position="right"
                    placeholder="最小出生年份"
                    style="flex: 1"
                  />
                  <span class="range-separator">~</span>
                  <el-input-number
                    v-model="params.ageMax"
                    :min="1900"
                    :max="new Date().getFullYear()"
                    controls-position="right"
                    placeholder="最大出生年份"
                    style="flex: 1"
                  />
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="身高范围(cm)">
                <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                  <el-input-number
                    v-model="params.heightMin"
                    :min="100"
                    :max="250"
                    controls-position="right"
                    placeholder="最小身高"
                    style="flex: 1"
                  />
                  <span class="range-separator">~</span>
                  <el-input-number
                    v-model="params.heightMax"
                    :min="100"
                    :max="250"
                    controls-position="right"
                    placeholder="最大身高"
                    style="flex: 1"
                  />
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="学历要求">
                <el-select v-model="params.education" placeholder="选择学历" clearable style="width: 100%">
                  <el-option
                    v-for="(opt, index) in sys_user_education"
                    :key="opt.value"
                    :label="opt.value === '0' ? '不限' : opt.label + '及以上'"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="饮酒要求">
                <el-select v-model="params.drinkHabit" placeholder="选择饮酒要求" clearable style="width: 100%">
                  <el-option v-for="opt in drinkHabitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="吸烟要求">
                <el-select v-model="params.smokeHabit" placeholder="选择吸烟要求" clearable style="width: 100%">
                  <el-option v-for="opt in smokeHabitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
           
            <el-col :span="8">
              <el-form-item label="是否要求无纹身">
                <el-select v-model="params.noTattoo" placeholder="选择纹身要求" clearable style="width: 100%">
                  <el-option label="不限" value="0" />
                  <el-option label="要求无纹身" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否要求有车">
                <el-select v-model="params.hasCar" placeholder="选择是否要求有车" clearable style="width: 100%">
                  <el-option label="不限" value="0" />
                  <el-option label="要求有车" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否要求有房">
                <el-select v-model="params.hasHouse" placeholder="选择是否要求有房" clearable style="width: 100%">
                  <el-option label="不限" value="0" />
                  <el-option label="要求有房" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
           
            <el-col :span="8">
              <el-form-item label="家乡要求">
                <region-cascader v-model="params.hometownRequireCode" v-model:name="params.hometownRequire" :check-strictly="true" :placeholder="params.hometownRequire || '选择家乡要求'" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否接受异地">
                <el-select v-model="params.acceptLongDist" placeholder="选择是否接受异地" clearable style="width: 100%">
                  <el-option label="不限" value="" />
                  <el-option label="否" value="0" />
                  <el-option label="是" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            
            <el-col :span="8" v-if="params.acceptLongDist === '0'">
              <el-form-item label="现居城市要求">
                <region-cascader v-model="params.cityRequireCode" v-model:name="params.cityRequire" :check-strictly="true" :placeholder="params.cityRequire || '选择现居城市要求'" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item v-if="params.otherRequire" label="其他要求">
            <span>{{ params.otherRequire }}</span>
          </el-form-item>
        </el-form>
      </div>
    </el-collapse-transition>

    <el-divider style="margin: 12px 0" />

    <!-- 结果工具栏 -->
    <div class="result-toolbar">
      <span class="result-toolbar__count">
        共 <b>{{ total }}</b> 条结果
      </span>
      <el-button-group class="result-toolbar__toggle">
        <el-button
          :type="viewMode === 'table' ? 'primary' : 'default'"
          size="small"
          @click="viewMode = 'table'"
        >
          <el-icon><List /></el-icon>
          <span>表格</span>
        </el-button>
        <el-button
          :type="viewMode === 'card' ? 'primary' : 'default'"
          size="small"
          @click="viewMode = 'card'"
        >
          <el-icon><Grid /></el-icon>
          <span>卡片</span>
        </el-button>
      </el-button-group>
    </div>

    <!-- 表格视图 -->
    <el-alert v-if="queryError" :title="queryError" type="error" :closable="false" show-icon>
      <el-button link type="primary" icon="Refresh" @click="fetchData">重试查询</el-button>
    </el-alert>
    <el-table v-if="viewMode === 'table' && !queryError" v-loading="loading" :data="resultList"
      empty-text="当前条件下无匹配对象" border style="width: 100%">
      <el-table-column label="编号" prop="id" align="center" width="70" />
      <el-table-column label="姓名" prop="name" align="center" min-width="90" :show-overflow-tooltip="true" />
      <el-table-column label="性别" prop="sex" align="center" width="66">
        <template #default="scope">
          <dict-tag :options="sys_user_sex" :value="scope.row.sex" />
        </template>
      </el-table-column>
      <el-table-column label="出生年份" prop="birthYear" align="center" width="88" />
      <el-table-column label="身高(cm)" prop="height" align="center" width="80" />
      <el-table-column label="学历" prop="education" align="center" min-width="88">
        <template #default="scope">
          <dict-tag :options="sys_user_education" :value="scope.row.education" />
        </template>
      </el-table-column>
      <el-table-column label="现居城市" prop="currentCity" align="center" :show-overflow-tooltip="true" min-width="140" />
      <el-table-column label="匹配依据与操作" min-width="300">
        <template #default="{ row }">
          <matching-outcome :user="row" @detail="openDetail" @pair="openPair" @recommend="openRecommend" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 卡片视图 -->
    <div v-else-if="!queryError" v-loading="loading" class="card-grid">
      <matching-user-card
        v-for="user in resultList"
        :key="user.id"
        :user="user"
        :sys-user-sex="sys_user_sex"
        :sys-user-education="sys_user_education"
        :sys-normal-disable="sys_normal_disable"
      >
        <matching-outcome :user="user" @detail="openDetail" @pair="openPair" @recommend="openRecommend" />
      </matching-user-card>
      <el-empty v-if="!loading && resultList.length === 0" description="暂无匹配结果" style="grid-column: 1 / -1" />
    </div>

    <!-- 分页 -->
    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="fetchData"
    />

    <!-- <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template> -->
  </el-dialog>
  <el-dialog v-model="recommendOpen" title="创建推荐" width="520px" style="max-width: calc(100vw - 24px)"
    append-to-body :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
    <el-form label-width="90px">
      <el-form-item label="配对双方">{{ props.searchParams.sourceName }} #{{ params.payingId }} / {{ recommendation.user?.name }} #{{ recommendation.user?.id }}</el-form-item>
      <el-form-item label="推荐理由" required>
        <el-input v-model="recommendation.reason" type="textarea" :rows="4" maxlength="500"
          show-word-limit :disabled="saving || recommendation.submitted" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="recommendOpen = false">取消</el-button>
      <el-button type="primary" icon="Check" :loading="saving" @click="submitRecommend">确认推荐</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="detailOpen" title="客户档案" width="640px" style="max-width: calc(100vw - 24px)" append-to-body>
    <div v-loading="detailLoading" style="min-height: 120px">
      <matching-user-card v-if="detail" :user="detail" :sys-user-sex="sys_user_sex" :sys-user-education="sys_user_education" />
      <el-alert v-else-if="!detailLoading" title="档案加载失败" type="error" :closable="false" />
    </div>
  </el-dialog>
</template>

<script setup>
import { searchPayingRequirement, getPayingUser } from '@/api/system/payingUser'
import { recommend } from '@/api/dating/workflow'
import { checkPermi } from '@/utils/permission'
import { listRegion } from '@/api/system/region'
import { hydrateRequirementRegions } from '@/utils/archiveRegions'
import { List, Grid } from '@element-plus/icons-vue'
import MatchingUserCard from './MatchingUserCard.vue'
import MatchingOutcome from './MatchingOutcome.vue'
import RegionCascader from '@/components/RegionCascader/index.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  searchParams: {
    type: Object,
    default: () => ({})
  }
})
const emit = defineEmits(['update:modelValue'])

const { proxy } = getCurrentInstance()
const { sys_user_sex, sys_user_education, sys_normal_disable } = proxy.useDict('sys_user_sex', 'sys_user_education', 'sys_normal_disable')

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const loading = ref(false)
const resultList = ref([])
const total = ref(0)
const viewMode = ref('table')

const params = ref({})
const showSearch = ref(true)
const queryError = ref('')
const regionError = ref('')
const regionLoading = ref(false)
const router = useRouter()
const recommendOpen = ref(false)
const saving = ref(false)
const recommendation = ref({})
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
let queryRequest = 0
let regionRequest = 0
let detailRequest = 0

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})
const drinkHabitOptions = [
  { label: '不限', value: '' },
  { label: '无喝酒', value: '0' },
  { label: '最多偶尔', value: '1' },
  { label: '可接受经常', value: '2' }
]
const smokeHabitOptions = [
  { label: '不限', value: '' },
  { label: '无抽烟', value: '0' },
  { label: '最多偶尔', value: '1' },
  { label: '可接受经常', value: '2' }
]

watch(() => props.modelValue, open => {
  if (open) handleOpen()
}, { immediate: true })

function handleOpen() {
  params.value = { ...props.searchParams, matchMode: 'ONE_WAY', candidateScope: 'ELIGIBLE', historyFilter: 'ALL', sortBy: 'MATCH' }
  delete params.value.sourceName
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  hydrateRegions()
  fetchData()
}

function handleSearch() {
  queryParams.pageNum = 1
  fetchData()
}

function handleReset() {
  const { matchMode, candidateScope, historyFilter, sortBy } = params.value
  params.value = { ...props.searchParams, matchMode, candidateScope, historyFilter, sortBy }
  delete params.value.sourceName
  hydrateRegions()
  handleSearch()
}

async function hydrateRegions() {
  const current = ++regionRequest
  regionLoading.value = true
  regionError.value = ''
  try {
    const codes = await hydrateRequirementRegions(params.value, parent => listRegion(parent).then(res => res.data || []))
    if (current !== regionRequest) return
    Object.assign(params.value, codes)
    if ((params.value.cityRequire && !codes.cityRequireCode) || (params.value.hometownRequire && !codes.hometownRequireCode))
      regionError.value = '部分地区暂未解析，已保留原需求名称'
  } catch {
    if (current === regionRequest) regionError.value = '地区加载失败，已保留原需求名称'
  } finally {
    if (current === regionRequest) regionLoading.value = false
  }
}

async function fetchData() {
  const current = ++queryRequest
  queryError.value = ''
  resultList.value = []
  total.value = 0
  const invalid = (params.value.ageMin != null && params.value.ageMax != null && params.value.ageMin > params.value.ageMax)
    || (params.value.heightMin != null && params.value.heightMax != null && params.value.heightMin > params.value.heightMax)
  if (invalid || (params.value.acceptLongDist === '0' && !params.value.cityRequire?.trim())) {
    queryError.value = invalid ? '请核对出生年份和身高的上下限' : '不接受异地时必须选择现居城市'
    loading.value = false
    return
  }
  loading.value = true
  const reqData = {
    ...params.value,
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize
  }
  if (reqData.acceptLongDist !== '0') {
    delete reqData.cityRequire
  }
  
  try {
    const res = await searchPayingRequirement(reqData)
    if (current === queryRequest) {
      resultList.value = res.rows || []
      total.value = res.total || 0
    }
  } catch {
    if (current === queryRequest) queryError.value = '匹配查询失败，请重试'
  } finally {
    if (current === queryRequest) loading.value = false
  }
}

function openPair(id) {
  if (!checkPermi(['dating:match:query']) || !checkPermi(['dating:match:list'])) return
  handleClose()
  router.push({ path: '/dating/matches', query: { pairId: String(id) } })
}
async function openDetail(user) {
  if (!checkPermi(['system:payingUsers:query'])) return
  const current = ++detailRequest
  detail.value = null
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await getPayingUser(user.id)
    if (current === detailRequest) detail.value = res.data
  } catch {
    if (current === detailRequest) detail.value = null
  } finally {
    if (current === detailRequest) detailLoading.value = false
  }
}
function openRecommend(user) {
  if (!checkPermi(['dating:match:add']) || !user.serviceEligible || !user.sourceEligible || user.pairId) return
  recommendation.value = {
    user, reason: '', submitted: false,
    requestKey: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
  }
  recommendOpen.value = true
}
async function submitRecommend() {
  if (saving.value) return
  if (!recommendation.value.reason?.trim()) return proxy.$modal.msgWarning('请填写推荐理由')
  saving.value = true
  recommendation.value.submitted = true
  const draft = recommendation.value
  try {
    await recommend({ firstUserId: params.value.payingId, secondUserId: draft.user.id,
      reason: draft.reason.trim(), requestKey: draft.requestKey })
    recommendOpen.value = false
    proxy.$modal.msgSuccess('推荐已创建')
    await fetchData()
  } catch {
    // Keep the original payload and idempotency key for an uncertain-result retry.
  } finally {
    saving.value = false
  }
}

function handleClose() {
  ++queryRequest
  ++regionRequest
  ++detailRequest
  loading.value = false
  regionLoading.value = false
  detailOpen.value = false
  recommendOpen.value = false
  resultList.value = []
  total.value = 0
  visible.value = false
}

function toggleSearch() {
  showSearch.value = !showSearch.value
}
</script>

<style scoped>
.match-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.match-controls .el-select { width: 168px; }
.source-name { color: var(--el-text-color-regular); font-size: 13px; overflow-wrap: anywhere; }
.range-separator { color: var(--el-text-color-regular); }
.search-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.search-toolbar__title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.search-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-form {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  border-radius: 4px;
  padding: 16px 16px 4px;
  margin-bottom: 4px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.result-toolbar__count {
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.result-toolbar__count b {
  color: var(--el-color-primary);
}
.result-toolbar__toggle {
  flex-shrink: 0;
}
.result-toolbar__toggle .el-button {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  min-height: 120px;
  max-height: 500px;
  overflow-y: auto;
}
.search-form :deep(.el-input-number) { min-width: 0; width: 100%; }
@media (max-width: 600px) {
  .match-controls .el-select { width: 100%; }
  .search-toolbar { align-items: flex-start; gap: 8px; }
  .search-toolbar__right { flex-wrap: wrap; justify-content: flex-end; }
  .search-form :deep(.el-col) { max-width: 100%; flex-basis: 100%; }
  .search-form :deep(.el-form-item) { display: block; }
  .search-form :deep(.el-form-item__content) { margin-left: 0 !important; }
  .search-form :deep(.el-form-item__label) { width: auto !important; }
  .card-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
