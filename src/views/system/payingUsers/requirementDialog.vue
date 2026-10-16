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
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" class="requirement-form">
      <el-row :gutter="16">
        <el-form-item label="出生年份范围" style="margin-bottom: 20px;margin-left: 6px;">
          <div style="display: flex; align-items: flex-start; gap: 10px; width: 100%; min-width: 0">
            <el-form-item prop="ageMin" style="margin-bottom: 0; flex: 1">
              <el-input-number v-model="form.ageMin" :min="1900" :max="new Date().getFullYear()" controls-position="right" placeholder="例如1999" style="width: 100%" @change="formRef?.validateField('ageMax')" />
            </el-form-item>
            <span style="line-height: 32px; color: #606266">~</span>
            <el-form-item prop="ageMax" style="margin-bottom: 0; flex: 1">
              <el-input-number v-model="form.ageMax" :min="1900" :max="new Date().getFullYear()" controls-position="right" placeholder="例如2004" style="width: 100%" @change="formRef?.validateField('ageMin')" />
            </el-form-item>
          </div>
        </el-form-item>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最低身高(cm)" prop="heightMin">
            <el-input-number v-model="form.heightMin" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最高身高(cm)" prop="heightMax">
            <el-input-number v-model="form.heightMax" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="吸烟要求" prop="smokeHabit">
            <el-select v-model="form.smokeHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="饮酒要求" prop="drinkHabit">
            <el-select v-model="form.drinkHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
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
            <region-cascader v-model="form.hometownRequireCode" v-model:name="form.hometownRequire" :check-strictly="true" placeholder="选择家乡要求 省/市/区" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否接受异地" prop="acceptLongDist">
            <el-select v-model="form.acceptLongDist" placeholder="选择" clearable style="width: 100%">
              <el-option label="不限" value="" />
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="form.acceptLongDist === '0'">
          <el-form-item label="现居城市要求" prop="cityRequire" required>
            <region-cascader v-model="form.cityRequireCode" v-model:name="form.cityRequire" :check-strictly="true" placeholder="选择现居城市要求 省/市/区" />
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
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
        <el-button @click="handleClose">取消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { addPayingRequirement, updatePayingRequirement } from '@/api/system/payingUser'
import RegionCascader from '@/components/RegionCascader/index.vue'

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

const rules = {
  ageMin: [
    {
      validator: (rule, value, callback) => {
        if (value != null && form.value.ageMax != null && value > form.value.ageMax) {
          callback(new Error('最小出生年份不能大于最大出生年份'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  ageMax: [
    {
      validator: (rule, value, callback) => {
        if (value != null && form.value.ageMin != null && value < form.value.ageMin) {
          callback(new Error('最大出生年份不能小于最小出生年份'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  heightMax: [{
    validator: (rule, value, callback) => {
      callback(value != null && form.value.heightMin != null && value < form.value.heightMin
        ? new Error('最高身高不能小于最低身高') : undefined)
    },
    trigger: 'change'
  }],
  cityRequire: [{ required: true, message: '选择现居城市要求', trigger: 'change' }]
}

onMounted(() => {
  if (props.requirement) {
    form.value = { ...props.requirement }
  }
})

function submitForm() {
  formRef.value.validate(valid => {
    if (!valid) return
    submitting.value = true
    const data = { ...form.value, payingId: props.payingId }
    if (data.acceptLongDist !== '0') {
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
@media (max-width: 600px) {
  .requirement-form :deep(.el-col-12) { max-width: 100%; flex-basis: 100%; }
  .requirement-form :deep(.el-form-item) { display: block; width: 100%; }
  .requirement-form :deep(.el-form-item__content) { margin-left: 0 !important; }
  .requirement-form :deep(.el-form-item__label) { width: auto !important; }
}
</style>
