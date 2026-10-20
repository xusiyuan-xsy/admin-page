<template>
  <el-dialog
    :title="isEdit ? '修改需求' : '新增需求'"
    v-model="visible"
    width="800px"
    style="max-width: calc(100vw - 24px)"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-alert v-if="regionError" :title="regionError" type="warning" :closable="false" />
    <el-alert v-if="configError" :title="configError" type="error" :closable="false">
      <el-button link type="primary" @click="loadForm">重新加载</el-button>
    </el-alert>
    <el-form :model="form" :disabled="regionLoading" :rules="rules" ref="formRef" label-width="120px" class="requirement-form">
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="出生年份范围" :required="requiredFields.includes('ageMin') || requiredFields.includes('ageMax')">
            <div class="birth-year-range">
              <el-form-item prop="ageMin" class="birth-year-field">
                <el-input-number v-model="form.ageMin" :min="inputMin(form.ageMin, limits.ageMin)" :max="inputMax(form.ageMin, limits.ageMax)" :precision="0" controls-position="right" placeholder="最早出生年份" aria-label="最早出生年份" style="width: 100%" @change="formRef?.validateField('ageMax')" />
              </el-form-item>
              <span class="birth-year-separator" aria-hidden="true">~</span>
              <el-form-item prop="ageMax" class="birth-year-field">
                <el-input-number v-model="form.ageMax" :min="inputMin(form.ageMax, limits.ageMin)" :max="inputMax(form.ageMax, limits.ageMax)" :precision="0" controls-position="right" placeholder="最晚出生年份" aria-label="最晚出生年份" style="width: 100%" @change="formRef?.validateField('ageMin')" />
              </el-form-item>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最低身高(cm)" prop="heightMin">
            <el-input-number v-model="form.heightMin" :min="inputMin(form.heightMin, limits.heightMin)" :max="inputMax(form.heightMin, limits.heightMax)" :precision="0" controls-position="right" style="width: 100%" @change="formRef?.validateField('heightMax')" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最高身高(cm)" prop="heightMax">
            <el-input-number v-model="form.heightMax" :min="inputMin(form.heightMax, limits.heightMin)" :max="inputMax(form.heightMax, limits.heightMax)" :precision="0" controls-position="right" style="width: 100%" @change="formRef?.validateField('heightMin')" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="吸烟要求" prop="smokeHabit">
            <el-select v-model="form.smokeHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions.filter(o => o.value || !requiredFields.includes('smokeHabit'))" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="饮酒要求" prop="drinkHabit">
            <el-select v-model="form.drinkHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions.filter(o => o.value || !requiredFields.includes('drinkHabit'))" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
         <el-form-item label="是否要求无纹身" prop="noTattoo">
           <el-select v-model="form.noTattoo" placeholder="选择" clearable style="width: 100%">
             <el-option label="不限" value="0" />
             <el-option label="要求无纹身" value="1" />
           </el-select>
         </el-form-item>
       </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否要求有房" prop="hasHouse">
            <el-select v-model="form.hasHouse" placeholder="选择" clearable style="width: 100%">
              <el-option label="不限" value="0" />
              <el-option label="要求有房" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否要求有车" prop="hasCar">
            <el-select v-model="form.hasCar" placeholder="选择" clearable style="width: 100%">
              <el-option label="不限" value="0" />
              <el-option label="要求有车" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
     
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="学历" prop="education">
            <el-select v-model="form.education" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in sys_user_education" :key="opt.value" :label="opt.value === '0' ? '不限' : opt.label+'及以上'" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="家乡要求" prop="hometownRequire">
            <region-cascader v-model="form.hometownRequireCode" v-model:name="form.hometownRequire" :check-strictly="true" :placeholder="form.hometownRequire || '选择家乡要求 省/市/区'" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否接受异地" prop="acceptLongDist">
            <el-select v-model="form.acceptLongDist" placeholder="选择" clearable style="width: 100%">
              <el-option v-if="!requiredFields.includes('acceptLongDist')" label="不限" value="" />
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="form.acceptLongDist === '0' || requiredFields.includes('cityRequire')">
          <el-form-item label="现居城市要求" prop="cityRequire" :required="form.acceptLongDist === '0' || requiredFields.includes('cityRequire')">
            <region-cascader v-model="form.cityRequireCode" v-model:name="form.cityRequire" :check-strictly="true" :placeholder="form.cityRequire || '选择现居城市要求 省/市/区'" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="其他要求" prop="otherRequire">
            <el-input v-model="form.otherRequire" type="textarea" :rows="3" placeholder="输入其他要求" maxlength="500" show-word-limit />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="输入备注" maxlength="500" show-word-limit />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="submitForm" :disabled="regionLoading || !!configError" :loading="submitting">确定</el-button>
        <el-button @click="handleClose">取消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { addPayingRequirement, updatePayingRequirement } from '@/api/system/payingUser'
import RegionCascader from '@/components/RegionCascader/index.vue'
import { listRegion } from '@/api/system/region'
import { hydrateRequirementRegions } from '@/utils/archiveRegions'
import { getActiveMatchmakerConfig } from '@/api/dating/matchmakerConfig'
import { requirementLimits, applyRequirementDefaults, requirementFieldError } from '@/utils/matchmakerConfig'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  payingId: {
    type: [Number, String],
    required: true
  },
  requirement: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const { proxy } = getCurrentInstance()

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isEdit = computed(() => !!(props.requirement && Object.keys(props.requirement).length > 0))
const submitting = ref(false)
const formRef = ref(null)
const { sys_user_education } = proxy.useDict("sys_user_education")

const habitOptions = [
  { label: '不限', value: '' },
  { label: '无', value: '0' },
  { label: '最多偶尔', value: '1' },
  { label: '可接受经常', value: '2' }
]

const defaultForm = () => ({
  id: undefined,
  payingId: props.payingId,
  ageMin: undefined,
  ageMax: undefined,
  heightMin: undefined,
  heightMax: undefined,
  education: undefined,
  hometownRequire: undefined,
  hometownRequireCode: undefined,
  cityRequire: undefined,
  cityRequireCode: undefined,
  noTattoo: undefined,
  acceptLongDist: undefined,
  smokeHabit: undefined,
  drinkHabit: undefined,
  hasCar: undefined,
  hasHouse: undefined,
  otherRequire: undefined,
  remark: undefined
})

const form = ref(defaultForm())
const regionLoading = ref(false)
const regionError = ref('')
let regionRequest = 0
const activeConfig = ref(null)
const configError = ref('')
const currentYear = ref(new Date().getFullYear())
const fieldLabels = ref({})
const requiredFields = computed(() => activeConfig.value?.requiredFields || [])
const limits = computed(() => requirementLimits(activeConfig.value, currentYear.value))
// Keep existing out-of-range values visible until the user corrects them; do not silently clamp saved needs.
const inputMin = (value, min) => value == null ? min : Math.min(value, min)
const inputMax = (value, max) => value == null ? max : Math.max(value, max)

const rules = computed(() => Object.fromEntries(
  [...new Set(['ageMin', 'ageMax', 'heightMin', 'heightMax', 'cityRequire', ...requiredFields.value])]
    .map(field => [field, [{
      required: requiredFields.value.includes(field) || (field === 'cityRequire' && form.value.acceptLongDist === '0'),
      validator: (_, value, done) => {
        const message = requirementFieldError(field, value, form.value, activeConfig.value, currentYear.value, fieldLabels.value)
        done(message ? new Error(message) : undefined)
      }, trigger: ['blur', 'change']
    }]])
))

async function loadForm() {
  const current = ++regionRequest
  if (!props.modelValue) return
  form.value = { ...defaultForm(), ...props.requirement }
  regionLoading.value = true
  regionError.value = ''
  configError.value = ''
  activeConfig.value = null
  try {
    try {
      const { data } = await getActiveMatchmakerConfig()
      if (current !== regionRequest) return
      activeConfig.value = data.config
      currentYear.value = data.currentYear
      fieldLabels.value = data.fields
      if (!isEdit.value) form.value = applyRequirementDefaults(form.value, data.config, data.currentYear)
    } catch {
      if (current === regionRequest) configError.value = '红娘功能配置加载失败，暂不能保存需求'
    }
    if (current !== regionRequest) return
    const codes = await hydrateRequirementRegions(form.value, parent => listRegion(parent).then(res => res.data || []))
    if (current !== regionRequest) return
    Object.assign(form.value, codes)
    if ((form.value.cityRequire && !codes.cityRequireCode) || (form.value.hometownRequire && !codes.hometownRequireCode))
      regionError.value = '部分地区暂未解析，已保留原需求名称'
  } catch {
    if (current === regionRequest) regionError.value = '地区加载失败，已保留原需求名称'
  } finally {
    if (current === regionRequest) {
      regionLoading.value = false
      nextTick(() => formRef.value?.clearValidate())
    }
  }
}
watch(() => props.modelValue, loadForm, { immediate: true })

function submitForm() {
  if (submitting.value || regionLoading.value || configError.value) return
  formRef.value.validate(valid => {
    if (!valid) return
    submitting.value = true
    const data = { ...form.value, payingId: props.payingId }
    if (data.acceptLongDist !== '0' && !requiredFields.value.includes('cityRequire')) {
      data.cityRequire = ''
      data.cityRequireCode = ''
    }
    const api = isEdit.value ? updatePayingRequirement(data) : addPayingRequirement(data)
    api
      .then(() => {
        proxy.$modal.msgSuccess(isEdit.value ? '修改成功' : '新增成功')
        emit('success')
        handleClose()
      })
      .finally(() => {
        submitting.value = false
      })
  })
}

function handleClose() {
  formRef.value?.resetFields()
  visible.value = false
}
</script>

<style scoped>
.requirement-form :deep(.el-form-item__content) { min-width: 0; }
.requirement-form :deep(.el-form-item__error) {
  position: static;
  flex-basis: 100%;
  padding-top: 4px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.birth-year-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  width: 100%;
  min-width: 0;
}
.requirement-form .birth-year-field {
  min-width: 0;
  margin-bottom: 0;
}
.birth-year-separator {
  line-height: var(--el-component-size, 32px);
  color: var(--el-text-color-secondary);
  text-align: center;
}
@media (max-width: 600px) {
  .requirement-form :deep(.el-col-12) { max-width: 100%; flex-basis: 100%; }
  .requirement-form :deep(.el-form-item) { display: block; width: 100%; }
  .requirement-form :deep(.el-form-item__content) { margin-left: 0 !important; }
  .requirement-form :deep(.el-form-item__label) { width: auto !important; }
}
</style>
