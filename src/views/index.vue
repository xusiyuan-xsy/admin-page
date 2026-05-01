<template>
  <div class="app-container paying-stats-dashboard" v-loading="loading">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">全部用户</div>
          <div class="stat-value text-primary">{{ stats.delFlag0Count ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">未匹配用户</div>
          <div class="stat-value text-success">{{ stats.status0Count ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">匹配成功用户</div>
          <div class="stat-value text-danger">{{ stats.status1Count ?? 0 }}</div>
        </el-card>
      </el-col>
      <!-- <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">男性</div>
          <div class="stat-value">{{ stats.maleCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8" :lg="6" :xl="5">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">女性</div>
          <div class="stat-value">{{ stats.femaleCount ?? 0 }}</div>
        </el-card>
      </el-col> -->
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span>用户状态分布</span>
          </template>
          <div ref="statusChartRef" class="chart-box" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="chart-card">
          <template #header>
            <span>性别分布</span>
          </template>
          <div ref="sexChartRef" class="chart-box" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <el-col :span="24">
        <el-card shadow="never" class="chart-card chart-card--wide">
          <template #header>
            <span>出生年份分布</span>
            <span class="card-sub">按年份统计男女人数</span>
          </template>
          <div ref="birthYearChartRef" class="chart-box chart-box--tall" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Index">
import { getPayingUsersStats } from '@/api/system/payingUser'
import * as echarts from 'echarts'

const loading = ref(true)
const stats = ref({
  delFlag0Count: 0,
  status0Count: 0,
  status1Count: 0,
  maleCount: 0,
  femaleCount: 0,
  birthYearStats: []
})

const statusChartRef = ref(null)
const sexChartRef = ref(null)
const birthYearChartRef = ref(null)

let statusChart = null
let sexChart = null
let birthYearChart = null

function disposeCharts() {
  statusChart?.dispose()
  sexChart?.dispose()
  birthYearChart?.dispose()
  statusChart = null
  sexChart = null
  birthYearChart = null
}

function sortedBirthYears() {
  const list = stats.value.birthYearStats
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
}

function renderCharts() {
  disposeCharts()
  if (!statusChartRef.value || !sexChartRef.value || !birthYearChartRef.value) return

  const s0 = stats.value.status0Count ?? 0
  const s1 = stats.value.status1Count ?? 0
  const male = stats.value.maleCount ?? 0
  const female = stats.value.femaleCount ?? 0

  statusChart = echarts.init(statusChartRef.value)
  statusChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '状态',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}({c})' },
        data: [
          { value: s0, name: '未匹配用户' },
          { value: s1, name: '匹配成功用户' }
        ]
      }
    ]
  })

  sexChart = echarts.init(sexChartRef.value)
  sexChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '性别',
        type: 'pie',
        radius: '68%',
        center: ['50%', '46%'],
        data: [
          { value: male, name: '男' },
          { value: female, name: '女' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        }
      }
    ]
  })

  const years = sortedBirthYears()
  const yearLabels = years.map((y) => String(y.year ?? ''))
  const maleByYear = years.map((y) => y.maleCount ?? 0)
  const femaleByYear = years.map((y) => y.femaleCount ?? 0)

  birthYearChart = echarts.init(birthYearChartRef.value)
  birthYearChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['男', '女'], bottom: 0 },
    grid: { left: '3%', right: '3%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: yearLabels,
      axisLabel: { rotate: yearLabels.length > 12 ? 45 : 0 }
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '男',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: maleByYear,
        itemStyle: { color: '#5470c6' }
      },
      {
        name: '女',
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: femaleByYear,
        itemStyle: { color: '#ee6666' }
      }
    ]
  })
}

function loadStats() {
  loading.value = true
  getPayingUsersStats()
    .then((res) => {
      const data = res.data || {}
      stats.value = {
        delFlag0Count: data.delFlag0Count ?? 0,
        status0Count: data.status0Count ?? 0,
        status1Count: data.status1Count ?? 0,
        maleCount: data.maleCount ?? 0,
        femaleCount: data.femaleCount ?? 0,
        birthYearStats: Array.isArray(data.birthYearStats) ? data.birthYearStats : []
      }
    })
    .finally(() => {
      loading.value = false
      nextTick(() => renderCharts())
    })
}

function handleResize() {
  statusChart?.resize()
  sexChart?.resize()
  birthYearChart?.resize()
}

onMounted(() => {
  loadStats()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped lang="scss">
.paying-stats-dashboard {
  .stat-row {
    margin-bottom: 16px;
  }

  .stat-card {
    margin-bottom: 16px;
    border-radius: 8px;

    .stat-label {
      font-size: 14px;
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.2;
      color: var(--el-text-color-primary);
    }

    .stat-hint {
      margin-top: 6px;
      font-size: 12px;
      color: var(--el-text-color-placeholder);
    }

    .text-primary {
      color: var(--el-color-primary);
    }

    .text-success {
      color: var(--el-color-success);
    }

    .text-danger {
      color: var(--el-color-danger);
    }
  }

  .chart-row {
    margin-bottom: 16px;
  }

  .chart-card {
    :deep(.el-card__header) {
      display: flex;
      align-items: baseline;
      gap: 12px;
    }

    .card-sub {
      font-size: 12px;
      font-weight: normal;
      color: var(--el-text-color-secondary);
    }
  }

  .chart-box {
    height: 320px;
    width: 100%;
  }

  .chart-box--tall {
    height: 400px;
  }
}
</style>
