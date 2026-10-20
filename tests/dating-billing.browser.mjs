// Browser-only UI regression with intercepted API fixtures; no real payments.
// Run against the local Vite server: node tests/dating-billing.browser.mjs
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5173'
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const output = new URL('../node_modules/.cache/dating-ui/', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1')
await mkdir(decodeURIComponent(output), { recursive: true })
const errors = []
const serviceOptions = [
  { optionId: 1, code: 'FRIEND_ADDED', name: '成功加好友', completionStandard: '双方已成功添加好友，并由红娘核实记录', status: '0' },
  { optionId: 2, code: 'MEETING_COMPLETED', name: '完成见面', completionStandard: '双方已完成实际见面，并由红娘核实记录', status: '0' }
]
const pkg = {
  packageId: 1, packageName: '标准婚恋服务', price: 2999, serviceTimes: 3,
  limitExpire: '0', limitServiceTimes: '1', serviceDuration: 0, status: '0', sortOrder: 0,
  selectionMode: 'MULTI', serviceOptionCodes: serviceOptions.map(o => o.code), ruleVersion: 1
}
const snapshot = JSON.stringify({ ...pkg, matchMode: 'ALL', options: serviceOptions })
let order = null
let savedPackage
let savedOption
let opened = 0
let integrityFails = false
const coverImage = `${baseURL}/test-cover.png`
let coverBytes
const entitlement = () => ({
  entitlementId: 22, orderId: 11, orderNo: order.orderNo, userId: 7, userName: '测试客户',
  packageName: pkg.packageName, totalTimes: 3, usedTimes: 0, remainingTimes: 3,
  status: 'ACTIVE', ruleSnapshot: snapshot, createBy: 'admin', createTime: '2026-10-13 10:10:00'
})
const menus = [{
  path: '/dating', component: 'Layout', name: 'Dating', meta: { title: '婚恋服务', icon: 'peoples' },
  children: [
    { path: 'orders', name: 'DatingOrders', component: 'dating/orders/index', meta: { title: '服务订单' } },
    { path: 'serviceOptions', name: 'DatingServiceOptions', component: 'dating/serviceOptions/index', meta: { title: '服务选项' } },
    { path: 'entitlements', name: 'DatingEntitlements', component: 'dating/entitlements/index', meta: { title: '服务权益' } },
    { path: 'packages', name: 'DatingPackage', component: 'system/datingPackage/index', meta: { title: '套餐配置' } }
  ]
}]
async function fixtures(route) {
  const req = route.request()
  const url = new URL(req.url())
  const path = url.pathname.replace('/dev-api', '')
  const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
  if (path === '/getInfo') return reply({ user: { userId: 1, userName: 'admin', nickName: '管理员' }, roles: ['admin'], permissions: ['*:*:*'] })
  if (path === '/getRouters') return reply({ data: menus })
  if (path === '/oss/upload') {
    assert.equal(req.headers().authorization, 'Bearer mock-ui-test-only')
    return reply({ url: coverImage, fileName: 'cover.png' })
  }
  if (path === '/dating/service-options') {
    if (req.method() === 'POST') {
      savedOption = req.postDataJSON()
      serviceOptions.push({ ...savedOption, optionId: 3, code: 'OPTION_123456789012345678901234567890123456789' })
    }
    return reply({ data: serviceOptions })
  }
  if (path.startsWith('/dating/service-options/')) { savedOption = req.postDataJSON(); return reply({}) }
  if (path === '/dating/packages') return reply({ data: [pkg] })
  if (path === '/dating/customers') return reply({ rows: [{ userId: 7, name: '测试客户', phone: '138****0007', status: '0', serviceStatus: 'NOT_STARTED' }], total: 1 })
  if (path === '/dating/orders' && req.method() === 'POST') {
    const payload = req.postDataJSON()
    assert.match(payload.requestKey, /^[a-zA-Z0-9-]{16,64}$/)
    order = { ...payload, orderId: 11, orderNo: 'ML202610130001', userName: '测试客户', packageName: pkg.packageName, amount: pkg.price, serviceTimes: 3, ruleSnapshot: snapshot, status: 'UNPAID', createBy: 'admin', createTime: '2026-10-13 10:00:00' }
    return reply({ data: order })
  }
  if (path === '/dating/orders') return reply({ rows: order ? [order] : [], total: order ? 1 : 0 })
  if (path.endsWith('/confirm-payment')) {
    const payload = req.postDataJSON()
    assert.equal(payload.paidAmount, 2999)
    assert.equal(payload.paymentReference, 'TEST-RECEIPT-001')
    opened++
    order = { ...order, ...payload, status: 'PAID', entitlementId: 22, confirmedBy: 'admin', confirmedAt: '2026-10-13 10:10:00' }
    return reply({ data: order })
  }
  if (path === '/dating/orders/11') return reply({ data: order })
  if (path === '/dating/entitlements/22') return reply({
    data: { entitlement: entitlement(), issues: [], ledger: [
      { ledgerId: 1, entryType: 'OPEN', delta: 3, balanceBefore: 0, balanceAfter: 3, createBy: 'admin', createTime: '2026-10-13 10:10:00' }
    ] }
  })
  if (path === '/dating/integrity-issues') {
    if (integrityFails) return route.fulfill({ json: { code: 500, msg: '测试检查失败' } })
    return reply({ rows: [{ userId: 7, orderId: 11, entitlementId: 22, code: 'BALANCE_LEDGER' }], total: 1 })
  }
  if (path === '/dating/entitlements') return reply({
    rows: opened ? [{ entitlementId: 22, orderId: 11, orderNo: order.orderNo, userId: 7, userName: '测试客户', packageName: pkg.packageName, totalTimes: 3, usedTimes: 0, remainingTimes: 3, status: 'ACTIVE', ruleSnapshot: snapshot, createBy: 'admin', createTime: '2026-10-13 10:10:00' }] : [], total: opened ? 1 : 0
  })
  if (path === '/system/datingPackage/list') return reply({ rows: [pkg], total: 1 })
  if (path === '/system/datingPackage/1') return reply({ data: pkg })
  if (path === '/system/datingPackage') { savedPackage = req.postDataJSON(); return reply({}) }
  if (path === '/system/dict/data/type/sys_normal_disable') return reply({ data: [{ dictLabel: '启用', dictValue: '0' }, { dictLabel: '停用', dictValue: '1' }] })
  return reply({ data: [], rows: [], total: 0 })
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => {})))
  })
  await page.screenshot({ path: decodeURIComponent(output) + name + '.png', fullPage: true, animations: 'disabled' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${name}: page horizontal overflow`)
  const overflow = await page.locator('.el-dialog:visible').evaluateAll(dialogs => dialogs.flatMap(dialog => {
    const bounds = dialog.getBoundingClientRect()
    return [...dialog.querySelectorAll('.el-form-item__label, .el-input, .el-input-number, .el-select, .el-textarea, .el-radio, .el-checkbox')]
      .filter(element => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
      }).map(element => element.className)
  }))
  assert.deepEqual(overflow, [], `${name}: dialog controls outside bounds`)
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-ui-test-only', url: baseURL }])
  await context.route('**/dev-api/**', fixtures)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  const coverData = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 80; canvas.height = 60
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#258c6a'; ctx.fillRect(0, 0, 80, 60)
    return canvas.toDataURL('image/png')
  })
  coverBytes = Buffer.from(coverData.split(',')[1], 'base64')
  await context.route(coverImage, route => route.fulfill({ body: coverBytes, contentType: 'image/png' }))
  await page.goto(`${baseURL}/dating/orders`)
  await page.getByRole('button', { name: '创建订单', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '创建订单', exact: true })
  await dialog.getByRole('button', { name: '创建待收款订单' }).click()
  await page.getByText('请选择客户', { exact: true }).waitFor()
  await dialog.getByRole('combobox').nth(0).click()
  await page.getByRole('option').filter({ hasText: '测试客户' }).click()
  await dialog.getByRole('combobox').nth(1).click()
  await page.getByRole('option').filter({ hasText: '标准婚恋服务' }).click()
  await dialog.getByText('所选服务选项全部满足').waitFor()
  await screenshot(page, 'desktop-create-order')
  await dialog.getByRole('button', { name: '创建待收款订单' }).click()
  await page.getByRole('button', { name: '确认收款', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '确认收款', exact: true })
  await dialog.getByRole('button', { name: '确认收款并开通' }).click()
  await page.getByText('请输入交易凭证或现金收据编号').waitFor()
  await dialog.getByLabel('凭证/收据号').fill('TEST-RECEIPT-001')
  await screenshot(page, 'desktop-payment')
  await dialog.getByRole('button', { name: '确认收款并开通' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await page.getByRole('dialog', { name: '订单详情' }).getByText('已收款并开通').waitFor()
  assert.equal(opened, 1)
  await screenshot(page, 'desktop-paid-order')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/entitlements`)
  await page.getByText('测试客户', { exact: true }).waitFor()
  await screenshot(page, 'desktop-entitlements')
  await page.getByRole('button', { name: '权益详情', exact: true }).click()
  await page.getByRole('dialog', { name: '权益详情' }).getByText('OPEN', { exact: true }).waitFor()
  await screenshot(page, 'desktop-entitlement-ledger')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '一致性检查', exact: true }).click()
  await page.getByText('权益余额与流水不一致', { exact: true }).waitFor()
  await screenshot(page, 'desktop-integrity')
  await page.keyboard.press('Escape')
  integrityFails = true
  await page.getByRole('button', { name: '一致性检查', exact: true }).click()
  await page.getByText('检查未完成', { exact: true }).waitFor()
  assert.equal(await page.getByText('当前范围未发现异常', { exact: true }).count(), 0)
  await page.keyboard.press('Escape')

  await page.goto(`${baseURL}/dating/serviceOptions`)
  await page.getByRole('button', { name: '新增选项' }).click()
  dialog = page.getByRole('dialog', { name: '新增服务选项' })
  assert.equal(await dialog.getByLabel('选项编码').count(), 0)
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.getByText('请输入选项名称', { exact: true }).waitFor()
  await dialog.getByLabel('选项名称').fill('完成回访')
  await dialog.getByLabel('完成标准').fill('红娘已完成双方回访并记录反馈')
  await screenshot(page, 'desktop-service-option-create')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(Object.hasOwn(savedOption, 'code'), false)
  await page.getByText('OPTION_123456789012345678901234567890123456789', { exact: true }).waitFor()
  await page.getByRole('row').filter({ hasText: '完成回访' }).getByRole('button', { name: '编辑选项' }).click()
  dialog = page.getByRole('dialog', { name: '编辑服务选项' })
  assert.equal(await dialog.getByLabel('选项编码').inputValue(), 'OPTION_123456789012345678901234567890123456789')
  assert.equal(await dialog.getByLabel('选项编码').getAttribute('readonly'), '')
  await dialog.getByLabel('选项名称').fill('回访确认')
  await screenshot(page, 'desktop-service-option-edit')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-service-option-edit')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(savedOption.code, 'OPTION_123456789012345678901234567890123456789')
  assert.equal(savedOption.name, '回访确认')

  await page.getByRole('row').filter({ hasText: 'FRIEND_ADDED' }).getByRole('button', { name: '编辑选项' }).click()
  dialog = page.getByRole('dialog', { name: '编辑服务选项' })
  assert.equal(await dialog.getByLabel('选项编码').inputValue(), 'FRIEND_ADDED')
  await dialog.getByRole('button', { name: '取消', exact: true }).click()

  await page.goto(`${baseURL}/dating/packages`)
  await page.getByRole('button', { name: '新增', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '新增套餐' })
  await dialog.getByLabel('套餐名称').fill('测试套餐')
  await dialog.getByLabel('价格(元)').fill('1999')
  await dialog.getByText('多选', { exact: true }).click()
  await dialog.getByText('成功加好友', { exact: true }).click()
  await dialog.getByText('完成见面', { exact: true }).click()
  await dialog.locator('input[type=file]').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: coverBytes })
  await page.waitForFunction(() => {
    const img = document.querySelector('.el-upload-list__item-thumbnail')
    return img?.src.endsWith('/test-cover.png') && img.naturalWidth === 80
  })
  await screenshot(page, 'desktop-package')
  await dialog.getByRole('button', { name: '确 定' }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(savedPackage.selectionMode, 'MULTI')
  assert.equal(savedPackage.serviceOptionCodes.length, 2)
  assert.equal(savedPackage.limitServiceTimes, '1')
  assert.equal(savedPackage.coverImage, coverImage)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/dating/orders`)
  await page.getByRole('button', { name: '创建订单', exact: true }).click()
  await page.getByRole('dialog', { name: '创建订单', exact: true }).waitFor()
  await screenshot(page, 'mobile-create-order')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/serviceOptions`)
  await page.getByRole('button', { name: '新增选项' }).click()
  await page.getByRole('dialog', { name: '新增服务选项' }).waitFor()
  await screenshot(page, 'mobile-service-option')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/packages`)
  await page.getByRole('button', { name: '新增', exact: true }).click()
  await page.getByRole('dialog', { name: '新增套餐' }).waitFor()
  await screenshot(page, 'mobile-package')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/entitlements`)
  await page.getByRole('button', { name: '权益详情', exact: true }).click()
  await page.getByRole('dialog', { name: '权益详情' }).getByText('OPEN', { exact: true }).waitFor()
  await screenshot(page, 'mobile-entitlement-ledger')
  assert.deepEqual(errors, [], 'Uncaught browser exceptions')
  console.log('PASS: create order, validation, confirm payment, entitlement, option, package, desktop/mobile; mock API only')
} finally { await browser.close() }
