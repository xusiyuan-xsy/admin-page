<template>
  <div class="app-container dating-orders">
    <el-form inline @submit.prevent="search">
      <el-form-item label="订单号"><el-input v-model="query.orderNo" clearable @keyup.enter="search" style="width: 230px" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable style="width: 140px">
          <el-option v-for="(label, value) in statuses" :key="value" :label="label" :value="value" />
        </el-select>
      </el-form-item>
      <el-form-item><el-button type="primary" icon="Search" @click="search">查询</el-button><el-button icon="Refresh" @click="reset">重置</el-button></el-form-item>
    </el-form>
    <el-button class="mb8" type="primary" plain icon="Plus" @click="openCreate" v-hasPermi="['dating:order:add']">创建订单</el-button>
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="orderNo" label="订单号" min-width="230" show-overflow-tooltip />
      <el-table-column prop="userName" label="客户" min-width="100" />
      <el-table-column prop="packageName" label="套餐" min-width="130" show-overflow-tooltip />
      <el-table-column label="金额(元)" width="110" align="right"><template #default="{ row }">{{ money(row.amount) }}</template></el-table-column>
      <el-table-column prop="serviceTimes" label="服务次数" width="95" align="center" />
      <el-table-column label="状态" width="125"><template #default="{ row }"><el-tag :type="row.status === 'PAID' ? 'success' : row.status === 'UNPAID' ? 'warning' : 'info'">{{ statuses[row.status] || row.status }}</el-tag></template></el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="165" />
      <el-table-column prop="createBy" label="经办人" width="110" />
      <el-table-column label="操作" width="165" fixed="right">
        <template #default="{ row }">
          <el-tooltip content="订单详情"><el-button link type="primary" icon="View" aria-label="订单详情" @click="showDetail(row)" v-hasPermi="['dating:order:query']" /></el-tooltip>
          <el-tooltip v-if="row.status === 'UNPAID'" content="确认收款"><el-button link type="success" icon="Money" aria-label="确认收款" @click="openPayment(row)" v-hasPermi="['dating:order:confirmPayment']" /></el-tooltip>
          <el-tooltip v-if="row.status === 'UNPAID'" content="取消订单"><el-button link type="danger" icon="Close" aria-label="取消订单" @click="cancel(row)" v-hasPermi="['dating:order:cancel']" /></el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="load" />

    <el-dialog v-model="creating" title="创建订单" width="660px" style="max-width: 94vw" :close-on-click-modal="false">
      <el-form ref="createRef" :model="draft" :rules="createRules" label-width="96px">
        <el-form-item label="客户" prop="userId">
          <el-select v-model="draft.userId" filterable remote :remote-method="searchCustomers" :loading="customerLoading" placeholder="搜索姓名或手机号" style="width: 100%" @visible-change="v => v && searchCustomers('')">
            <el-option v-for="u in customers" :key="u.userId" :value="u.userId" :label="`${u.name} / ${u.phone} / ${serviceStatuses[u.serviceStatus] || u.serviceStatus}`" :disabled="u.status !== '0' || ['SERVING', 'SUCCESS_CLOSED'].includes(u.serviceStatus)" />
          </el-select>
        </el-form-item>
        <el-form-item label="套餐" prop="packageId">
          <el-select v-model="draft.packageId" filterable placeholder="选择套餐" style="width: 100%">
            <el-option v-for="p in packages" :key="p.packageId" :value="p.packageId" :label="`${p.packageName} / ${money(p.price)}元 / ${p.serviceTimes}次`" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单备注"><el-input v-model="draft.remark" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template v-if="selectedPackage">
        <el-descriptions :column="2" border class="mb8">
          <el-descriptions-item label="应收金额">{{ money(selectedPackage.price) }}元</el-descriptions-item>
          <el-descriptions-item label="服务次数">{{ selectedPackage.serviceTimes }}次</el-descriptions-item>
        </el-descriptions>
        <RuleSnapshot :snapshot="previewRule" />
      </template>
      <template #footer><el-button @click="creating = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="submitOrder">创建待收款订单</el-button></template>
    </el-dialog>

    <el-dialog v-model="paying" title="确认收款" width="560px" style="max-width: 94vw" :close-on-click-modal="false">
      <el-descriptions :column="1" border class="mb8">
        <el-descriptions-item label="客户">{{ paymentOrder.userName }}</el-descriptions-item>
        <el-descriptions-item label="套餐">{{ paymentOrder.packageName }}</el-descriptions-item>
        <el-descriptions-item label="应收金额">{{ money(paymentOrder.amount) }}元</el-descriptions-item>
      </el-descriptions>
      <el-form ref="paymentRef" :model="payment" :rules="paymentRules" label-width="100px">
        <el-form-item label="实收金额" prop="paidAmount"><el-input-number v-model="payment.paidAmount" :min="0.01" :max="99999999.99" :precision="2" controls-position="right" /></el-form-item>
        <el-form-item label="收款方式" prop="paymentMethod"><el-select v-model="payment.paymentMethod"><el-option v-for="(label, value) in methods" :key="value" :value="value" :label="label" /></el-select></el-form-item>
        <el-form-item label="凭证/收据号" prop="paymentReference"><el-input v-model="payment.paymentReference" maxlength="100" /></el-form-item>
        <el-form-item label="实际收款时间" prop="paidAt"><el-date-picker v-model="payment.paidAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" :disabled-date="date => date.getTime() > Date.now()" style="width: 100%" /></el-form-item>
        <el-form-item label="收款备注"><el-input v-model="payment.remark" type="textarea" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="paying = false" :disabled="saving">取消</el-button><el-button type="primary" :loading="saving" @click="submitPayment">确认收款并开通</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailOpen" title="订单详情" size="min(680px, 100vw)">
      <template v-if="detail">
        <el-descriptions :column="1" border class="mb8">
          <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detail.userName }} (#{{ detail.userId }})</el-descriptions-item>
          <el-descriptions-item label="套餐">{{ detail.packageName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statuses[detail.status] }}</el-descriptions-item>
          <el-descriptions-item label="金额 / 次数">{{ money(detail.amount) }}元 / {{ detail.serviceTimes }}次</el-descriptions-item>
          <el-descriptions-item label="经办人">{{ detail.createBy }}</el-descriptions-item>
          <el-descriptions-item label="订单备注">{{ detail.remark || '-' }}</el-descriptions-item>
          <template v-if="detail.status === 'PAID'">
            <el-descriptions-item label="实收金额">{{ money(detail.paidAmount) }}元</el-descriptions-item>
            <el-descriptions-item label="收款方式">{{ methods[detail.paymentMethod] }}</el-descriptions-item>
            <el-descriptions-item label="凭证/收据号">{{ detail.paymentReference }}</el-descriptions-item>
            <el-descriptions-item label="实际收款时间">{{ detail.paidAt }}</el-descriptions-item>
            <el-descriptions-item label="确认人 / 时间">{{ detail.confirmedBy }} / {{ detail.confirmedAt }}</el-descriptions-item>
            <el-descriptions-item label="权益编号">{{ detail.entitlementId }}</el-descriptions-item>
          </template>
          <el-descriptions-item v-if="detail.cancelReason" label="取消原因">{{ detail.cancelReason }}</el-descriptions-item>
        </el-descriptions>
        <RuleSnapshot :snapshot="detail.ruleSnapshot" />
      </template>
    </el-drawer>
  </div>
</template>

<script setup name="DatingOrders">
import { listOrders, getOrder, createOrder, confirmPayment, cancelOrder, listCustomers, listAvailablePackages, listServiceOptions } from '@/api/dating/billing'
import RuleSnapshot from '../components/RuleSnapshot.vue'
import { checkPermi } from '@/utils/permission'
const { proxy } = getCurrentInstance()
const statuses = { UNPAID: '待收款', PAID: '已收款并开通', CANCELLED: '已取消' }
const serviceStatuses = { NOT_STARTED: '未开通', SERVING: '服务中', NOT_RENEWED: '未续单', SUCCESS_CLOSED: '成功结案' }
const methods = { BANK_TRANSFER: '银行转账', WECHAT: '微信', ALIPAY: '支付宝', CASH: '现金' }
const money = value => Number(value || 0).toFixed(2)
const query = reactive({ pageNum: 1, pageSize: 10, orderNo: '', status: '' })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const paying = ref(false)
const detailOpen = ref(false)
const detail = ref(null)
const packages = ref([])
const options = ref([])
const customers = ref([])
const customerLoading = ref(false)
const draft = ref({})
const payment = ref({})
const paymentOrder = ref({})
const createRef = ref()
const paymentRef = ref()
const required = message => [{ required: true, message, trigger: 'change' }]
const createRules = { userId: required('请选择客户'), packageId: required('请选择套餐') }
const paymentRules = {
  paidAmount: [{ validator: (_, value, cb) => Number(value) === Number(paymentOrder.value.amount) ? cb() : cb(new Error('实收金额必须等于应收金额')), trigger: 'change' }],
  paymentMethod: required('请选择收款方式'),
  paymentReference: [{ required: true, whitespace: true, message: '请输入交易凭证或现金收据编号', trigger: 'blur' }],
  paidAt: [{ validator: (_, value, cb) => value && new Date(value.replace(' ', 'T')).getTime() <= Date.now() ? cb() : cb(new Error('请选择不晚于当前的收款时间')), trigger: 'change' }]
}
const selectedPackage = computed(() => packages.value.find(p => p.packageId === draft.value.packageId))
const previewRule = computed(() => selectedPackage.value ? {
  ...selectedPackage.value, matchMode: 'ALL',
  options: options.value.filter(o => selectedPackage.value.serviceOptionCodes?.includes(o.code))
} : null)
let customerRequest = 0
async function searchCustomers(keyword) {
  const current = ++customerRequest
  customerLoading.value = true
  try {
    const res = await listCustomers({ keyword, pageNum: 1, pageSize: 30 })
    if (current === customerRequest) customers.value = res.rows
  } finally { if (current === customerRequest) customerLoading.value = false }
}
async function load() {
  loading.value = true
  try {
    const res = await listOrders(query)
    rows.value = res.rows
    total.value = res.total
  } finally { loading.value = false }
}
function search() { query.pageNum = 1; load() }
function reset() { Object.assign(query, { pageNum: 1, orderNo: '', status: '' }); load() }
async function openCreate() {
  const [p, o] = await Promise.all([listAvailablePackages(), listServiceOptions({ status: '0' })])
  packages.value = p.data
  options.value = o.data
  const requestKey = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
  draft.value = { userId: undefined, packageId: undefined, remark: '', requestKey }
  customers.value = []
  creating.value = true
  nextTick(() => createRef.value?.clearValidate())
}
async function submitOrder() {
  if (saving.value || !await createRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    await createOrder(draft.value)
    creating.value = false
    proxy.$modal.msgSuccess('待收款订单已创建')
    await load()
  } finally { saving.value = false }
}
async function showDetail(row) {
  detail.value = (await getOrder(row.orderId)).data
  detailOpen.value = true
}
function openPayment(row) {
  paymentOrder.value = row
  payment.value = { paidAmount: Number(row.amount), paymentMethod: 'BANK_TRANSFER', paymentReference: '', paidAt: proxy.parseTime(new Date()), remark: '' }
  paying.value = true
  nextTick(() => paymentRef.value?.clearValidate())
}
async function submitPayment() {
  if (saving.value || !await paymentRef.value.validate().catch(() => false)) return
  saving.value = true
  try {
    await proxy.$modal.confirm(`确认已收到 ${money(paymentOrder.value.amount)} 元，并为 ${paymentOrder.value.userName} 开通 ${paymentOrder.value.serviceTimes} 次服务？`)
    const res = await confirmPayment(paymentOrder.value.orderId, payment.value)
    paying.value = false
    proxy.$modal.msgSuccess('收款已确认，服务权益已开通')
    if (checkPermi(['dating:order:query'])) { detail.value = res.data; detailOpen.value = true }
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') console.error('确认收款失败', error)
  } finally { saving.value = false }
}
async function cancel(row) {
  try {
    const { value } = await proxy.$prompt('取消原因', '取消订单', {
      inputType: 'textarea', inputValidator: value => !!value?.trim() && value.length <= 500 || '请输入1-500字取消原因'
    })
    await cancelOrder(row.orderId, value.trim())
    proxy.$modal.msgSuccess('订单已取消')
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') console.error('取消订单失败', error)
  }
}
onMounted(load)
</script>

<style scoped>
.dating-orders :deep(.el-descriptions__content) { overflow-wrap: anywhere; }
.dating-orders :deep(.el-select) { min-width: 0; }
</style>
