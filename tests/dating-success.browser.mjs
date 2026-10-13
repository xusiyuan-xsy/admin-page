// Intercepted API regression. Never writes to the business backend.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5180'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-success-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
let activePage
let closed = false
let enabled = true
let permitted = true
let mutations = 0
let filters
const pair = { pairId: 1, lowUserId: 1, highUserId: 2, lowName: '客户甲', highName: '客户乙', progress: 'FOLLOWING', createBy: 'admin', createTime: '2026-01-01 10:00:00' }
const snapshot = JSON.stringify({ matchMode: 'ALL', options: [{ code: 'FRIEND_ADDED', name: '成功加好友', completionStandard: '双方核实' }, { code: 'MEETING_COMPLETED', name: '完成见面', completionStandard: '已实际见面' }] })
const detail = {
  pair,
  participants: [
    { userId: 1, name: '客户甲', entitlementId: 1, remainingTimes: 0, serviceStatus: 'NOT_RENEWED', deductStatus: 'DEDUCTED', ruleSnapshot: snapshot },
    { userId: 2, name: '客户乙', entitlementId: 2, remainingTimes: 3, serviceStatus: 'SERVING', deductStatus: 'PENDING', ruleSnapshot: snapshot }
  ],
  recommendations: [{ id: 11, pairId: 1, reason: '红娘推荐', lowIntention: 'WILLING', highIntention: 'WILLING' }],
  intentions: [], appointments: [], appointmentHistory: [], events: [], tasks: [], ledger: []
}
const successCase = { caseId: 7, pairId: 1, recommendationId: 11, lowName: '客户甲', highName: '客户乙', successAt: '2026-10-01 10:00:00', confirmedBy: 'admin', createTime: '2026-10-01 10:01:00' }
const members = [{ userId: 1, name: '客户甲', matchmakerId: 10, matchmakerName: '红娘一', retainedTimes: 0 }, { userId: 2, name: '客户乙', matchmakerId: 20, matchmakerName: '红娘二', retainedTimes: 3 }]
let confirmation
const menus = [{
  path: '/dating', component: 'Layout', name: 'Dating', meta: { title: '婚恋服务', icon: 'peoples' },
  children: [
    { path: 'matches', component: 'dating/matches/index', name: 'DatingMatches', meta: { title: '配对服务' } },
    { path: 'success-cases', component: 'dating/success-cases/index', name: 'DatingSuccessCases', meta: { title: '成功案例' } }
  ]
}]
async function fixtures(route) {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname.replace('/dev-api', '')
  const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
  if (path === '/getInfo') return reply({ user: { userId: 1, userName: 'admin', nickName: '管理员' }, roles: ['tester'], permissions: permitted ? ['*:*:*'] : ['dating:match:list', 'dating:match:query', 'dating:success:list', 'dating:success:query'] })
  if (path === '/getRouters') return reply({ data: menus })
  if (path === '/dating/success-policy') return reply({ data: { enabled } })
  if (path === '/dating/matches') return reply({ rows: [pair], total: 1 })
  if (path === '/dating/matches/1') return reply({ data: detail })
  if (path === '/dating/matches/1/close-success') {
    mutations++
    confirmation = request.postDataJSON()
    assert.equal(confirmation.bothConfirmed, true)
    assert.equal(confirmation.evidence, 'CONFIRM-001')
    assert.ok(confirmation.note.trim())
    assert.ok(confirmation.successAt)
    closed = true
    pair.progress = 'SUCCESS_CLOSED'
    for (const p of detail.participants) p.serviceStatus = 'SUCCESS_CLOSED'
    detail.participants[1].deductStatus = 'STOPPED'
    successCase.successAt = confirmation.successAt
    return reply({ data: successCase })
  }
  if (path === '/dating/success-cases/matchmakers') return reply({ data: members })
  if (path === '/dating/success-cases/7') return reply({ data: { successCase, members, confirmation } })
  if (path === '/dating/success-cases' || path === '/dating/success-cases/stats') {
    filters = Object.fromEntries(url.searchParams)
    const hasResults = closed && filters.keyword !== '不存在'
    return path.endsWith('/stats') ? reply({ data: { caseCount: hasResults ? 1 : 0, peopleCount: hasResults ? 2 : 0 } })
      : reply({ rows: hasResults ? [successCase] : [], total: hasResults ? 1 : 0 })
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
  const overflow = await page.locator('.el-dialog:visible,.el-drawer:visible,.case-filters').evaluateAll(containers => containers.flatMap(container => {
    const b = container.getBoundingClientRect()
    return [...container.querySelectorAll('.el-form-item__label,.el-input,.el-select,.el-textarea,.el-checkbox,.el-descriptions')]
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < b.left - 1 || r.right > b.right + 1) }).map(el => el.className)
  }))
  assert.deepEqual(overflow, [], `${name}: controls overflow`)
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-success-test-only', url: baseURL }])
  await context.route('**/dev-api/**', fixtures)
  const page = await context.newPage()
  activePage = page
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${baseURL}/dating/matches?pairId=1`)
  const drawer = page.locator('.dating-pair-drawer')
  await drawer.getByRole('button', { name: '成功结案', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '登记成功脱单', exact: true })
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await dialog.getByText('请输入双方确认凭证编号').waitFor()
  assert.equal(mutations, 0)
  await dialog.getByLabel('确认凭证编号').fill('CONFIRM-001')
  await dialog.getByLabel('脱单核实记录').fill('已分别回访双方，确认通过红娘服务建立恋爱关系')
  await dialog.getByText('双方已确认通过本次红娘服务脱单', { exact: true }).click()
  await screenshot(page, 'desktop-closure-form')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-closure-form')
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(mutations, 0)
  await dialog.getByRole('button', { name: '确认保存' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  await drawer.getByText('已停止扣次', { exact: true }).waitFor()
  assert.equal(mutations, 1)
  assert.equal(await drawer.getByRole('button', { name: '成功结案', exact: true }).isDisabled(), true)
  assert.equal(await drawer.getByRole('button', { name: '安排见面', exact: true }).isDisabled(), true)
  assert.equal(detail.participants[1].remainingTimes, 3)
  await screenshot(page, 'mobile-closed-pair')
  await page.goto(`${baseURL}/dating/success-cases`)
  await page.getByRole('button', { name: '案例详情', exact: true }).click()
  await page.locator('.dating-success-drawer').getByText('CONFIRM-001').waitFor()
  await screenshot(page, 'mobile-case-detail')
  await page.locator('.dating-success-drawer').getByRole('button', { name: '配对记录', exact: true }).click()
  await drawer.getByText('已停止扣次', { exact: true }).waitFor()
  await page.goto(`${baseURL}/dating/success-cases`)
  await page.getByRole('button', { name: '案例详情', exact: true }).waitFor()
  await screenshot(page, 'mobile-case-list')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await screenshot(page, 'desktop-case-list')
  await page.getByRole('button', { name: '案例详情', exact: true }).click()
  await page.locator('.dating-success-drawer').getByText('CONFIRM-001').waitFor()
  await screenshot(page, 'desktop-case-detail')
  await page.keyboard.press('Escape')
  await page.getByPlaceholder('结案时客户姓名').fill('不存在')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await page.getByText('暂无数据', { exact: true }).waitFor()
  assert.equal(filters.keyword, '不存在')
  await screenshot(page, 'desktop-empty-cases')
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await page.getByRole('button', { name: '案例详情', exact: true }).waitFor()
  await page.locator('.case-filters .el-select').click()
  await page.getByRole('option', { name: '红娘一 #10', exact: true }).click()
  await Promise.all([
    page.waitForResponse(res => res.url().includes('/dating/success-cases/stats') && res.url().includes('matchmakerId=10')),
    page.getByRole('button', { name: '查询', exact: true }).click()
  ])
  assert.equal(filters.matchmakerId, '10')
  enabled = false
  pair.progress = 'FOLLOWING'
  await page.goto(`${baseURL}/dating/matches?pairId=1`)
  await drawer.getByText('服务跟进中', { exact: true }).waitFor()
  assert.equal(await drawer.getByRole('button', { name: '成功结案', exact: true }).isDisabled(), true)
  permitted = false
  await page.reload()
  await drawer.getByText('服务跟进中', { exact: true }).waitFor()
  assert.equal(await drawer.getByRole('button', { name: '成功结案', exact: true }).count(), 0)
  assert.deepEqual(errors, [])
  console.log('PASS: closure validation/confirmation/cancel, not-renewed closure, retained balance, terminal controls, case list/detail/filters/stats/navigation, feature flag, permissions, desktop/mobile; mocked APIs only')
} catch (error) {
  if (activePage) {
    console.error('Failure URL:', activePage.url(), 'Browser errors:', errors)
    console.error(await activePage.locator('body').innerText())
    await activePage.screenshot({ path: `${output}failure.png`, fullPage: true })
  }
  throw error
} finally { await browser.close() }
