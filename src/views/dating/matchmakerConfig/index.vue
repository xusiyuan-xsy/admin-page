<template>
  <div class="app-container matchmaker-config">
    <el-form inline @submit.prevent="search">
      <el-form-item label="配置名称"><el-input v-model="query.name" clearable placeholder="请输入配置名称" @keyup.enter="search" /></el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">查询</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
        <el-button icon="Plus" @click="edit()" v-hasPermi="['dating:matchmakerConfig:add']">新增配置</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="rows" v-loading="loading">
      <el-table-column prop="name" label="配置名称" min-width="170" show-overflow-tooltip />
      <el-table-column label="默认" width="85"><template #default="{ row }"><el-tag v-if="row.defaultConfig" type="success">默认</el-tag><span v-else>-</span></template></el-table-column>
      <el-table-column prop="watermarkText" label="图片水印文字" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ row.watermarkText || '无水印' }}</template></el-table-column>
      <el-table-column label="出生年份范围" width="155"><template #default="{ row }">{{ range(row.minAge, row.maxAge) }}</template></el-table-column>
      <el-table-column label="身高范围（cm）" width="150"><template #default="{ row }">{{ range(row.minHeight, row.maxHeight) }}</template></el-table-column>
      <el-table-column label="需求必填项" min-width="240" show-overflow-tooltip><template #default="{ row }">{{ row.requiredFields.map(key => fields[key] || key).join('、') || '无新增必填项' }}</template></el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="165" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="编辑配置"><el-button link icon="Edit" aria-label="编辑配置" :disabled="busy" @click="edit(row)" v-hasPermi="['dating:matchmakerConfig:edit']" /></el-tooltip>
          <el-tooltip content="设为默认"><el-button link icon="Star" aria-label="设为默认" :disabled="busy || row.defaultConfig" @click="makeDefault(row)" v-hasPermi="['dating:matchmakerConfig:default']" /></el-tooltip>
          <el-tooltip content="删除配置"><el-button link type="danger" icon="Delete" aria-label="删除配置" :disabled="busy" @click="remove(row)" v-hasPermi="['dating:matchmakerConfig:remove']" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-dialog v-model="open" :title="form.configId ? '编辑红娘功能配置' : '新增红娘功能配置'"
      width="720px" style="max-width: calc(100vw - 24px)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" :disabled="saving" class="config-form">
        <el-form-item label="配置名称" prop="name"><el-input v-model="form.name" maxlength="100" show-word-limit /></el-form-item>
        <el-divider content-position="left">用户图片</el-divider>
        <el-form-item label="图片水印文字" prop="watermarkText"><el-input v-model="form.watermarkText" maxlength="100" show-word-limit clearable /></el-form-item>
        <el-divider content-position="left">用户需求</el-divider>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12"><el-form-item label="最早出生年份" prop="minAge"><el-input-number v-model="form.minAge" :min="1900" :max="currentYear" :precision="0" controls-position="right" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="最晚出生年份" prop="maxAge"><el-input-number v-model="form.maxAge" :min="1900" :max="currentYear" :precision="0" controls-position="right" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="最低身高（cm）" prop="minHeight"><el-input-number v-model="form.minHeight" :min="100" :max="250" :precision="0" controls-position="right" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="最高身高（cm）" prop="maxHeight"><el-input-number v-model="form.maxHeight" :min="100" :max="250" :precision="0" controls-position="right" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="需求必填项" prop="requiredFields">
          <el-checkbox-group v-model="form.requiredFields" class="required-fields">
            <el-checkbox v-for="(label, key) in fields" :key="key" :value="key">{{ label }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="open = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup name="DatingMatchmakerConfig">
import { listMatchmakerConfigs, getActiveMatchmakerConfig, saveMatchmakerConfig,
  setDefaultMatchmakerConfig, deleteMatchmakerConfig } from '@/api/dating/matchmakerConfig'
const { proxy } = getCurrentInstance()
const query = reactive({ name: '', pageNum: 1, pageSize: 10 })
const rows = ref([])
const total = ref(0)
const fields = ref({})
const currentYear = ref(new Date().getFullYear())
const loading = ref(false)
const saving = ref(false)
const busy = ref(false)
const open = ref(false)
const form = ref({})
const formRef = ref()
let requestId = 0
const range = (min, max) => min == null ? '沿用原规则' : `${min} - ${max}`
function validateRange(low, high, min, max, label) {
  return (_, value, done) => {
    const a = form.value[low], b = form.value[high]
    if (a == null && b == null) return done()
    if (a == null || b == null) return done(new Error('请同时填写上下限'))
    if (a > b) return done(new Error('最小值不能大于最大值'))
    const upper = typeof max === 'function' ? max() : max
    done(Number.isInteger(a) && Number.isInteger(b) && a >= min && b <= upper
      ? undefined : new Error(`${label}范围为${min}-${upper}`))
  }
}
const ageRule = { validator: validateRange('minAge', 'maxAge', 1900, () => currentYear.value, '年份'), trigger: 'blur' }
const heightRule = { validator: validateRange('minHeight', 'maxHeight', 100, 250, '身高'), trigger: 'blur' }
const rules = {
  name: [{ required: true, whitespace: true, message: '请输入配置名称', trigger: 'blur' }],
  minAge: [ageRule], maxAge: [ageRule], minHeight: [heightRule], maxHeight: [heightRule]
}
for (const pair of [['minAge', 'maxAge'], ['minHeight', 'maxHeight']]) {
  watch(() => pair.map(key => form.value[key]), () => {
    if (open.value && formRef.value?.fields.some(field => pair.includes(field.prop) && field.validateState === 'error')) {
      nextTick(() => formRef.value?.validateField(pair).catch(() => {}))
    }
  })
}
async function load() {
  const current = ++requestId
  loading.value = true
  try {
    const [list, active] = await Promise.all([listMatchmakerConfigs({ ...query }), getActiveMatchmakerConfig()])
    if (current !== requestId) return
    rows.value = list.rows || []
    total.value = list.total
    fields.value = active.data.fields
    currentYear.value = active.data.currentYear
  } finally { if (current === requestId) loading.value = false }
}
function search() { query.pageNum = 1; load() }
function reset() { query.name = ''; search() }
function edit(row) {
  form.value = row ? { ...row, requiredFields: [...row.requiredFields] }
    : { name: '', watermarkText: '', minAge: undefined, maxAge: undefined, minHeight: undefined, maxHeight: undefined, requiredFields: [] }
  open.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function save() {
  if (saving.value || !await formRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    const result = await saveMatchmakerConfig({ ...form.value, minAge: form.value.minAge ?? null,
      maxAge: form.value.maxAge ?? null, minHeight: form.value.minHeight ?? null, maxHeight: form.value.maxHeight ?? null })
    proxy.$modal.msgSuccess(result.data.defaultConfig && !form.value.configId ? '已保存并自动设为默认' : '配置已保存')
    open.value = false
    await load()
  } finally { saving.value = false }
}
async function makeDefault(row) {
  if (busy.value) return
  busy.value = true
  try {
    const { data } = await getActiveMatchmakerConfig()
    const current = data.config
    if (current?.configId === row.configId) { await load(); return }
    await proxy.$modal.confirm(current
      ? `已有默认配置“${current.name}”，是否替换为“${row.name}”？`
      : `是否将“${row.name}”设为默认配置？`)
    await setDefaultMatchmakerConfig(row.configId, { expectedDefaultId: current?.configId ?? null, version: row.version })
    proxy.$modal.msgSuccess('默认配置已更新')
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') await load()
  } finally { busy.value = false }
}
async function remove(row) {
  if (busy.value) return
  busy.value = true
  try {
    await proxy.$modal.confirm(`是否删除配置“${row.name}”？`)
    await deleteMatchmakerConfig(row.configId, row.version)
    proxy.$modal.msgSuccess('配置已删除')
    if (rows.value.length === 1 && query.pageNum > 1) query.pageNum--
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') await load()
  } finally { busy.value = false }
}
onMounted(load)
</script>

<style scoped>
.required-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; gap: 2px 12px; }
.required-fields :deep(.el-checkbox) { margin-right: 0; min-width: 0; }
.config-form :deep(.el-input-number) { width: 100%; }
.config-form :deep(.el-form-item__content) { min-width: 0; }
@media (max-width: 600px) {
  .config-form :deep(.el-form-item) { display: block; }
  .config-form :deep(.el-form-item__label) { width: auto !important; }
  .config-form :deep(.el-form-item__content) { margin-left: 0 !important; }
  .required-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
