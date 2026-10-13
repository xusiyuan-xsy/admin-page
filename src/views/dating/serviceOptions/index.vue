<template>
  <div class="app-container">
    <el-form inline @submit.prevent="load">
      <el-form-item label="状态">
        <el-select v-model="status" clearable placeholder="全部" style="width: 140px">
          <el-option label="启用" value="0" /><el-option label="停用" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item><el-button icon="Search" type="primary" @click="load">查询</el-button></el-form-item>
      <el-form-item><el-button icon="Plus" @click="edit()" v-hasPermi="['dating:option:add']">新增选项</el-button></el-form-item>
    </el-form>
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="code" label="编码" min-width="190" />
      <el-table-column prop="name" label="选项名称" min-width="130" />
      <el-table-column prop="completionStandard" label="完成标准" min-width="260" />
      <el-table-column label="状态" width="85">
        <template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '启用' : '停用' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="85" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="编辑选项"><el-button link icon="Edit" aria-label="编辑选项" @click="edit(row)" v-hasPermi="['dating:option:edit']" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="open" :title="form.optionId ? '编辑服务选项' : '新增服务选项'" width="560px" style="max-width: 94vw" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="选项编码" prop="code"><el-input v-model="form.code" :disabled="!!form.optionId" maxlength="50" placeholder="例如 FRIEND_ADDED" /></el-form-item>
        <el-form-item label="选项名称" prop="name"><el-input v-model="form.name" maxlength="100" /></el-form-item>
        <el-form-item label="完成标准" prop="completionStandard"><el-input v-model="form.completionStandard" type="textarea" :rows="4" maxlength="500" show-word-limit /></el-form-item>
        <el-form-item label="状态" prop="status"><el-radio-group v-model="form.status"><el-radio value="0">启用</el-radio><el-radio value="1">停用</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer><el-button @click="open = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="DatingServiceOptions">
import { listServiceOptions, saveServiceOption } from '@/api/dating/billing'
const { proxy } = getCurrentInstance()
const rows = ref([])
const status = ref('')
const loading = ref(false)
const saving = ref(false)
const open = ref(false)
const form = ref({})
const formRef = ref()
const rules = {
  code: [{ required: true, pattern: /^[A-Z][A-Z0-9_]{1,49}$/, message: '编码为2-50位大写字母、数字或下划线，以字母开头', trigger: 'blur' }],
  name: [{ required: true, whitespace: true, message: '请输入选项名称', trigger: 'blur' }],
  completionStandard: [{ required: true, whitespace: true, message: '请输入完成标准', trigger: 'blur' }]
}
async function load() {
  loading.value = true
  try { rows.value = (await listServiceOptions({ status: status.value })).data }
  finally { loading.value = false }
}
function edit(row) {
  form.value = row ? { ...row } : { code: '', name: '', completionStandard: '', status: '0' }
  open.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function save() {
  if (saving.value || !await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    await saveServiceOption(form.value)
    proxy.$modal.msgSuccess('服务选项已保存')
    open.value = false
    await load()
  } finally { saving.value = false }
}
onMounted(load)
</script>
