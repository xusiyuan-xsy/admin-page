<template>
  <el-dialog
    :title="isEdit ? '修改需求' : '新增需求'"
    v-model="visible"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" v-loading="loading">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="最小年龄" prop="ageMin">
            <el-input-number v-model="form.ageMin" :min="1940" :max="2030" controls-position="right" placeholder="至少 1999" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最大年龄" prop="ageMax">
            <el-input-number v-model="form.ageMax" :min="1940" :max="2030" controls-position="right" placeholder="至多 2004" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="身高(cm)" prop="heightMin">
            <el-input-number v-model="form.heightMin" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="身高(cm)" prop="heightMax">
            <el-input-number v-model="form.heightMax" :min="100" :max="250" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="学历" prop="education">
            <el-select v-model="form.education" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in educationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="家乡要求" prop="hometownRequire">
            <el-input v-model="form.hometownRequire" placeholder="家乡要求" maxlength="100" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="居住地要求" prop="cityRequire">
            <el-input v-model="form.cityRequire" placeholder="居住地要求" maxlength="100" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否有纹身" prop="noTattoo">
            <el-select v-model="form.noTattoo" placeholder="选择" clearable style="width: 100%">
              <el-option label="有" value="0" />
              <el-option label="无" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="接受异地" prop="acceptLongDist">
            <el-select v-model="form.acceptLongDist" placeholder="选择" clearable style="width: 100%">
              <el-option label="是" value="0" />
              <el-option label="否" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="吸烟习惯" prop="smokeHabit">
            <el-select v-model="form.smokeHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="饮酒习惯" prop="drinkHabit">
            <el-select v-model="form.drinkHabit" placeholder="选择" clearable style="width: 100%">
              <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="是否有车" prop="hasCar">
            <el-select v-model="form.hasCar" placeholder="选择" clearable style="width: 100%">
              <el-option label="是" value="0" />
              <el-option label="否" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="是否有房" prop="hasHouse">
            <el-select v-model="form.hasHouse" placeholder="选择" clearable style="width: 100%">
              <el-option label="是" value="0" />
              <el-option label="否" value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="其他要求" prop="otherRequire">
            <el-input v-model="form.otherRequire" type="textarea" :rows="3" placeholder="其他要求" maxlength="500" show-word-limit />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注" maxlength="500" show-word-limit />
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
import { getPayingRequirement, addPayingRequirement, updatePayingRequirement } from '@/api/system/payingUser'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  payingId: {
    type: [Number, String],
    required: true
  },
  hasRequirement: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

const { proxy } = getCurrentInstance()

const visible = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val)
})

const isEdit = ref(false)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const educationOptions = [
  { label: '大专', value: '大专' },
  { label: '研究生', value: '研究生' },
  { label: '博士', value: '博士' },
  { label: '博士后', value: '博士后' }
]

const habitOptions = [
  { label: '不吸烟', value: '0' },
  { label: '偶尔吸烟', value: '1' },
  { label: '经常吸烟', value: '2' }
]

const defaultForm = () => ({
  id: undefined,
  payingId: undefined,
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
  ageMin: [{ type: 'number', message: '最小年龄不能为空', trigger: 'blur' }],
  ageMax: [{ type: 'number', message: '最大年龄不能为空', trigger: 'blur' }]
}

watch(
  () => props.modelValue,
  async val => {
    if (val) {
      await fetchData()
    }
  }
)

async function fetchData() {
  loading.value = true
  form.value = defaultForm()
  form.value.payingId = props.payingId
  console.log(form.value);
  
  try {
    const res = await getPayingRequirement(props.payingId)
    if (res.data) {
      form.value = { ...res.data }
      isEdit.value = true
    } else {
      isEdit.value = false
    }
  } catch {
    isEdit.value = props.hasRequirement
  } finally {
    loading.value = false
  }
}

function submitForm() {
  formRef.value.validate(valid => {
    if (!valid) return
    submitting.value = true
    const data = { ...form.value, payingId: props.payingId }
    const request = isEdit.value ? updatePayingRequirement(data) : addPayingRequirement(data)
    request
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
  form.value = defaultForm()
  visible.value = false
}
</script>
