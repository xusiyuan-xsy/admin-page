// Intercepted APIs and synthetic identities only; never sends business writes.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5174'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-recovery-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
const requests = []
let mutations = []
let failIssues = false
let failHistory = false
let failRetry = false
const stamp = '2026-10-16 12:00:00'
const issues = Array.from({ length: 12 }, (_, i) => ({
  taskId: i + 1, pairId: 21, userId: i + 1, lowName: '测试客户甲', highName: '测试客户乙',
  customerName: '测试客户甲', ownerName: '测试红娘', status: i === 1 ? 'DONE' : i === 2 ? 'READY' : 'ERROR',
  outcome: i === 1 ? 'BLOCKED' : null, attempts: 5, errorCode: 'DATA_CONFLICT',
  blockedReason: '绑定权益次数不足', firstFailureAt: stamp, lastFailureAt: stamp,
  nextAttemptAt: stamp, pairProgress: i === 3 ? 'SUCCESS_CLOSED' : 'FOLLOWING', retryAllowed: ![2, 3].includes(i)
}))
const histories = new Map(issues.map(issue => [issue.taskId, Array.from({ length: 12 }, (_, i) => ({
  historyId: 12 - i, taskId: issue.taskId, action: 'FAILED', attempt: 5,
  errorCode: 'DATA_CONFLICT', createBy: 'dating-deduction', createTime: stamp
}))]))
const runs = Array.from({ length: 12 }, (_, i) => ({
  runId: `synthetic-run-${String(i + 1).padStart(3, '0')}`,
  startedAt: stamp, finishedAt: stamp, status: 'PARTIAL', scanned: 2, processed: 1, failed: 1, recordFailures: 0
}))
const menus = [{ path: '/dating', component: 'Layout', name: 'Dating', meta: { title: '婚恋服务' },
  children: [{ path: 'matches', name: 'DatingMatches', component: 'dating/matches/index', meta: { title: '配对服务' } }] }]
async function contextFor(permissions) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-recovery-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/dev-api', '')
    requests.push(path)
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    const fail = () => route.fulfill({ json: { code: 403, msg: '无权访问' } })
    const paginated = rows => {
      const page = Number(url.searchParams.get('pageNum') || 1)
      const size = Number(url.searchParams.get('pageSize') || 10)
      return reply({ rows: rows.slice((page - 1) * size, page * size), total: rows.length })
    }
    if (path === '/getInfo') return reply({ user: { userId: 42, userName: 'ui-test', nickName: '测试红娘' }, roles: ['common'], permissions })
    if (path === '/getRouters') return reply({ data: menus })
    if (path === '/dating/matches') return reply({ rows: [], total: 0 })
    if (path === '/dating/deduction-exceptions') {
      if (failIssues) return fail()
      const kind = url.searchParams.get('kind')
      const pairId = url.searchParams.get('pairId')
      const all = issues.filter(row => (!pairId || String(row.pairId) === pairId) &&
        (!kind || (kind === 'BLOCKED' ? row.outcome === kind : row.status === kind)))
      return paginated(all)
    }
    if (path.endsWith('/history')) return failHistory ? fail() : paginated(histories.get(Number(path.split('/').at(-2))) || [])
    if (path.endsWith('/retry')) {
      mutations.push(req.postDataJSON())
      if (failRetry) return fail()
      assert.equal(req.postDataJSON().reason, '已核查数据并修复')
      const taskId = Number(path.split('/').at(-2))
      histories.get(taskId).unshift({ historyId: 13, taskId, action: 'RETRY', attempt: 5, errorCode: 'MANUAL_RETRY',
        createBy: 'ui-test', createTime: stamp, reason: '已核查数据并修复' })
      issues.splice(issues.findIndex(row => row.taskId === Number(path.split('/').at(-2))), 1)
      return reply({ data: 21 })
    }
    if (path === '/dating/recovery/overview') return reply({ data: { health: 'PARTIAL',
      lastRun: { startedAt: stamp }, queue: { ready: 1, due: 1, overdue: 0, errors: 9, blocked: 1, pending: 3 }, staleRuns: 1 } })
    if (path === '/dating/recovery/runs') return paginated(runs)
    return reply({ data: [], rows: [], total: 0 })
  })
  return context
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready
    const animations = document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity)
    await Promise.all(animations.map(a => a.finished.catch(() => {})))
  })
  await page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: 'disabled' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name}: overflow`)
  assert.deepEqual(await page.locator('.el-dialog:visible,.el-drawer:visible').evaluateAll(nodes => nodes.flatMap(parent => {
    const p = parent.getBoundingClientRect()
    return [...parent.querySelectorAll('.el-textarea,.el-button')].filter(el => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && (r.left < p.left - 1 || r.right > p.right + 1)
    }).map(el => el.className)
  })), [])
}
try {
  const context = await contextFor(['dating:match:list', 'dating:match:query', 'dating:deduction:retry', 'dating:recovery:query'])
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${baseURL}/dating/matches`)
  await page.getByRole('button', { name: '扣次异常工作台' }).click()
  await page.getByText('测试客户甲 / 测试客户乙').first().waitFor()
  const workbench = page.locator('.recovery-workbench')
  assert.equal(await workbench.getByRole('button', { name: '重新核算扣次', exact: true }).nth(2).isDisabled(), true)
  assert.equal(await workbench.getByRole('button', { name: '重新核算扣次', exact: true }).nth(3).isDisabled(), true)
  await screenshot(page, 'desktop-issues')
  await workbench.locator('.el-pager').getByText('2', { exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('#pane-issues .el-table__row').length === 2)
  await workbench.getByRole('button', { name: '重置', exact: true }).click()
  await workbench.locator('.issue-filters .el-select__wrapper').first().click()
  await page.getByRole('option', { name: '业务受阻', exact: true }).click()
  await workbench.getByRole('button', { name: '查询', exact: true }).click()
  await page.getByText('绑定权益次数不足', { exact: true }).waitFor()
  await workbench.getByRole('button', { name: '重置', exact: true }).click()
  await workbench.getByRole('button', { name: '处理历史', exact: true }).first().click()
  let drawer = page.getByRole('dialog', { name: '任务 #1 · 处理历史' })
  await drawer.getByText('数据一致性冲突', { exact: true }).first().waitFor()
  await drawer.locator('.el-pager').getByText('2', { exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.el-drawer .el-table__row').length === 2)
  await screenshot(page, 'desktop-history')
  failHistory = true
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByText('处理历史加载失败或无权访问', { exact: true }).waitFor()
  failHistory = false
  await page.keyboard.press('Escape')
  await workbench.getByRole('button', { name: '重新核算扣次', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: '重新核算扣次', exact: true })
  await dialog.getByRole('button', { name: '确认重新核算' }).click()
  await dialog.getByText('请填写1至500字的重试原因').waitFor()
  assert.equal(mutations.length, 0)
  await dialog.getByLabel('重试原因').fill('   ')
  await dialog.getByRole('button', { name: '确认重新核算' }).click()
  assert.equal(mutations.length, 0)
  await dialog.getByLabel('重试原因').fill('已核查数据并修复')
  await screenshot(page, 'desktop-retry')
  await dialog.getByRole('button', { name: '确认重新核算' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(mutations.length, 0)
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-retry')
  await dialog.getByRole('button', { name: '确认重新核算' }).click()
  await screenshot(page, 'mobile-confirm')
  await page.locator('.el-message-box').getByRole('button', { name: '确认重试', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(mutations.length, 1)
  await workbench.getByRole('button', { name: '处理历史', exact: true }).first().click()
  await page.getByRole('dialog').getByText('数据一致性冲突', { exact: true }).first().waitFor()
  assert.equal(await page.getByRole('dialog').getByText('已核查数据并修复', { exact: true }).count(), 0)
  await screenshot(page, 'mobile-history')
  await page.keyboard.press('Escape')
  await screenshot(page, 'mobile-issues')
  await workbench.getByRole('tab', { name: '恢复监控' }).click()
  await workbench.getByText('synthetic-run-001').waitFor()
  await screenshot(page, 'mobile-monitor')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await screenshot(page, 'desktop-monitor')
  await page.locator('#pane-monitor .el-pager').getByText('2', { exact: true }).click()
  await page.getByText('synthetic-run-011', { exact: true }).waitFor()
  assert.equal(await page.locator('#pane-monitor .el-table__row').count(), 2)
  await workbench.getByRole('tab', { name: '异常任务' }).click()
  await workbench.getByLabel('配对编号').fill('999')
  await workbench.getByRole('button', { name: '查询', exact: true }).click()
  await workbench.getByText('暂无可见异常任务').waitFor()
  failIssues = true
  await workbench.getByRole('button', { name: '刷新', exact: true }).click()
  await workbench.getByText('异常任务加载失败或无权访问').waitFor()
  failIssues = false
  await workbench.getByRole('button', { name: '重置', exact: true }).click()
  await workbench.getByText('测试客户甲 / 测试客户乙').first().waitFor()
  failRetry = true
  await workbench.getByRole('button', { name: '重新核算扣次', exact: true }).first().click()
  await dialog.getByLabel('重试原因').fill('已核查数据并修复')
  await dialog.getByRole('button', { name: '确认重新核算' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确认重试', exact: true }).click()
  await dialog.getByText('提交未确认，请刷新任务与处理历史后核对结果').waitFor()
  assert.equal(await dialog.getByLabel('重试原因').inputValue(), '已核查数据并修复')
  await context.close()

  requests.length = 0
  const restricted = await contextFor(['dating:match:query'])
  const restrictedPage = await restricted.newPage()
  restrictedPage.on('pageerror', e => errors.push(e.message))
  await restrictedPage.goto(`${baseURL}/dating/recovery/index`)
  await restrictedPage.getByText('测试客户甲 / 测试客户乙').first().waitFor()
  assert.equal(await restrictedPage.getByRole('tab', { name: '恢复监控' }).count(), 0)
  assert.equal(await restrictedPage.getByRole('button', { name: '重新核算扣次', exact: true }).count(), 0)
  assert.equal(requests.some(path => path.startsWith('/dating/recovery/')), false)
  await restricted.close()
  assert.deepEqual(errors, [])
  console.log('PASS: entry, filters, pagination, history, required reason, confirmation/cancel, retry success/error, terminal guards, monitor permissions, desktop/mobile; mocked APIs only')
} finally { await browser.close() }
