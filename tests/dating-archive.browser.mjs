// UI fixtures only. Real archive scope and controller permissions are tested in Java.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5173'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
const menus = [{
  path: '/system', component: 'Layout', name: 'System', meta: { title: '系统管理' },
  children: [{ path: 'payingUser', name: 'PayingUser', component: 'system/payingUsers/index', meta: { title: '客户档案' } }]
}]
async function session(permissions) {
  let requirement = null
  let statsRequests = 0
  let searchRequests = 0
  let statsFails = false
  let searchFails = false
  let savedArchive = null
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-ui-test-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    if (path === '/getInfo') return reply({ user: { userId: 10, userName: 'alice', nickName: '测试红娘' }, roles: ['matchmaker'], permissions })
    if (path === '/getRouters') return reply({ data: menus })
    if (path === '/system/payingUsers/stats') {
      statsRequests++
      if (statsFails) return route.fulfill({ json: { code: 500, msg: '测试统计失败' } })
      return reply({ data: { delFlag0Count: 8, servingCount: 3, notStartedCount: 2, notRenewedCount: 1, successClosedCount: 2,
        successPeopleCount: 2, successCaseCount: 1, maleCount: 4, femaleCount: 4, birthYearStats: [{ year: 1996, maleCount: 4, femaleCount: 4 }] } })
    }
    if (path === '/system/payingUsers/list') return reply({ rows: [{
      id: 1, name: '本组客户', phone: '13800000001', sex: '0', birthYear: 1996, serviceStatus: 'SERVING', status: '0', requirement
    }], total: 1 })
    if (path === '/system/payingUsers/1') return reply({ data: {
      id: 1, name: '本组客户', phone: '19900000000', sex: '0', birthYear: 1990, height: 170, weight: 60,
      currentCity: '广东省/深圳市/南山区', hometown: '广东省/深圳市/南山区',
      hasHouse: '0', hasCar: '0', hasTattoo: '0', smokeHabit: '0', drinkHabit: '0', acceptLongDist: '0',
      status: '0', photos: [], remark: 'TEST ONLY - no contact'
    } })
    if (path === '/system/payingUsers' && req.method() === 'PUT') {
      savedArchive = req.postDataJSON()
      return reply({})
    }
    if (path === '/system/region/list') {
      const regions = {
        '': [{ code: '440000', name: '广东省', level: 1, leaf: false }],
        '440000': [{ code: '440300', name: '深圳市', level: 2, leaf: false }],
        '440300': [{ code: '440305', name: '南山区', level: 3, leaf: true }]
      }
      return reply({ data: regions[new URL(req.url()).searchParams.get('parentCode') || ''] || [] })
    }
    if (path === '/system/payingRequirement' && ['POST', 'PUT'].includes(req.method())) {
      requirement = { ...req.postDataJSON(), id: 21 }
      return reply({})
    }
    if (path === '/system/payingRequirement/search') {
      searchRequests++
      if (searchFails) return route.fulfill({ json: { code: 500, msg: '测试查询失败' } })
      return reply({ rows: [{ id: 2, name: '候选客户', sex: '1', birthYear: 1996, status: '0' }], total: 1 })
    }
    if (path === '/system/dict/data/type/sys_user_education') return reply({ data: [{ dictValue: '0', dictLabel: '未知' }, { dictValue: '5', dictLabel: '本科' }] })
    if (path === '/system/dict/data/type/sys_user_sex') return reply({ data: [{ dictValue: '0', dictLabel: '男' }, { dictValue: '1', dictLabel: '女' }] })
    if (path === '/system/dict/data/type/sys_normal_disable') return reply({ data: [{ dictValue: '0', dictLabel: '正常' }, { dictValue: '1', dictLabel: '停用' }] })
    return reply({ data: [], rows: [], total: 0 })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  return { context, page, setStatsFails: () => { statsFails = true }, setSearchFails: () => { searchFails = true },
    statsRequests: () => statsRequests, searchRequests: () => searchRequests, requirement: () => requirement,
    savedArchive: () => savedArchive }
}
async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {})))
  })
  await page.screenshot({ path: output + name + '.png', fullPage: true, animations: 'disabled' })
  const outside = await page.locator('.el-dialog:visible').evaluateAll(dialogs => dialogs.flatMap(dialog => {
    const bounds = dialog.getBoundingClientRect()
    const elements = [dialog, ...dialog.querySelectorAll('.el-input, .el-select, .el-input-number, .el-textarea')]
    return elements.filter(e => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && (r.left < Math.max(0, bounds.left) - 1 || r.right > Math.min(innerWidth, bounds.right) + 1)
    }).map(e => e.className)
  }))
  assert.deepEqual(outside, [], name + ': dialog overflow')
}
try {
  let s = await session(['system:payingUsers:list', 'system:payingRequirement:add', 'system:payingRequirement:search'])
  let { page } = s
  await page.goto(`${baseURL}/system/payingUser`)
  await page.getByText('本组客户', { exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: '新增', exact: true }).count(), 0)
  await page.getByRole('button', { name: '新增需求', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: '新增需求', exact: true })
  await screenshot(page, 'desktop-requirement')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-requirement')
  await dialog.getByRole('button', { name: '确定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(s.requirement().payingId, 1)
  assert.equal(await page.getByRole('button', { name: '修改需求', exact: true }).count(), 0)
  await page.getByRole('button', { name: '查询匹配', exact: true }).click()
  await page.getByText('候选客户', { exact: true }).waitFor()
  assert.equal(s.searchRequests(), 1)
  await screenshot(page, 'mobile-archive-match')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await screenshot(page, 'desktop-archive-match')
  s.setSearchFails()
  await page.getByRole('dialog', { name: '查询匹配' }).getByRole('button', { name: '查询', exact: true }).click()
  await page.getByText('候选客户', { exact: true }).waitFor({ state: 'hidden' })
  await page.goto(`${baseURL}/index`)
  await page.getByText('成功案例', { exact: true }).waitFor()
  assert.equal(await page.locator('.stat-value').nth(2).textContent(), '2')
  assert.equal(await page.locator('.stat-value').nth(3).textContent(), '1')
  await screenshot(page, 'desktop-scoped-stats')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-scoped-stats')
  s.setStatsFails()
  await page.reload()
  await page.getByText('统计数据加载失败', { exact: true }).waitFor()
  assert.equal(await page.locator('.stat-value').count(), 0)
  await s.context.close()

  s = await session(['dating:order:list'])
  await s.page.goto(`${baseURL}/index`)
  await s.page.getByText('暂无客户统计查看权限', { exact: true }).waitFor()
  assert.equal(s.statsRequests(), 0)
  assert.equal(await s.page.locator('.stat-value').count(), 0)
  await s.context.close()

  s = await session(['system:payingUsers:list', 'system:payingUsers:query', 'system:payingUsers:edit'])
  page = s.page
  await page.goto(`${baseURL}/system/payingUser`)
  await page.getByText('本组客户', { exact: true }).waitFor()
  await page.locator('.el-table').getByRole('button', { name: '修改', exact: true }).click()
  dialog = page.getByRole('dialog', { name: '修改用户', exact: true })
  await dialog.waitFor()
  await page.waitForFunction(() => {
    const inputs = [...document.querySelectorAll('.archive-editor-form .el-cascader input')]
    return inputs.length === 2 && inputs.every(input => input.value.includes('南山区'))
  })
  await screenshot(page, 'desktop-complete-archive')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot(page, 'mobile-complete-archive')
  await dialog.getByRole('button', { name: '确 定', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(s.savedArchive().currentCity, '广东省/深圳市/南山区')
  assert.equal(s.savedArchive().hometown, '广东省/深圳市/南山区')
  assert.match(s.savedArchive().phone, /^1[3-9]\d{9}$/)
  for (const field of ['name', 'sex', 'birthYear', 'height', 'weight', 'hasHouse', 'hasCar',
    'hasTattoo', 'smokeHabit', 'drinkHabit', 'acceptLongDist']) {
    assert.notEqual(s.savedArchive()[field], undefined, field)
    assert.notEqual(s.savedArchive()[field], '', field)
  }
  await s.context.close()
  assert.deepEqual(errors, [], 'Uncaught browser errors')
  console.log('PASS: optional requirement, dynamic permissions, matching/error states, scoped statistics, complete archive edit/region hydration, desktop/mobile; mock API only')
} finally { await browser.close() }
