<template>
  <el-dialog v-model="visible" title="重新核算扣次" width="560px" style="max-width: 94vw"
    :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving" append-to-body>
    <el-form ref="form" :model="draft" label-position="top" @submit.prevent="submit">
      <el-form-item label="扣次任务">#{{ task?.taskId }} / {{ task?.customerName || `客户 #${task?.userId}` }}</el-form-item>
      <el-form-item label="重试原因" prop="reason" :rules="rules">
        <el-input v-model="draft.reason" type="textarea" :rows="4" maxlength="500" show-word-limit :disabled="saving" />
      </el-form-item>
      <el-alert v-if="failed" title="提交未确认，请刷新任务与处理历史后核对结果" type="error" :closable="false" show-icon />
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button type="primary" icon="RefreshRight" :loading="saving" @click="submit">确认重新核算</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ElMessageBox, ElMessage } from 'element-plus'
import { retryDeduction } from '@/api/dating/workflow'
const emit = defineEmits(['retried'])
const visible = ref(false)
const task = ref(null)
const form = ref()
const draft = reactive({ reason: '' })
const saving = ref(false)
const failed = ref(false)
const rules = [{ validator: (_, value, done) => value?.trim() && value.length <= 500 ? done() : done(new Error('请填写1至500字的重试原因')), trigger: 'blur' }]
function open(row) {
  if (saving.value) return
  task.value = row
  draft.reason = ''
  failed.value = false
  visible.value = true
  nextTick(() => form.value?.clearValidate())
}
async function submit() {
  if (saving.value || !await form.value.validate().catch(() => false)) return
  saving.value = true
  failed.value = false
  try {
    await ElMessageBox.confirm(`确认重新核算任务 #${task.value.taskId}？满足本人全部服务条件时可能扣减一次，原权益绑定和同一配对只扣一次的规则不变。`, '确认重试', {
      type: 'warning', confirmButtonText: '确认重试', cancelButtonText: '取消', closeOnClickModal: false
    })
    await retryDeduction(task.value.taskId, { reason: draft.reason.trim() })
    visible.value = false
    ElMessage.success('重试已提交')
    emit('retried', task.value)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') failed.value = true
  } finally { saving.value = false }
}
defineExpose({ open })
</script>
