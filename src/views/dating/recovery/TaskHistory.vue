<template>
  <el-drawer v-model="visible" :title="`任务 #${taskId || '-'} · 处理历史`" size="min(920px, 100vw)" append-to-body>
    <div class="history-toolbar"><el-button icon="User" @click="followup.open({ taskId })">责任跟进</el-button><el-button icon="Refresh" :loading="loading" @click="load">刷新</el-button></div>
    <el-alert v-if="failed" title="处理历史加载失败或无权访问" type="error" :closable="false" show-icon />
    <el-table v-else v-loading="loading" :data="rows" empty-text="暂无处理历史">
      <el-table-column prop="historyId" label="记录编号" width="90" />
      <el-table-column label="动作" width="100"><template #default="{ row }">{{ row.action === 'RETRY' ? '人工重试' : '自动失败' }}</template></el-table-column>
      <el-table-column prop="attempt" label="失败次数" width="90" />
      <el-table-column label="原因分类" min-width="160"><template #default="{ row }">{{ errorLabels[row.errorCode] || '其他异常' }}</template></el-table-column>
      <el-table-column label="重试原因" min-width="240"><template #default="{ row }"><span class="history-reason">{{ row.reason || (row.action === 'RETRY' ? '历史记录未填写' : '-') }}</span></template></el-table-column>
      <el-table-column prop="createBy" label="操作人" min-width="130" />
      <el-table-column prop="createTime" label="记录时间" width="170" />
    </el-table>
    <pagination v-show="!failed && total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />
  </el-drawer>
  <FollowupDrawer ref="followup" @changed="$emit('changed')" />
</template>

<script setup>
import { taskHistory } from '@/api/dating/recovery'
import { errorLabels } from './labels'
import FollowupDrawer from './FollowupDrawer.vue'
defineEmits(['changed'])
const followup = ref()
const visible = ref(false)
const taskId = ref(null)
const loading = ref(false)
const failed = ref(false)
const rows = ref([])
const total = ref(0)
const query = reactive({ pageNum: 1, pageSize: 10 })
let request = 0
async function load() {
  const current = ++request
  loading.value = true
  failed.value = false
  rows.value = []
  try {
    const res = await taskHistory(taskId.value, { ...query })
    if (current === request) { rows.value = res.rows; total.value = res.total }
  } catch { if (current === request) failed.value = true }
  finally { if (current === request) loading.value = false }
}
function open(row) {
  taskId.value = row.taskId
  query.pageNum = 1
  visible.value = true
  load()
}
onBeforeUnmount(() => { request++ })
defineExpose({ open })
</script>

<style scoped>
.history-toolbar { margin-bottom: 16px; }
.history-reason { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
