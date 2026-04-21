<template>
  <div class="app-container tree-sidebar-manage-wrap">
    <div class="tree-sidebar-content">
      <div class="content-inner">
        <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
          <el-form-item label="用户名称" prop="name">
            <el-input v-model="queryParams.name" placeholder="请输入用户名称" clearable style="width: 240px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="手机号码" prop="phone">
            <el-input v-model="queryParams.phone" placeholder="请输入手机号码" clearable style="width: 240px" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="用户状态" clearable style="width: 240px">
              <el-option v-for="dict in sys_normal_disable" :key="dict.value" :label="dict.label" :value="dict.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="创建时间" style="width: 308px">
            <el-date-picker v-model="dateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始日期" end-placeholder="结束日期"></el-date-picker>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <el-row :gutter="10" class="mb8">
          <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['system:user:add']">新增</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['system:user:edit']">修改</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['system:user:remove']">删除</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="info" plain icon="Upload" @click="handleImport" v-hasPermi="['system:user:import']">导入</el-button>
          </el-col>
          <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['system:user:export']">导出</el-button>
          </el-col>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :columns="columns" storageKey="xxxxxxxx"></right-toolbar>
        </el-row>

        <el-table v-loading="loading" :data="userList" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="50" align="center" />
          <el-table-column label="编号" align="center" key="id" prop="id" width="70" v-if="columns.id.visible" />
          <el-table-column label="姓名" align="center" key="name" prop="name" v-if="columns.name.visible" :show-overflow-tooltip="true" min-width="100" />
          <el-table-column label="手机号码" align="center" key="phone" prop="phone" v-if="columns.phone.visible" width="118" />
          <el-table-column label="性别" align="center" key="sex" prop="sex" v-if="columns.sex.visible" width="72">
            <template #default="scope">
              <dict-tag :options="sys_user_sex" :value="scope.row.sex" />
            </template>
          </el-table-column>
          <el-table-column label="出生年份" align="center" key="birthYear" prop="birthYear" v-if="columns.birthYear.visible" width="88" />
          <el-table-column label="学历" align="center" key="education" prop="education" v-if="columns.education.visible" min-width="88">
            <template #default="scope">
              <dict-tag :options="sys_user_education" :value="scope.row.education" />
            </template>
          </el-table-column>
          <el-table-column label="职业" align="center" key="occupation" prop="occupation" v-if="columns.occupation.visible" :show-overflow-tooltip="true" min-width="100" />
          <el-table-column label="现居城市" align="center" key="currentCity" prop="currentCity" v-if="columns.currentCity.visible" :show-overflow-tooltip="true" min-width="88" />
          <el-table-column label="月收入" align="center" key="monthlyIncome" prop="monthlyIncome" v-if="columns.monthlyIncome.visible" width="96">
            <template #default="scope">
              <span>{{ scope.row.monthlyIncome != null && scope.row.monthlyIncome !== '' ? scope.row.monthlyIncome : '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" align="center" key="status" v-if="columns.status.visible" width="88">
            <template #default="scope">
              <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" key="createTime" prop="createTime" v-if="columns.createTime.visible" width="160">
            <template #default="scope">
              <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
            <template #default="scope">
              <el-tooltip content="修改" placement="top">
                <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['system:payingUsers:edit']"></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['system:payingUsers:remove']"></el-button>
              </el-tooltip>
              <el-tooltip :content="scope.row.requirement ? '修改需求' : '新增需求'" placement="top">
                <el-button link type="primary" icon="document" @click="handleDocument(scope.row)" v-hasPermi="['system:payingUsers:document']"></el-button>
              </el-tooltip>
              <el-tooltip content="查询匹配" placement="top">
                <el-button link type="primary" icon="search" v-if="scope.row.requirement" @click="handleQueryMatching(scope.row)" v-hasPermi="['system:payingUsers:queryMatching']"></el-button>
              </el-tooltip>
              <!-- <el-tooltip content="重置密码" placement="top">
                <el-button link type="primary" icon="Key" @click="handleResetPwd(scope.row)" v-hasPermi="['system:user:resetPwd']"></el-button>
              </el-tooltip> -->
              
            </template>
          </el-table-column>
        </el-table>
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </div>

    <!-- 添加或修改用户配置对话框 -->
    <el-dialog :title="title" v-model="open" width="960px" append-to-body>
      <el-form :model="form" :rules="rules" ref="payingUserRef" label-width="108px">
        <!-- 必填项 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="姓名" prop="name" required>
              <el-input v-model="form.name" placeholder="请输入姓名" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号码" maxlength="11" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item v-if="form.id == undefined" label="用户密码" prop="password">
              <el-input v-model="form.password" placeholder="请输入用户密码" type="password" maxlength="20" show-password />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="sex" required>
              <el-select v-model="form.sex" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="dict in sys_user_sex" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="出生年份" prop="birthYear" required>
              <el-input-number v-model="form.birthYear" :min="1940" :max="2030" controls-position="right" placeholder="年份" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身高(cm)" prop="height" required>
              <el-input-number v-model="form.height" :min="100" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="体重(kg)" prop="weight" required>
              <el-input-number v-model="form.weight" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="现居城市" prop="currentCity" required>
              <el-input v-model="form.currentCity" placeholder="请输入现居城市" maxlength="80" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="家乡" prop="hometown" required>
              <el-input v-model="form.hometown" placeholder="请输入家乡" maxlength="80" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="接受异地" prop="acceptLongDist" required>
              <el-select v-model="form.acceptLongDist" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in yesNoOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
        
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="是否有车" prop="hasCar" required>
              <el-select v-model="form.hasCar" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in yesNoOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否有纹身" prop="hasTattoo" required>
              <el-select v-model="form.hasTattoo" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in yesNoOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="吸烟习惯" prop="smokeHabit" required>
              <el-select v-model="form.smokeHabit" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="饮酒习惯" prop="drinkHabit" required>
              <el-select v-model="form.drinkHabit" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in habitOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="是否有房" prop="hasHouse" required>
              <el-select v-model="form.hasHouse" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in yesNoOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="住房情况" prop="houseDesc">
              <el-input v-model="form.houseDesc" placeholder="如：商品房" maxlength="80" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 非必填项 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <!-- <el-form-item label="学历" prop="education">
              <el-input v-model="form.education" placeholder="请输入学历" maxlength="50" />
            </el-form-item> -->
            <el-form-item label="学历" prop="education">
              <el-select v-model="form.education" placeholder="请选择" clearable style="width: 100%">
                <el-option v-for="opt in sys_user_education" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职业" prop="occupation">
              <el-input v-model="form.occupation" placeholder="请输入职业" maxlength="80" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="月收入" prop="monthlyIncome">
              <el-input-number v-model="form.monthlyIncome" :min="0" :max="999999999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="属相" prop="zodiac">
              <el-input v-model="form.zodiac" placeholder="请输入属相" maxlength="20" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio v-for="dict in sys_normal_disable" :key="dict.value" :value="dict.value">{{ dict.label }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="个人优势" prop="advantages">
              <el-input v-model="form.advantages" type="textarea" :rows="2" placeholder="请输入个人优势" maxlength="500" show-word-limit />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="兴趣爱好" prop="hobbies">
              <el-input v-model="form.hobbies" placeholder="请输入兴趣爱好" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="家庭成员" prop="familyMembers">
              <el-input v-model="form.familyMembers" placeholder="请输入家庭成员" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="照片" prop="photos">
              <image-upload v-model="form.photos" action="/oss/upload" name="file" :limit="9" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" maxlength="500" />
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

    <!-- 需求弹窗 -->
    <requirement-dialog
      v-if="requirementDialog.visible"
      v-model="requirementDialog.visible"
      :paying-id="requirementDialog.payingId"
      :requirement="requirementDialog.requirement"
      @success="getList"
    />

    <!-- 查询匹配弹窗 -->
    <query-matching-dialog
      v-if="queryMatchingDialog.visible"
      v-model="queryMatchingDialog.visible"
      :searchParams="queryMatchingDialog.searchParams"
    />

    <!-- 用户导入对话框 -->
    <el-dialog :title="upload.title" v-model="upload.open" width="400px" append-to-body>
      <el-upload ref="uploadRef" :limit="1" accept=".xlsx, .xls" :headers="upload.headers" :action="upload.url + '?updateSupport=' + upload.updateSupport" :disabled="upload.isUploading" :on-progress="handleFileUploadProgress" :on-success="handleFileSuccess" :on-change="handleFileChange" :on-remove="handleFileRemove" :auto-upload="false" drag>
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip text-center">
            <div class="el-upload__tip">
              <el-checkbox v-model="upload.updateSupport" />是否更新已经存在的用户数据
            </div>
            <span>仅允许导入xls、xlsx格式文件。</span>
            <el-link type="primary" underline="never" style="font-size: 12px; vertical-align: baseline" @click="importTemplate">下载模板</el-link>
          </div>
        </template>
      </el-upload>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitFileForm">确 定</el-button>
          <el-button @click="upload.open = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="User">
import { getToken } from "@/utils/auth"
import useAppStore from '@/store/modules/app'
import { resetUserPwd, deptTreeSelect } from "@/api/system/user"
import { listPayingUser, getPayingUser, addPayingUser, updatePayingUser, delPayingUser } from "@/api/system/payingUser"
import RequirementDialog from './requirementDialog.vue'
import QueryMatchingDialog from './queryMatchingDialog.vue'

const router = useRouter()
const appStore = useAppStore()
const { proxy } = getCurrentInstance()

const requirementDialog = reactive({
  visible: false,
  payingId: undefined,
  requirement: {}
})

const queryMatchingDialog = reactive({
  visible: false,
  searchParams: {}
})
const { sys_normal_disable, sys_user_sex,sys_user_education } = proxy.useDict("sys_normal_disable", "sys_user_sex","sys_user_education")

const userList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const title = ref("")
const dateRange = ref([])
const initPassword = ref(undefined)

const yesNoOptions = [
  { label: "否", value: "0" },
  { label: "是", value: "1" }
]
const habitOptions = [
  { label: "否", value: "0" },
  { label: "偶尔", value: "1" },
  { label: "是", value: "2" }
]
/*** 用户导入参数 */
const upload = reactive({
  // 是否显示弹出层（用户导入）
  open: false,
  // 弹出层标题（用户导入）
  title: "",
  // 是否禁用上传
  isUploading: false,
  // 是否更新已经存在的用户数据
  updateSupport: 0,
  // 设置上传的请求头部
  headers: { Authorization: "Bearer " + getToken() },
  // 上传的地址
  url: import.meta.env.VITE_APP_BASE_API + "/system/payingUsers/importData"
})
// 列显隐信息
const columns = ref({
  id: { label: "编号", visible: true },
  name: { label: "姓名", visible: true },
  phone: { label: "手机号码", visible: true },
  sex: { label: "性别", visible: true },
  birthYear: { label: "出生年份", visible: true },
  education: { label: "学历", visible: true },
  occupation: { label: "职业", visible: true },
  currentCity: { label: "现居城市", visible: true },
  monthlyIncome: { label: "月收入", visible: true },
  status: { label: "状态", visible: true },
  createTime: { label: "创建时间", visible: true }
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    phone: undefined,
    status: undefined,
    deptId: undefined
  },
  rules: {
    name: [
      { required: true, message: "姓名不能为空", trigger: "blur" }
    ],
    sex: [
      { required: true, message: "请选择性别", trigger: "change" }
    ],
    birthYear: [
      { required: true, message: "出生年份不能为空", trigger: "blur" }
    ],
    height: [
      { required: true, message: "身高不能为空", trigger: "blur" }
    ],
    weight: [
      { required: true, message: "体重不能为空", trigger: "blur" }
    ],
    currentCity: [
      { required: true, message: "现居城市不能为空", trigger: "blur" }
    ],
    hometown: [
      { required: true, message: "家乡不能为空", trigger: "blur" }
    ],
    hasHouse: [
      { required: true, message: "请选择是否有房", trigger: "change" }
    ],
    hasCar: [
      { required: true, message: "请选择是否有车", trigger: "change" }
    ],
    hasTattoo: [
      { required: true, message: "请选择是否有纹身", trigger: "change" }
    ],
    smokeHabit: [
      { required: true, message: "请选择吸烟习惯", trigger: "change" }
    ],
    drinkHabit: [
      { required: true, message: "请选择饮酒习惯", trigger: "change" }
    ],
    acceptLongDist: [
      { required: true, message: "请选择是否接受异地", trigger: "change" }
    ],
    phone: [
      { required: true, message: "手机号码不能为空", trigger: "blur" },
      { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号码", trigger: "blur" }
    ],
    password: [
      {
        validator: (rule, value, callback) => {
          if (data.form.id !== undefined && data.form.id !== null && data.form.id !== "") {
            callback()
            return
          }
          if (!value) {
            callback(new Error("用户密码不能为空"))
            return
          }
          if (value.length < 5 || value.length > 20) {
            callback(new Error("用户密码长度必须介于 5 和 20 之间"))
            return
          }
          if (/[<>"'|\\]/.test(value)) {
            callback(new Error("不能包含非法字符：< > \" ' \\ |"))
            return
          }
          callback()
        },
        trigger: "blur"
      }
    ]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询用户列表 */
function getList() {
  loading.value = true
  listPayingUser(proxy.addDateRange(queryParams.value, dateRange.value)).then(res => {
    loading.value = false
    userList.value = res.rows
    total.value = res.total
  })
}


/** 过滤禁用的部门 */
function filterDisabledDept(deptList) {
  return deptList.filter(dept => {
    if (dept.disabled) {
      return false
    }
    if (dept.children && dept.children.length) {
      dept.children = filterDisabledDept(dept.children)
    }
    return true
  })
}

/** 节点单击事件 */
function handleNodeClick(data) {
  queryParams.value.deptId = data.id
  handleQuery()
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  proxy.resetForm("queryRef")
  queryParams.value.deptId = undefined
  proxy.$refs.deptTreeRef?.setCurrentKey?.(null)
  handleQuery()
}

/** 删除按钮操作 */
function handleDelete(row) {
  const userIds = row.id ?? ids.value
  proxy.$modal.confirm('是否确认删除用户编号为"' + userIds + '"的数据项？').then(function () {
    return delPayingUser(userIds)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("system/payingUsers/export", {
    ...queryParams.value,
  },`payingUser_${new Date().getTime()}.xlsx`)
}

/** 更多操作 */
function handleCommand(command, row) {
  switch (command) {
    case "handleResetPwd":
      handleResetPwd(row)
      break
    default:
      break
  }
}


/** 重置密码按钮操作 */
function handleResetPwd(row) {
  const displayName = row.name || row.userName || row.phone
  proxy.$prompt('请输入"' + displayName + '"的新密码', "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    closeOnClickModal: false,
    inputPattern: /^.{5,20}$/,
    inputErrorMessage: "用户密码长度必须介于 5 和 20 之间",
    inputValidator: (value) => {
      if (/<|>|"|'|\||\\/.test(value)) {
        return "不能包含非法字符：< > \" ' \\\ |"
      }
    },
  }).then(({ value }) => {
    resetUserPwd(row.id ?? row.userId, value).then(() => {
      proxy.$modal.msgSuccess("修改成功，新密码是：" + value)
    })
  }).catch(() => {})
}

/** 选择条数  */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length != 1
  multiple.value = !selection.length
}

/** 导入按钮操作 */
function handleImport() {
  upload.title = "用户导入"
  upload.open = true
  upload.selectedFile = null
}

/** 下载模板操作 */
function importTemplate() {
  proxy.download("system/payingUsers/importTemplate", {
  }, `payingUser_template_${new Date().getTime()}.xlsx`)
}

/**文件上传中处理 */
const handleFileUploadProgress = (event, file, fileList) => {
  upload.isUploading = true
}

/** 文件选择处理 */
const handleFileChange = (file, fileList) => {
  upload.selectedFile = file
}

/** 文件删除处理 */
const handleFileRemove = (file, fileList) => {
  upload.selectedFile = null
}

/** 文件上传成功处理 */
const handleFileSuccess = (response, file, fileList) => {
  upload.open = false
  upload.isUploading = false
  proxy.$refs["uploadRef"].handleRemove(file)
  proxy.$alert("<div style='overflow: auto;overflow-x: hidden;max-height: 70vh;padding: 10px 20px 0;'>" + response.msg + "</div>", "导入结果", { dangerouslyUseHTMLString: true })
  getList()
}

/** 提交上传文件 */
function submitFileForm() {
  const file = upload.selectedFile
  if (!file || file.length === 0 || !file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx')) {
    proxy.$modal.msgError("请选择后缀为 “xls”或“xlsx”的文件。")
    return
  }
  proxy.$refs["uploadRef"].submit()
}

/** 重置操作表单 */
function reset() {
  form.value = {
    id: undefined,
    name: undefined,
    phone: undefined,
    password: undefined,
    sex: undefined,
    birthYear: undefined,
    height: undefined,
    weight: undefined,
    education: undefined,
    occupation: undefined,
    monthlyIncome: undefined,
    currentCity: undefined,
    hometown: undefined,
    houseDesc: undefined,
    hasHouse: undefined,
    hasCar: undefined,
    hasTattoo: undefined,
    smokeHabit: undefined,
    drinkHabit: undefined,
    zodiac: undefined,
    advantages: undefined,
    hobbies: undefined,
    familyMembers: undefined,
    acceptLongDist: undefined,
    status: "0",
    remark: undefined,
    photos: undefined
  }
  proxy.resetForm("payingUserRef")
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加用户"
  if (initPassword.value) {
    form.value.password = initPassword.value
  }
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  const id = row?.id ?? ids.value[0]
  getPayingUser(id).then(response => {
    form.value = response.data
    form.value.password = ""
    open.value = true
    title.value = "修改用户"
  })
}

/** ImageUpload 对外多为逗号分隔字符串，接口 photos 需传 URL 字符串数组 */
function photosToSubmitArray(photos) {
  if (photos == null || photos === "") return []
  if (Array.isArray(photos)) {
    return photos
      .map(item => {
        if (typeof item === "string") return item.trim()
        if (item && typeof item.url === "string") return item.url.trim()
        return ""
      })
      .filter(Boolean)
  }
  return String(photos)
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function buildPayingUserSubmitData() {
  return {
    ...form.value,
    photos: photosToSubmitArray(form.value.photos)
  }
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["payingUserRef"].validate(valid => {
    if (valid) {
      const data = buildPayingUserSubmitData()
      if (form.value.id != null && form.value.id !== "") {
        updatePayingUser(data).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPayingUser(data).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 需求按钮操作 */
function handleDocument(row) {
  requirementDialog.payingId = row.id
  requirementDialog.requirement = row.requirement || {}
  requirementDialog.visible = true
}

function handleQueryMatching(row) {
  const requirement = row?.requirement
  if (!requirement) {
    proxy.$modal.msgError("当前用户暂无需求信息")
    return
  }
  queryMatchingDialog.searchParams = {
    acceptLongDist: requirement.acceptLongDist,
    ageMax: requirement.ageMax,
    ageMin: requirement.ageMin,
    cityRequire: requirement.cityRequire,
    drinkHabit: requirement.drinkHabit,
    education: requirement.education,
    hasCar: requirement.hasCar,
    hasHouse: requirement.hasHouse,
    heightMax: requirement.heightMax,
    heightMin: requirement.heightMin,
    hometownRequire: requirement.hometownRequire,
    noTattoo: requirement.noTattoo,
    payingId: row.id,
    smokeHabit: requirement.smokeHabit
  }
  queryMatchingDialog.visible = true
}

onMounted(() => {
  getList()
  proxy.getConfigKey("sys.user.initPassword").then(response => {
    initPassword.value = response.msg
  })
})
</script>
