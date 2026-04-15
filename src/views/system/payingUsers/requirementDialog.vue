<template>
  <el-dialog
    :title="isEdit ? '修改需求' : '新增需求'"
    v-model="visible"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最小出生年份" prop="ageMin" required>
            <el-input-number v-model="form.ageMin" :min="1900" controls-position="right" placeholder="例如1999" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最大出生年份" prop="ageMax" required>
            <el-input-number v-model="form.ageMax" :min="1900" controls-position="right" placeholder="例如2004" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最低身高(cm)" prop="heightMin" required>
            <el-input-number v-model="form.heightMin" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最高身高(cm)" prop="heightMax" required>
            <el-input-number v-model="form.heightMax" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否接受异地" prop="acceptLongDist" required>
            <el-select v-model="form.acceptLongDist" placeholder="选择" clearable style="width: 100%">
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="吸烟习惯" prop="smokeHabit" required>
            <el-select v-model="form.smokeHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="饮酒习惯" prop="drinkHabit" required>
            <el-select v-model="form.drinkHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否要求有车" prop="hasCar" required>
            <el-select v-model="form.hasCar" placeholder="选择" clearable style="width: 100%">
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否要求有房" prop="hasHouse" required>
            <el-select v-model="form.hasHouse" placeholder="选择" clearable style="width: 100%">
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否要求无纹身" prop="noTattoo" required>
            <el-select v-model="form.noTattoo" placeholder="选择" clearable style="width: 100%">
              <el-option label="否" value="0" />
              <el-option label="是" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="学历" prop="education" required>
            <el-select v-model="form.education" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in educationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="家乡要求" prop="hometownRequire" required>
            <el-input v-model="form.hometownRequire" placeholder="输入家乡要求" maxlength="100" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="现居城市要求" prop="cityRequire" required>
            <el-input v-model="form.cityRequire" placeholder="输入现居城市要求" maxlength="100" />
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

const educationOptions = [
  { label: '无要求', value: '无要求' },
  { label: '小学', value: '小学' },
  { label: '初中', value: '初中' },
  { label: '高中', value: '高中' },
  { label: '大专', value: '大专' },
  { label: '本科', value: '本科' },
  { label: '研究生', value: '研究生' },
  { label: '博士', value: '博士' },
  { label: '博士后', value: '博士后' }
]

const habitOptions = [
  { label: '无', value: '0' },
  { label: '偶尔', value: '1' },
  { label: '经常', value: '2' }
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
  cityRequire: undefined,
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
  ageMin: [{ required: true, message: '输入最小出生年份', trigger: 'blur' }],
  ageMax: [{ required: true, message: '输入最大出生年份', trigger: 'blur' }],
  heightMin: [{ required: true, message: '输入最低身高(cm)', trigger: 'blur' }],
  heightMax: [{ required: true, message: '输入最高身高(cm)', trigger: 'blur' }],
  acceptLongDist: [{ required: true, message: '选择是否接受异地', trigger: 'change' }],
  smokeHabit: [{ required: true, message: '选择吸烟习惯', trigger: 'change' }],
  drinkHabit: [{ required: true, message: '选择饮酒习惯', trigger: 'change' }],
  hasCar: [{ required: true, message: '选择是否要求有车', trigger: 'change' }],
  hasHouse: [{ required: true, message: '选择是否要求有房', trigger: 'change' }],
  noTattoo: [{ required: true, message: '选择是否要求无纹身', trigger: 'change' }],
  education: [{ required: true, message: '选择学历', trigger: 'change' }],
  hometownRequire: [{ required: true, message: '输入家乡要求', trigger: 'blur' }],
  cityRequire: [{ required: true, message: '输入现居城市要求', trigger: 'blur' }]
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
