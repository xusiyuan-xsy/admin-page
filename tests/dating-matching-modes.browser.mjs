// Mocked UI acceptance. Database filtering and authorization are tested separately.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
const output = process.env.DATING_MATCHING_EVIDENCE || fileURLToPath(new URL('../node_modules/.cache/matching-modes/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const checks = []
const menus = [{
  path: '/system', component: 'Layout', name: 'System', meta: { title: '系统管理' },
  children: [{ path: 'payingUsers', name: 'PayingUsers', component: 'system/payingUsers/index', meta: { title: '客户档案' } }]
}]
const requirement = { id: 1, payingId: 1, ageMin: 1985, ageMax: 1995, heightMin: 160, heightMax: 180,
  cityRequire: '广东省/深圳市', hometownRequire: '广东省', acceptLongDist: '0', otherRequire: '测试文字需求' }
const candidates = [
  { id: 2, name: '双向候选', reciprocalStatus: 'MATCH', serviceEligible: true },
  { id: 3, name: '单向候选', reciprocalStatus: 'MISMATCH', serviceEligible: true, reverseConflicts: ['住房不符合对方要求'] },
  { id: 4, name: '未续单候选', reciprocalStatus: 'UNKNOWN', serviceEligible: false, serviceStatus: 'NOT_RENEWED' }
].map(user => ({ sex: '1', birthYear: 1990, height: 170, phone: '19900000000', status: '0',
  serviceStatus: 'SERVING', currentCity: '广东省/深圳市/南山区', sourceEligible: true, matchmakerName: '测试红娘',
  matchedConditions: ['出生年份', '身高', '现居城市'], pendingConditions: ['本方：其他要求需人工核实'],
  familyMembers: '家庭资料', hobbies: '阅读', advantages: '细心', ...user }))

async function session(actions = true, canSearch = true) {
  const state = { searches: [], recommendations: [], fail: false, delay: false, paired: false }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-ui-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const endpoint = url.pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    if (endpoint === '/getInfo') return reply({
      user: { userId: 10, userName: 'alice', nickName: '测试红娘' }, roles: ['test'],
      permissions: ['system:payingUsers:list', 'system:payingRequirement:edit',
        ...(canSearch ? ['system:payingRequirement:search'] : []),
        ...(actions ? ['system:payingUsers:query', 'dating:match:add', 'dating:match:query', 'dating:match:list'] : [])]
    })
    if (endpoint === '/getRouters') return reply({ data: menus })
    if (endpoint === '/system/payingUsers/list') return reply({ rows: [{
      id: 1, name: '需求客户', sex: '0', status: '0', serviceStatus: 'SERVING', requirement
    }], total: 1 })
    if (endpoint === '/system/payingRequirement/search') {
      const data = req.postDataJSON()
      state.searches.push(data)
      assert.equal(url.searchParams.get('pageNum'), String(data.pageNum))
      if (state.fail) return route.fulfill({ json: { code: 500, msg: '测试查询失败' } })
      let rows = candidates.filter(user => data.candidateScope === 'ALL' || user.serviceEligible)
        .filter(user => data.matchMode === 'ONE_WAY' || user.reciprocalStatus === 'MATCH')
        .map(user => state.paired && user.id === 2 ? { ...user, pairId: 88, pairProgress: 'COMMUNICATING' } : user)
        .filter(user => data.historyFilter !== 'NEW' || !user.pairId)
      if (data.sortBy === 'RECENT') rows.sort((a, b) => b.id - a.id)
      if (state.delay && data.matchMode === 'ONE_WAY') await new Promise(resolve => setTimeout(resolve, 900))
      return reply({ rows, total: rows.length })
    }
    if (endpoint === '/dating/recommendations') {
      state.recommendations.push(req.postDataJSON())
      if (state.recommendations.length === 1) return route.fulfill({ json: { code: 500, msg: '模拟响应失败' } })
      state.paired = true
      return reply({ data: 88 })
    }
    if (endpoint === '/system/payingUsers/2') return reply({ data: candidates[0] })
    if (endpoint === '/system/region/list') {
      const regions = {
        '': [{ code: '440000', name: '广东省', level: 1, leaf: false }],
        '440000': [{ code: '440300', name: '深圳市', level: 2, leaf: false }],
        '440300': [{ code: '440305', name: '南山区', level: 3, leaf: true }]
      }
      return reply({ data: regions[url.searchParams.get('parentCode') || ''] || [] })
    }
    if (endpoint.startsWith('/system/dict/data/type/')) return reply({ data: [] })
    if (endpoint === '/system/config/configKey/sys.user.initPassword') return reply({ msg: 'TEST_ONLY' })
    if (endpoint === '/system/notice/listTop') return reply({ rows: [], total: 0 })
    errors.push(`${req.method()} ${endpoint}`)
    return route.fulfill({ status: 400, json: { code: 400 } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseURL}/system/payingUsers`)
  await page.getByText('需求客户', { exact: true }).waitFor()
  return { page, context, state }
}
async function count(page, expected) {
  await page.waitForFunction(n => document.querySelector('.result-toolbar__count b')?.textContent === String(n)
    && !document.querySelector('.el-dialog .el-loading-mask'), expected)
}
async function choose(page, name, label) {
  await page.locator('.el-select').filter({ has: page.getByRole('combobox', { name, exact: true }) }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled' })
  const overflow = await page.locator('.el-dialog:visible').evaluateAll(dialogs => dialogs.flatMap(dialog =>
    [dialog, ...dialog.querySelectorAll('.el-input, .el-select, .el-textarea, .el-radio-group')].filter(element => {
      const r = element.getBoundingClientRect()
      const d = dialog.getBoundingClientRect()
      return r.width > 0 && (r.left < Math.max(0, d.left) - 1 || r.right > Math.min(innerWidth, d.right) + 1)
    }).map(element => element.className)))
  assert.deepEqual(overflow, [], `${name}: horizontal overflow`)
}
async function checkFilterTheme(page, dark) {
  await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
  await page.waitForTimeout(350)
  const colors = await page.locator('.search-form').evaluate(form => {
    const dialog = form.closest('.el-dialog')
    const color = element => getComputedStyle(element).color
    return {
      background: getComputedStyle(form).backgroundColor,
      dialogBackground: getComputedStyle(dialog).backgroundColor,
      formText: [color(form), color(form.querySelector('.el-form-item__label')),
        color(form.querySelector('.range-separator'))],
      toolbarText: ['.source-name', '.search-toolbar__title', '.result-toolbar__count']
        .map(selector => color(dialog.querySelector(selector)))
    }
  })
  const luminance = color => {
    const channels = color.match(/[\d.]+/g).map(Number)
    assert.ok(channels.length === 3 || channels[3] === 1, `Expected opaque color: ${color}`)
    const [r, g, b] = channels.slice(0, 3).map(value => {
      const channel = value / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const background = luminance(colors.background)
  assert.ok(dark ? background < 0.1 : background > 0.8, `Wrong filter surface: ${colors.background}`)
  for (const [textColors, surface] of [
    [colors.formText, background], [colors.toolbarText, luminance(colors.dialogBackground)]
  ]) {
    for (const text of textColors) {
      const foreground = luminance(text)
      const contrast = (Math.max(foreground, surface) + 0.05) / (Math.min(foreground, surface) + 0.05)
      assert.ok(contrast >= 4.5, `Insufficient ${dark ? 'dark' : 'light'} text contrast: ${text}, ${contrast}`)
    }
  }
}
try {
  let { page, context, state } = await session()
  await page.getByRole('button', { name: '查询匹配', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '查询匹配', exact: true })
  await count(page, 2)
  await page.waitForFunction(() => [...document.querySelectorAll('.el-dialog .el-cascader input')].some(e => e.value.includes('深圳市')))
  assert.equal(state.searches[0].candidateScope, 'ELIGIBLE')
  await dialog.getByText('双向需求匹配', { exact: true }).click()
  await count(page, 1)
  await checkFilterTheme(page, false)
  await screenshot(page, 'modes-desktop-table')
  await checkFilterTheme(page, true)
  await screenshot(page, 'modes-dark-desktop-form')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'modes-dark-mobile-form')
  await page.setViewportSize({ width: 1440, height: 1100 })
  await checkFilterTheme(page, false)
  checks.push('light/dark/light filter theme switching, readable text contrast, desktop/mobile')
  await dialog.getByRole('button', { name: '卡片', exact: true }).click()
  await dialog.getByText('双向候选', { exact: true }).waitFor()
  await dialog.getByText('阅读', { exact: true }).waitFor()
  await screenshot(page, 'modes-desktop-card')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'modes-mobile-form')
  await dialog.locator('.card-grid').scrollIntoViewIfNeeded()
  await screenshot(page, 'modes-mobile-card')
  await page.setViewportSize({ width: 1440, height: 1100 })
  checks.push('mode switch, saved region, corrected card fields, desktop/mobile')
  await dialog.getByRole('button', { name: '查看档案', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '客户档案', exact: true })
  await detail.getByText('双向候选', { exact: true }).waitFor()
  await detail.locator('.el-dialog__headerbtn').click()
  await dialog.getByRole('button', { name: '创建推荐', exact: true }).click()
  const recommend = page.getByRole('dialog', { name: '创建推荐', exact: true })
  await recommend.locator('textarea').fill('已人工核实需求，测试推荐')
  await recommend.getByRole('button', { name: '确认推荐', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.el-message--error'))
  await page.waitForTimeout(1100)
  await recommend.getByRole('button', { name: '确认推荐', exact: true }).click()
  await recommend.waitFor({ state: 'hidden' })
  assert.deepEqual(state.recommendations[0], state.recommendations[1])
  await dialog.getByRole('button', { name: '查看配对', exact: true }).waitFor()
  assert.equal(await dialog.getByRole('button', { name: '创建推荐', exact: true }).count(), 0)
  await choose(page, '配对历史', '仅未配对对象')
  await count(page, 0)
  await dialog.getByText('暂无匹配结果', { exact: true }).waitFor()
  await choose(page, '配对历史', '全部配对历史')
  await count(page, 1)
  checks.push('archive detail, recommendation retry key, existing pair, history, empty')
  state.delay = true
  await dialog.getByText('单向需求匹配', { exact: true }).click()
  await dialog.getByText('双向需求匹配', { exact: true }).click()
  await count(page, 1)
  await page.waitForTimeout(1100)
  await count(page, 1)
  state.delay = false
  state.fail = true
  await dialog.getByRole('button', { name: '查询', exact: true }).click()
  await dialog.getByText('匹配查询失败，请重试', { exact: true }).waitFor()
  assert.equal(await dialog.getByText('暂无匹配结果', { exact: true }).count(), 0)
  state.fail = false
  await page.waitForTimeout(1100)
  await dialog.getByRole('button', { name: '重试查询', exact: true }).click()
  await count(page, 1)
  await dialog.getByText('单向需求匹配', { exact: true }).click()
  await count(page, 2)
  await choose(page, '候选范围', '全部正常档案')
  await count(page, 3)
  const inactive = dialog.locator('.user-card').filter({ hasText: '未续单候选' })
  assert.ok(await inactive.getByRole('button', { name: '创建推荐', exact: true }).isDisabled())
  checks.push('stale request, retryable error, candidate scope and eligibility guard')
  await dialog.locator('.el-dialog__headerbtn').click()
  await page.getByRole('button', { name: '修改需求', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '修改需求', exact: true })
  await page.waitForFunction(() => [...document.querySelectorAll('.el-dialog .el-cascader input')].some(e => e.value.includes('深圳市')))
  assert.equal(await edit.locator('textarea').first().inputValue(), requirement.otherRequire)
  await screenshot(page, 'modes-requirement-hydration')
  await context.close()
  ;({ page, context } = await session(false))
  await page.getByRole('button', { name: '查询匹配', exact: true }).click()
  await count(page, 2)
  dialog = page.getByRole('dialog', { name: '查询匹配', exact: true })
  assert.equal(await dialog.getByRole('button', { name: /创建推荐|查看配对|查看档案/ }).count(), 0)
  await context.close()
  ;({ page, context } = await session(false, false))
  assert.equal(await page.getByRole('button', { name: '查询匹配', exact: true }).count(), 0)
  await context.close()
  checks.push('requirement region hydration and action/search permission visibility')
  assert.deepEqual(errors, [])
  await writeFile(path.join(output, 'modes-ui-result.json'), JSON.stringify({ type: 'MOCKED_UI_NOT_HTTP_AUTH', checks, errors }, null, 2))
  console.log(`PASS: ${checks.length} UI scenario groups`)
} finally {
  await browser.close()
}
