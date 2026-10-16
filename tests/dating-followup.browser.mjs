// Synthetic identities and intercepted APIs only; never sends real business writes.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5174'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-followup-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
const posts = []
const queries = []
const stamp = '2026-10-16 12:00:00'
let failDetail = false
let failHistory = false
let failSave = false
let active = true
let overdue = false
let current = { taskId: 1, version: 0, status: 'UNASSIGNED', handler: null, handlerName: null, dueAt: null }
let history = []
const issue = { taskId: 1, pairId: 21, userId: 1, lowName: '测试客户甲', highName: '测试客户乙',
  customerName: '测试客户甲', ownerName: '负责红娘', status: 'ERROR', attempts: 5, errorCode: 'DATA_CONFLICT',
  pairProgress: 'FOLLOWING', retryAllowed: true }
async function makeContext(canHandle) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-followup-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    const fail = () => route.fulfill({ json: { code: 500, msg: '记录已变化，请刷新' } })
    const page = rows => {
      const number = Number(url.searchParams.get('pageNum') || 1)
      const size = Number(url.searchParams.get('pageSize') || 10)
      return reply({ rows: rows.slice((number - 1) * size, number * size), total: rows.length })
    }
    if (path === '/getInfo') return reply({ user: { userId: 42, userName: 'ui-test', nickName: '测试红娘' },
      roles: ['common'], permissions: ['dating:match:query', ...(canHandle ? ['dating:exception:handle'] : [])] })
    if (path === '/getRouters') return reply({ data: [] })
    if (path === '/system/notice/listTop') return reply({ data: [], rows: [], total: 0 })
    if (path === '/dating/deduction-exceptions') {
      queries.push(Object.fromEntries(url.searchParams))
      const handling = url.searchParams.get('handling')
      const matches = (!handling || handling === current.status) &&
        (url.searchParams.get('mine') !== 'true' || current.handler === 'ui-test') &&
        (url.searchParams.get('overdueOnly') !== 'true' || overdue)
      return page(matches ? [{ ...issue, handlingStatus: current.status, handlerName: current.handlerName,
        dueAt: current.dueAt, followupOverdue: overdue }] : [])
    }
    if (path.endsWith('/follow-up/history')) return failHistory ? fail() : page(history)
    if (path.endsWith('/follow-up')) {
      if (req.method() === 'GET') return failDetail ? fail() : reply({ data: { followup: current,
        active, overdue: active && overdue, canClaim: active && !current.handler,
        canUpdate: active && current.handler === 'ui-test', canRelease: current.handler === 'ui-test' } })
      const body = req.postDataJSON()
      posts.push(body)
      if (failSave) return fail()
      assert.equal(body.version, current.version)
      assert.ok(body.note.trim().length)
      current = { ...current, version: current.version + 1,
        status: body.action === 'RELEASE' ? 'UNASSIGNED' : body.status || 'IN_PROGRESS',
        handler: body.action === 'RELEASE' ? null : 'ui-test',
        handlerName: body.action === 'RELEASE' ? null : '测试红娘', dueAt: body.dueAt }
      history.unshift({ ...current, historyId: current.version, action: body.action,
        note: body.note, createBy: 'ui-test', createTime: stamp })
      return reply({})
    }
    if (path.endsWith('/history')) return page([])
    throw new Error(`Unexpected mock route: ${path}`)
  })
  return context
}
async function shot(page, name) {
  await page.waitForFunction(() => document.querySelectorAll('.el-message').length === 0)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {})))
  })
  await page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: 'disabled' })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: page overflow`)
  assert.deepEqual(await page.locator('.el-drawer:visible').evaluateAll(nodes => nodes.flatMap(parent => {
    const p = parent.getBoundingClientRect()
    return [...parent.querySelectorAll('.el-textarea,.el-button,.el-date-editor,.el-radio-group')].filter(el => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && (r.left < p.left - 1 || r.right > p.right + 1)
    }).map(el => el.className)
  })), [])
}
try {
  const context = await makeContext(true)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseURL}/dating/recovery/index`)
  const workbench = page.locator('.recovery-workbench')
  await workbench.getByRole('button', { name: '责任跟进', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: '任务 #1 · 责任跟进' })
  await drawer.getByRole('button', { name: '认领', exact: true }).click()
  await page.getByText('请填写跟进说明', { exact: true }).waitFor()
  assert.equal(posts.length, 0)
  await drawer.getByLabel('跟进说明').fill('已核实异常归属')
  await shot(page, 'desktop-claim')
  await drawer.getByRole('button', { name: '认领', exact: true }).click()
  await drawer.getByRole('button', { name: '保存跟进' }).waitFor()
  assert.equal(posts.length, 1)
  assert.equal(posts[0].action, 'CLAIM')
  await drawer.locator('.el-radio-button').filter({ hasText: '等待处理' }).click()
  assert.equal(await drawer.getByRole('radio', { name: '等待处理' }).isChecked(), true)
  await drawer.getByLabel('跟进说明').fill('等待凭证复核')
  await drawer.getByLabel('跟进截止时间').fill('2099-10-16 18:00:00')
  await drawer.getByLabel('跟进截止时间').press('Enter')
  await drawer.getByRole('button', { name: '保存跟进' }).click()
  await drawer.getByText('等待凭证复核', { exact: true }).waitFor()
  assert.equal(posts[1].status, 'WAITING')
  assert.equal(posts[1].dueAt, '2099-10-16 18:00:00')
  await shot(page, 'desktop-progress')
  await page.setViewportSize({ width: 390, height: 844 })
  await shot(page, 'mobile-progress')
  await drawer.getByLabel('跟进说明').fill('已转交复核')
  await drawer.getByRole('button', { name: '释放责任' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(posts.length, 2)
  await drawer.getByRole('button', { name: '释放责任' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await drawer.getByRole('button', { name: '认领', exact: true }).waitFor()
  assert.equal(posts[2].dueAt, null)
  failSave = true
  await drawer.getByLabel('跟进说明').fill('提交失败后保留')
  await drawer.getByRole('button', { name: '认领', exact: true }).click()
  await drawer.getByText('提交未确认，请先刷新核对最新记录；填写内容已保留').waitFor()
  assert.equal(await drawer.getByRole('button', { name: '认领', exact: true }).isDisabled(), true)
  assert.equal(await drawer.getByLabel('跟进说明').inputValue(), '提交失败后保留')
  failSave = false
  failDetail = true
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByText('跟进记录加载失败或无权访问，请刷新后重试').waitFor()
  failDetail = false
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByRole('button', { name: '认领', exact: true }).waitFor()
  assert.equal(await drawer.getByLabel('跟进说明').inputValue(), '提交失败后保留')
  // Respect the application's one-second duplicate request guard when retrying identical input.
  await page.waitForFunction(() => Date.now() - JSON.parse(sessionStorage.getItem('sessionObj')).time >= 1000)
  await drawer.getByRole('button', { name: '认领', exact: true }).click()
  await drawer.getByRole('button', { name: '保存跟进' }).waitFor()
  overdue = true
  current.dueAt = stamp
  history = Array.from({ length: 12 }, (_, i) => ({ historyId: 100 - i, taskId: 1, version: 100 - i,
    action: 'UPDATE', status: 'WAITING', dueAt: stamp, note: `跟进记录${100 - i}`,
    createBy: 'ui-test', createTime: stamp }))
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByText('已逾期', { exact: true }).waitFor()
  await drawer.locator('.el-pager').getByText('2', { exact: true }).click()
  await drawer.getByText('跟进记录90', { exact: true }).waitFor()
  assert.equal(await drawer.locator('.el-table__row').count(), 2)
  await shot(page, 'mobile-overdue-history')
  failHistory = true
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByText('跟进历史加载失败，请刷新重试').waitFor()
  failHistory = false
  active = false
  await drawer.getByRole('button', { name: '刷新', exact: true }).click()
  await drawer.getByText('当前任务不在可跟进异常范围内').waitFor()
  assert.equal(await drawer.getByRole('button', { name: '保存跟进' }).count(), 0)
  assert.equal(await drawer.getByText('已逾期', { exact: true }).count(), 0)
  await page.keyboard.press('Escape')
  await drawer.waitFor({ state: 'hidden' })
  await workbench.locator('.el-checkbox').filter({ hasText: '我认领的' }).click()
  await workbench.locator('.el-checkbox').filter({ hasText: '仅看跟进逾期' }).click()
  assert.equal(await workbench.getByRole('checkbox', { name: '我认领的' }).isChecked(), true)
  assert.equal(await workbench.getByRole('checkbox', { name: '仅看跟进逾期' }).isChecked(), true)
  await workbench.locator('.issue-filters .el-select__wrapper').nth(1).click()
  await page.getByRole('option', { name: '处理中', exact: true }).click()
  await workbench.getByRole('button', { name: '查询', exact: true }).click()
  await workbench.getByText('测试客户甲 / 测试客户乙').waitFor()
  assert.equal(queries.at(-1).mine, 'true')
  assert.equal(queries.at(-1).overdueOnly, 'true')
  assert.equal(queries.at(-1).handling, 'IN_PROGRESS')
  await shot(page, 'mobile-filters')
  await workbench.getByRole('button', { name: '重置', exact: true }).click()
  await workbench.getByRole('button', { name: '处理历史', exact: true }).click()
  const technical = page.getByRole('dialog', { name: '任务 #1 · 处理历史' })
  await technical.getByRole('button', { name: '责任跟进' }).click()
  await drawer.getByText('当前任务不在可跟进异常范围内').waitFor()
  await drawer.getByText('跟进记录100', { exact: true }).waitFor()
  await shot(page, 'mobile-retained-history')
  await context.close()

  active = true
  const restricted = await makeContext(false)
  const readonly = await restricted.newPage()
  readonly.on('pageerror', error => errors.push(error.message))
  await readonly.goto(`${baseURL}/dating/recovery/index`)
  await readonly.getByRole('button', { name: '责任跟进', exact: true }).click()
  const view = readonly.getByRole('dialog', { name: '任务 #1 · 责任跟进' })
  await view.getByText('跟进记录100', { exact: true }).waitFor()
  assert.equal(await view.getByRole('button', { name: '保存跟进' }).count(), 0)
  assert.equal(await view.getByRole('button', { name: '释放责任' }).count(), 0)
  await shot(readonly, 'desktop-readonly')
  await restricted.close()
  assert.deepEqual(errors, [])
  console.log('PASS: claim/update/release, note validation, confirmation/cancel, deadline, filters, pagination, overdue, recovered history, stale/error preservation, permissions, desktop/mobile; mocked APIs only')
} finally { await browser.close() }
