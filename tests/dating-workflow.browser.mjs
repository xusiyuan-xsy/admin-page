// UI regression only: intercepted APIs, no business database writes.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5173'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-workflow-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
let activePage
const date = new Date()
const stamp = value => {
  const d = new Date(value)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const time = stamp(date)
const options = [
  { code: 'FRIEND_ADDED', name: '成功加好友', completionStandard: '双方成功添加好友并经红娘核实' },
  { code: 'MEETING_COMPLETED', name: '完成见面', completionStandard: '双方已完成实际见面并经红娘核实' }
]
const customers = [
  { userId: 1, name: '客户甲', phone: '138****0001', status: '0', serviceStatus: 'SERVING', matchmakerId: null, matchmakerName: null, remainingTimes: 3 },
  { userId: 2, name: '客户乙', phone: '138****0002', status: '0', serviceStatus: 'SERVING', matchmakerId: 10, matchmakerName: '测试红娘', remainingTimes: 1 }
]
let assigned = false
let detail
let mutations = []
const menus = [{
  path: '/dating', component: 'Layout', name: 'Dating', meta: { title: '婚恋服务', icon: 'peoples' },
  children: [
    { path: 'assignments', name: 'DatingAssignments', component: 'dating/assignments/index', meta: { title: '红娘分配' } },
    { path: 'matches', name: 'DatingMatches', component: 'dating/matches/index', meta: { title: '配对服务' } }
  ]
}]
function fixtureDeductions() {
  for (const p of detail.participants) {
    const codes = JSON.parse(p.ruleSnapshot).options.map(o => o.code)
    if (p.deductStatus !== 'DEDUCTED' && codes.every(code => detail.events.some(e => e.optionCode === code))) {
      const before = p.remainingTimes--
      p.deductStatus = 'DEDUCTED'
      if (!p.remainingTimes) p.serviceStatus = 'NOT_RENEWED'
      detail.ledger.push({ ledgerId: p.userId, userId: p.userId, entitlementId: p.entitlementId, delta: -1, balanceBefore: before, balanceAfter: p.remainingTimes, eventId: detail.events[0].eventId, createTime: time })
    }
  }
}
async function fixtures(route) {
  const req = route.request()
  const path = new URL(req.url()).pathname.replace('/dev-api', '')
  const method = req.method()
  const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
  if (path === '/getInfo') return reply({ user: { userId: 1, userName: 'admin', nickName: '管理员' }, roles: ['admin'], permissions: ['*:*:*'] })
  if (path === '/getRouters') return reply({ data: menus })
  if (path === '/dating/staff') return reply({ data: [{ userId: 10, userName: 'tester', nickName: '测试红娘' }] })
  if (path === '/dating/assignments') return reply({ rows: customers, total: 2 })
  if (path === '/dating/users/1/assign') {
    const data = req.postDataJSON()
    assert.equal(data.expectedMatchmakerId, null)
    assert.equal(data.matchmakerId, 10)
    assigned = true
    Object.assign(customers[0], { matchmakerId: 10, matchmakerName: '测试红娘' })
    return reply({})
  }
  if (path.endsWith('/assignments')) return reply({ data: [{ id: 1, userId: 1, previousName: null, nextName: '测试红娘', reason: '业务分配', createBy: 'admin', createTime: time }] })
  if (path === '/dating/matches') return reply({ rows: detail ? [detail.pair] : [], total: detail ? 1 : 0 })
  if (path === '/dating/matches/1') return reply({ data: detail })
  if (method !== 'GET') mutations.push(path)
  if (path === '/dating/recommendations') {
    const data = req.postDataJSON()
    assert.equal(data.firstUserId, 1)
    assert.equal(data.secondUserId, 2)
    assert.match(data.requestKey, /^[a-zA-Z0-9-]{16,64}$/)
    detail = {
      pair: { pairId: 1, lowUserId: 1, highUserId: 2, lowName: '客户甲', highName: '客户乙', progress: 'COMMUNICATING', createBy: 'admin', createTime: time },
      participants: customers.map((c, i) => ({ ...c, pairId: 1, entitlementId: 20 + i, deductStatus: 'PENDING', ruleSnapshot: JSON.stringify({ matchMode: 'ALL', options: i ? options : [options[0]] }) })),
      recommendations: [{ id: 11, pairId: 1, reason: data.reason, lowIntention: 'PENDING', highIntention: 'PENDING', createBy: 'admin', createTime: time }],
      intentions: [], appointments: [], appointmentHistory: [], events: [], tasks: [], ledger: []
    }
    return reply({ data: 1 })
  }
  if (path.endsWith('/intentions')) {
    const data = req.postDataJSON()
    detail.recommendations[0][data.userId === 1 ? 'lowIntention' : 'highIntention'] = data.intention
    detail.intentions.unshift({ id: detail.intentions.length + 1, recommendationId: 11, ...data, createBy: 'admin', createTime: time })
    if (detail.recommendations[0].lowIntention === 'WILLING' && detail.recommendations[0].highIntention === 'WILLING') detail.pair.progress = 'IN_PROGRESS'
    return reply({ data: 1 })
  }
  if (path === '/dating/matches/1/appointments') {
    const data = req.postDataJSON()
    assert.equal(data.bothConfirmed, true)
    detail.appointments.unshift({ ...data, appointmentId: detail.appointments.length + 1, status: 'SCHEDULED', createTime: time })
    return reply({ data: 1 })
  }
  if (/\/dating\/appointments\/\d+$/.test(path)) {
    const id = Number(path.split('/').at(-1))
    Object.assign(detail.appointments.find(a => a.appointmentId === id), req.postDataJSON())
    return reply({ data: 1 })
  }
  if (path.endsWith('/actions')) {
    const id = Number(path.split('/').at(-2))
    const data = req.postDataJSON()
    const appointment = detail.appointments.find(a => a.appointmentId === id)
    appointment.status = { COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED', NO_SHOW: 'NO_SHOW' }[data.action]
    if (data.action === 'COMPLETE') {
      appointment.completedAt = data.occurredAt
      detail.events.unshift({ eventId: detail.events.length + 1, pairId: 1, optionCode: 'MEETING_COMPLETED', occurredAt: data.occurredAt, note: data.reason, evidence: data.evidence, createBy: 'admin', createTime: time })
      fixtureDeductions()
    }
    return reply({ data: 1 })
  }
  if (path.endsWith('/service-events')) {
    const data = req.postDataJSON()
    assert.equal(data.optionCode, 'FRIEND_ADDED')
    detail.events.unshift({ ...data, eventId: detail.events.length + 1, pairId: 1, createBy: 'admin', createTime: time })
    detail.pair.progress = 'FOLLOWING'
    fixtureDeductions()
    return reply({ data: 1 })
  }
  if (path.endsWith('/retry')) {
    assert.equal(req.postDataJSON().reason, '已核查并修复异常')
    detail.tasks[0].status = 'DONE'
    detail.tasks[0].outcome = 'DEDUCTED'
    return reply({ data: 1 })
  }
  return reply({ data: [], rows: [], total: 0 })
}
async function screenshot(page, name) {
  await page.locator('.el-message').last().waitFor({ state: 'hidden' })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))
  })
  await page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: 'disabled' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: page overflow`)
  const overflow = await page.locator('.el-dialog:visible,.el-drawer:visible').evaluateAll(containers => containers.flatMap(container => {
    const b = container.getBoundingClientRect()
    return [...container.querySelectorAll('.el-form-item__label,.el-input,.el-select,.el-textarea,.el-checkbox,.participant-heading')]
      .filter(el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && (r.left < b.left - 1 || r.right > b.right + 1)
      }).map(el => el.className)
  }))
  assert.deepEqual(overflow, [], `${name}: controls outside container`)
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-workflow-test-only', url: baseURL }])
  await context.route('**/dev-api/**', fixtures)
  const page = await context.newPage()
  activePage = page
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${baseURL}/dating/assignments`)
  await page.getByRole('button', { name: '分配红娘', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '分配红娘', exact: true })
  await dialog.getByRole('button', { name: '确认分配' }).click()
  await dialog.getByText('请选择负责红娘').waitFor()
  await dialog.getByRole('combobox').click()
  await page.getByRole('option', { name: '测试红娘 (tester)' }).click()
  await dialog.getByLabel('分配原因').fill('业务分配')
  await screenshot(page, 'desktop-assignment')
  await dialog.getByRole('button', { name: '确认分配' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(assigned, true)
  await page.getByRole('button', { name: '分配记录', exact: true }).first().click()
  await page.getByRole('dialog').getByText('业务分配').waitFor()
  await screenshot(page, 'desktop-assignment-history')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/matches`)
  await page.getByRole('button', { name: '创建推荐', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '创建推荐', exact: true })
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.getByText('请选择客户一').waitFor()
  for (let i = 0; i < 2; i++) {
    await dialog.getByRole('combobox').nth(i).click()
    await page.getByRole('option').filter({ hasText: i ? '客户乙' : '客户甲' }).last().click()
  }
  await dialog.getByLabel('推荐理由').fill('择偶意向一致，安排沟通')
  await screenshot(page, 'desktop-recommendation')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.waitFor({ state: 'hidden' })
  let drawer = page.locator('.dating-pair-drawer')
  await drawer.getByText('沟通意向中', { exact: true }).waitFor()
  assert.equal(await drawer.getByRole('button', { name: '安排见面', exact: true }).isDisabled(), true)
  for (let i = 0; i < 2; i++) {
    await drawer.getByRole('button', { name: '登记意向', exact: true }).nth(i).click()
    dialog = page.getByRole('dialog', { name: '登记意向', exact: true })
    await dialog.getByText('愿意继续', { exact: true }).click()
    await dialog.getByLabel('沟通 / 原因').fill('已电话核实本人意向')
    await dialog.getByRole('button', { name: '确认保存' }).click()
    await dialog.waitFor({ state: 'hidden' })
  }
  await drawer.getByText('双方已同意', { exact: true }).waitFor()
  async function scheduleMeeting() {
    await drawer.getByRole('button', { name: '安排见面', exact: true }).click()
    const d = page.getByRole('dialog', { name: '安排见面', exact: true })
    await d.getByLabel('预约时间').fill(stamp(Date.now() + 86400000))
    await d.getByLabel('预约时间').press('Tab')
    await d.getByLabel('见面地点').fill('服务中心会客室')
    await d.getByText('双方已确认本次见面安排', { exact: true }).click()
    await d.getByLabel('沟通 / 原因').fill('双方确认时间地点')
    await screenshot(page, 'desktop-schedule')
    await d.getByRole('button', { name: '确认保存' }).click()
    await d.waitFor({ state: 'hidden' })
    await drawer.getByRole('tab', { name: '见面记录' }).click()
  }
  await scheduleMeeting()
  await drawer.getByRole('button', { name: '改期', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '见面改期' })
  await dialog.getByLabel('见面地点').fill('服务中心第二会客室')
  await dialog.getByText('双方已确认本次见面安排', { exact: true }).click()
  await dialog.getByLabel('沟通 / 原因').fill('双方同意调整场地')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.waitFor({ state: 'hidden' })
  await drawer.getByRole('button', { name: '取消见面' }).click()
  dialog = page.getByRole('dialog', { name: '取消见面', exact: true })
  await dialog.getByLabel('沟通 / 原因').fill('临时有事取消')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(detail.events.length, 0)
  await scheduleMeeting()
  await drawer.getByRole('button', { name: '登记爽约' }).click()
  dialog = page.getByRole('dialog', { name: '登记爽约', exact: true })
  await dialog.getByLabel('沟通 / 原因').fill('一方未到场')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(detail.events.length, 0)
  await scheduleMeeting()
  await drawer.getByRole('button', { name: '登记服务事实' }).click()
  dialog = page.getByRole('dialog', { name: '登记服务事实', exact: true })
  await dialog.locator('.el-select').first().click()
  await page.getByRole('option', { name: '成功加好友', exact: true }).click()
  await dialog.getByLabel('核实记录').fill('已分别核实双方成功添加好友')
  await screenshot(page, 'desktop-service-event')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(detail.participants[0].deductStatus, 'DEDUCTED')
  assert.equal(detail.participants[1].deductStatus, 'PENDING')
  await drawer.getByRole('button', { name: '确认见面完成' }).click()
  dialog = page.getByRole('dialog', { name: '确认见面完成', exact: true })
  await dialog.getByLabel('核实记录').fill('已核实双方实际完成见面')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await drawer.getByText('未续单', { exact: true }).waitFor()
  assert.equal(await drawer.getByRole('button', { name: '安排见面', exact: true }).isDisabled(), true)
  assert.equal(detail.ledger.length, 2)
  await drawer.getByRole('tab', { name: '扣次与流水' }).click()
  await screenshot(page, 'desktop-deductions')
  detail.tasks = [{ taskId: 7, eventId: 2, userId: 2, status: 'ERROR', attempts: 5, lastError: '处理异常' }]
  await drawer.getByRole('button', { name: '刷新记录' }).click()
  await drawer.getByRole('button', { name: '重试扣次' }).click()
  dialog = page.getByRole('dialog', { name: '重新核算扣次', exact: true })
  await dialog.getByLabel('重试原因').fill('已核查并修复异常')
  await dialog.getByRole('button', { name: '确认重新核算', exact: true }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确认重试', exact: true }).click()
  await drawer.getByText('处理完成', { exact: true }).waitFor()
  assert.equal(mutations.filter(p => p.endsWith('/retry')).length, 1)
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-pair-detail')
  await drawer.getByRole('tab', { name: '服务事实' }).click()
  await screenshot(page, 'mobile-service-events')
  await drawer.getByRole('button', { name: '登记服务事实' }).click()
  await page.getByRole('dialog', { name: '登记服务事实', exact: true }).waitFor()
  await screenshot(page, 'mobile-service-event-form')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/matches`)
  await page.getByRole('button', { name: '创建推荐', exact: true }).click()
  await screenshot(page, 'mobile-recommendation')
  await page.keyboard.press('Escape')
  await page.goto(`${baseURL}/dating/assignments`)
  await page.getByRole('button', { name: '转交红娘', exact: true }).first().click()
  await screenshot(page, 'mobile-assignment')
  assert.deepEqual(errors, [], 'Uncaught browser exceptions')
  console.log('PASS: assignment/history, recommendation, intentions, appointment/reschedule/cancel/no-show/completion, service event, deduction retry, desktop/mobile; mocked APIs only')
} catch (error) {
  if (activePage) {
    console.error('Failure URL:', activePage.url(), 'Browser errors:', errors)
    console.error(await activePage.locator('body').innerText())
    await activePage.screenshot({ path: `${output}failure.png`, fullPage: true })
  }
  throw error
} finally { await browser.close() }
