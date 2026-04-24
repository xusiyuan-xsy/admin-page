<template>
  <div class="app-container">
    <!-- 搜索表单 -->
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="套餐名称" prop="packageName">
        <el-input
          v-model="queryParams.packageName"
          placeholder="请输入套餐名称"
          clearable
          style="width: 200px"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <!-- <el-form-item label="套餐类型" prop="packageType">
        <el-select v-model="queryParams.packageType" placeholder="请选择套餐类型" clearable style="width: 160px">
          <el-option v-for="dict in sys_dating_package_type" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item> -->
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="套餐状态" clearable style="width: 200px">
          <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" style="width: 308px">
        <el-date-picker
          v-model="dateRange"
          value-format="YYYY-MM-DD"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮栏 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:datingPackage:add']">新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate()" v-hasPermi="['system:datingPackage:edit']">修改</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete()" v-hasPermi="['system:datingPackage:remove']">删除</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns" storageKey="datingPackageColumns" />
    </el-row>

    <!-- 数据表格 -->
    <el-table v-loading="loading" :data="packageList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="编号" align="center" prop="packageId" width="70" v-if="columns.packageId.visible" />
      <el-table-column label="封面" align="center" prop="coverImage" width="92" v-if="columns.coverImage.visible">
        <template #default="scope">
          <el-image
            v-if="scope.row.coverImage"
            :src="scope.row.coverImage"
            :preview-src-list="[scope.row.coverImage]"
            :initial-index="0"
            preview-teleported
            fit="cover"
            style="width: 44px; height: 44px; border-radius: 6px"
          />
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="套餐名称" align="center" prop="packageName" v-if="columns.packageName.visible" :show-overflow-tooltip="true" min-width="120" />
      <!-- <el-table-column label="套餐类型" align="center" prop="packageType" v-if="columns.packageType.visible" width="110">
        <template #default="scope">
          <dict-tag :options="sys_dating_package_type" :value="scope.row.packageType" />
        </template>
      </el-table-column> -->
      <el-table-column label="价格(元)" align="center" prop="price" v-if="columns.price.visible" width="100">
        <template #default="scope">
          <span>{{ scope.row.price != null ? scope.row.price : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="限制天数" align="center" prop="limitExpire" v-if="columns.limitExpire.visible" width="90">
        <template #default="scope">
          <el-tag v-if="scope.row.limitExpire === '1'" type="warning">是</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="服务时长(天)" align="center" prop="serviceDuration" v-if="columns.serviceDuration.visible" width="100" />
      <el-table-column label="限制次数" align="center" prop="limitServiceTimes" v-if="columns.limitServiceTimes.visible" width="90">
        <template #default="scope">
          <el-tag v-if="scope.row.limitServiceTimes === '1'" type="warning">是</el-tag>
          <el-tag v-else type="info">否</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="服务次数" align="center" prop="serviceTimes" v-if="columns.serviceTimes.visible" width="90" />
      <el-table-column label="排序" align="center" prop="sortOrder" v-if="columns.sortOrder.visible" width="80" />
      <el-table-column label="描述" align="center" prop="description" v-if="columns.description.visible" :show-overflow-tooltip="true" min-width="150" />
      <el-table-column label="状态" align="center" prop="status" v-if="columns.status.visible" width="88">
        <template #default="scope">
          <el-switch
            v-model="scope.row.status"
            active-value="0" 
            inactive-value="1"
            @change="handleStatusChange(scope.row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" v-if="columns.createTime.visible" width="160">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="120" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-tooltip content="修改" placement="top">
            <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:datingPackage:edit']" />
          </el-tooltip>
          <el-tooltip content="删除" placement="top">
            <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:datingPackage:remove']" />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />

    <!-- 新增/修改对话框 -->
    <el-dialog :title="title" v-model="open" width="640px" append-to-body :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" ref="packageRef" label-width="140px">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="套餐名称" prop="packageName">
              <el-input v-model="form.packageName" placeholder="请输入套餐名称" maxlength="100" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="套餐类型" prop="packageType">
              <el-select v-model="form.packageType" placeholder="请选择套餐类型" clearable style="width: 100%">
                <el-option v-for="dict in sys_dating_package_type" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row> -->
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="价格(元)" prop="price">
              <el-input-number v-model="form.price" :min="0" :precision="2" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="排序" prop="sortOrder">
              <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="是否限制服务天数" prop="limitExpire">
              <el-radio-group v-model="form.limitExpire">
                <el-radio value="0">否</el-radio>
                <el-radio value="1">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.limitExpire === '1'" label="服务时长(天)" prop="serviceDuration">
              <el-input-number v-model="form.serviceDuration" :min="1" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="是否限制服务次数" prop="limitServiceTimes">
              <el-radio-group v-model="form.limitServiceTimes">
                <el-radio value="0">否</el-radio>
                <el-radio value="1">是</el-radio>    
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item v-if="form.limitServiceTimes === '1'" label="服务次数" prop="serviceTimes">
              <el-input-number v-model="form.serviceTimes" :min="0" controls-position="right" style="width: 100%"  />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="套餐封面" prop="coverImage">
              <image-upload v-model="form.coverImage" action="/oss/upload" name="file" :limit="1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="套餐描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入套餐描述" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="DatingPackage">
import { listDatingPackage, getDatingPackage, addDatingPackage, updateDatingPackage, delDatingPackage } from '@/api/system/datingPackage'

const { proxy } = getCurrentInstance()
const { sys_normal_disable} = proxy.useDict('sys_normal_disable')

const packageList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref('')
const dateRange = ref([])

const columns = ref({
  packageId:   { label: '编号',       visible: true },
  coverImage:  { label: '封面',       visible: true },
  packageName: { label: '套餐名称',   visible: true },
  // packageType: { label: '套餐类型',   visible: true },
  price:       { label: '价格',       visible: true },
  limitExpire: { label: '限制天数',   visible: true },
  serviceDuration:    { label: '服务时长',     visible: true },
  limitServiceTimes: { label: '限制次数',   visible: true },
  serviceTimes:  { label: '服务次数',   visible: true },
  sortOrder: { label: '排序',   visible: true },
  description: { label: '描述',       visible: true },
  status:      { label: '状态',       visible: true },
  createTime:  { label: '创建时间',   visible: true }
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    packageName: undefined,
    // packageType: undefined,
    status: undefined
  },
  rules: {
    packageName: [{ required: true, message: '套餐名称不能为空', trigger: 'blur' }],
    // packageType: [{ required: false, message: '请选择套餐类型', trigger: 'change' }],
    price: [{ required: true, message: '价格不能为空', trigger: 'blur' }],
    limitExpire: [{ required: true, message: '请选择是否限制服务天数', trigger: 'change' }],
    limitServiceTimes: [{ required: true, message: '请选择是否限制服务次数', trigger: 'change' }],
    serviceDuration: [
      {
        validator: (rule, value, callback) => {
          if (form.value?.limitExpire !== '1') return callback()
          if (value == null || value === '' || Number(value) <= 0) return callback(new Error('服务时长不能为空'))
          callback()
        },
        trigger: ['blur', 'change']
      }
    ],
    serviceTimes: [
      {
        validator: (rule, value, callback) => {
          if (form.value?.limitServiceTimes !== '1') return callback()
          if (value == null || value === '' || Number(value) <= 0) return callback(new Error('服务次数不能为空'))
          callback()
        },
        trigger: ['blur', 'change']
      }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listDatingPackage(proxy.addDateRange(queryParams.value, dateRange.value)).then(res => {
    loading.value = false
    packageList.value = res.rows
    total.value = res.total
  }).catch(() => {
    loading.value = false
  })
}

function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

function resetQuery() {
  dateRange.value = []
  proxy.resetForm('queryRef')
  handleQuery()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.packageId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function reset() {
  form.value = {
    packageId: undefined,
    packageName: undefined,
    // packageType: undefined,
    price: undefined,
    limitExpire: '0',
    serviceDuration: 0,
    limitServiceTimes: '0',
    serviceTimes: 0,
    coverImage: '',
    sortOrder: 0,
    description: undefined,
    status: '0',
  }
  proxy.resetForm('packageRef')
}

watch(() => form.value?.limitExpire, (val) => {
  if (val !== '1') form.value.serviceDuration = 0
})

watch(() => form.value?.limitServiceTimes, (val) => {
  if (val !== '1') form.value.serviceTimes = 0
})

function cancel() {
  open.value = false
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = '新增套餐'
}

function handleUpdate(row) {
  reset()
  const id = row?.packageId ?? ids.value[0]
  getDatingPackage(id).then(res => {
    form.value = res.data
    open.value = true
    title.value = '修改套餐'
  })
}

function handleDelete(row) {
  const packageIds = row?.packageId ?? ids.value.join(',')
  proxy.$modal.confirm('是否确认删除套餐编号为"' + packageIds + '"的数据项？').then(() => {
    return delDatingPackage(packageIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess('删除成功')
  }).catch(() => {})
}

function handleStatusChange(row) {
  const text = row.status === '0' ? '启用' : '停用'
  proxy.$modal.confirm('确认要"' + text + '""' + row.packageName + '"套餐吗？').then(() => {
    return updateDatingPackage({ packageId: row.packageId, status: row.status })
  }).then(() => {
    proxy.$modal.msgSuccess(text + '成功')
  }).catch(() => {
    row.status = row.status === '0' ? '1' : '0'
  })
}

function submitForm() {
  proxy.$refs['packageRef'].validate(valid => {
    if (!valid) return
    if (form.value.packageId != null) {
      updateDatingPackage(form.value).then(() => {
        proxy.$modal.msgSuccess('修改成功')
        open.value = false
        getList()
      })
    } else {
      addDatingPackage(form.value).then(() => {
        proxy.$modal.msgSuccess('新增成功')
        open.value = false
        getList()
      })
    }
  })
}

onMounted(() => {
  getList()
})
</script>
