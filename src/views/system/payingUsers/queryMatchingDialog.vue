<template>
  <el-dialog
    title="查询匹配"
    v-model="visible"
    width="1100px"
    append-to-body
    :close-on-click-modal="false"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="search-toolbar">
      <div class="search-toolbar__left">
        <span class="search-toolbar__title">筛选条件</span>
      </div>
      <div class="search-toolbar__right">
        <el-button type="primary" icon="Search" size="small" @click="handleSearch">查询</el-button>
        <!-- <el-button icon="Refresh" size="small" @click="handleReset">重置</el-button> -->
        <el-button link type="primary" size="small" @click="toggleSearch">
          {{ showSearch ? '收起' : '展开' }}
        </el-button>
      </div>
    </div>

    <el-collapse-transition>
      <div v-show="showSearch">
        <el-form :model="params" :inline="false" label-width="120px" size="small" class="search-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="查询范围">
                <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                  <el-input-number
                    v-model="params.ageMin"
                    :min="1940"
                    :max="2030"
                    controls-position="right"
                    placeholder="最小出生年份"
                    style="flex: 1"
                  />
                  <span style="color: #606266">~</span>
                  <el-input-number
                    v-model="params.ageMax"
                    :min="1940"
                    :max="2030"
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
                  <span style="color: #606266">~</span>
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
                    :label="index === 0 ? opt.label + '学历' : opt.label + '学历'"
                    :value="opt.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否接受异地">
                <el-select v-model="params.acceptLongDist" placeholder="选择是否接受异地" clearable style="width: 100%">
                  <el-option label="否" value="0" />
                  <el-option label="是" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="吸烟习惯">
                <el-select v-model="params.smokeHabit" placeholder="选择吸烟习惯" clearable style="width: 100%">
                  <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="饮酒习惯">
                <el-select v-model="params.drinkHabit" placeholder="选择饮酒习惯" clearable style="width: 100%">
                  <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否有车">
                <el-select v-model="params.hasCar" placeholder="选择是否有车" clearable style="width: 100%">
                  <el-option label="否" value="0" />
                  <el-option label="是" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否有房">
                <el-select v-model="params.hasHouse" placeholder="选择是否有房" clearable style="width: 100%">
                  <el-option label="否" value="0" />
                  <el-option label="是" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="是否有纹身">
                <el-select v-model="params.noTattoo" placeholder="选择是否有纹身" clearable style="width: 100%">
                  <el-option label="否" value="0" />
                  <el-option label="是" value="1" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="家乡要求">
                <el-input v-model="params.hometownRequire" placeholder="输入家乡要求" clearable style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="现居城市要求">
                <el-input v-model="params.cityRequire" placeholder="输入现居城市要求" clearable style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
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
    <el-table v-if="viewMode === 'table'" v-loading="loading" :data="resultList" border style="width: 100%">
      <el-table-column label="编号" prop="id" align="center" width="70" />
      <el-table-column label="姓名" prop="name" align="center" min-width="90" :show-overflow-tooltip="true" />
      <el-table-column label="手机号码" prop="phone" align="center" width="118" />
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
      <el-table-column label="职业" prop="occupation" align="center" :show-overflow-tooltip="true" min-width="100" />
      <el-table-column label="现居城市" prop="currentCity" align="center" :show-overflow-tooltip="true" min-width="88" />
      <el-table-column label="月收入" prop="monthlyIncome" align="center" width="90">
        <template #default="scope">
          <span>{{ scope.row.monthlyIncome != null && scope.row.monthlyIncome !== '' ? scope.row.monthlyIncome : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" prop="status" align="center" width="80">
        <template #default="scope">
          <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 卡片视图 -->
    <div v-else v-loading="loading" class="card-grid">
      <matching-user-card
        v-for="user in resultList"
        :key="user.id"
        :user="user"
        :sys-user-sex="sys_user_sex"
        :sys-user-education="sys_user_education"
        :sys-normal-disable="sys_normal_disable"
      />
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
</template>

<script setup>
import { searchPayingRequirement } from '@/api/system/payingUser'
import { List, Grid } from '@element-plus/icons-vue'
import MatchingUserCard from './MatchingUserCard.vue'

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
onMounted(() => {
  handleOpen()
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

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10
})

const habitOptions = [
  { label: '否', value: '0' },
  { label: '偶尔', value: '1' },
  { label: '经常', value: '2' }
]

function handleOpen() {
  params.value = { ...props.searchParams }
  queryParams.pageNum = 1
  queryParams.pageSize = 10
  fetchData()
}

function handleSearch() {
  queryParams.pageNum = 1
  fetchData()
}

function handleReset() {
  params.value = { ...props.searchParams }
  queryParams.pageNum = 1
  fetchData()
}

function fetchData() {
  loading.value = true
  const reqData = {
    ...params.value,
    pageNum: queryParams.pageNum,
    pageSize: queryParams.pageSize
  }
  searchPayingRequirement(reqData)
    .then(res => {
      resultList.value = res.rows || []
      total.value = res.total || 0
    })
    .finally(() => {
      loading.value = false
    })
}

function handleClose() {
  resultList.value = []
  total.value = 0
  visible.value = false
}

function toggleSearch() {
  showSearch.value = !showSearch.value
}
</script>

<style scoped>
.search-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.search-toolbar__title {
  font-weight: 600;
  color: #303133;
}
.search-toolbar__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.search-form {
  background: #f8f9fa;
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
  color: #606266;
}
.result-toolbar__count b {
  color: #409eff;
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
}
</style>
