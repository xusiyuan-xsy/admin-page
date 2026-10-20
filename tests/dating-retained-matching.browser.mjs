// UI replay of sanitized real-MySQL results. This is not live HTTP authorization acceptance.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const evidence = process.env.DATING_MATCHING_EVIDENCE
assert.ok(evidence && path.isAbsolute(evidence), 'Set the protected evidence directory')
const fixtures = JSON.parse(await readFile(path.join(evidence, 'matching-ui-fixtures.json'), 'utf8'))
const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname), 'Local UI only')
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const errors = []
const checks = []
const requests = []
const menus = [{
  path: '/system', component: 'Layout', name: 'System', meta: { title: '系统管理' },
  children: [{ path: 'payingUsers', name: 'PayingUsers', component: 'system/payingUsers/index', meta: { title: '用户' } }]
}]

async function session(canSearch = true) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-ui-test-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const endpoint = url.pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    if (endpoint === '/getInfo') return reply({
      user: { userId: 100, userName: 'accept_owner', nickName: '界面回放测试' }, roles: ['ui_fixture'],
      permissions: ['system:payingUsers:list', 'system:payingRequirement:edit',
        ...(canSearch ? ['system:payingRequirement:search'] : [])]
    })
    if (endpoint === '/getRouters') return reply({ data: menus })
    if (endpoint === '/system/notice/listTop') return reply({ rows: [], total: 0 })
    if (endpoint === '/system/config/configKey/sys.user.initPassword') return reply({ msg: 'TEST_LOGIN_DISABLED' })
    if (endpoint === '/system/payingUsers/list') {
      const rows = fixtures.archives.filter(row => row.name.includes(url.searchParams.get('name') || ''))
      return reply({ rows, total: rows.length })
    }
    if (endpoint === '/system/payingRequirement/search') {
      const data = request.postDataJSON()
      const fixture = fixtures[String(data.payingId)]
      assert.ok(fixture, 'Unknown customer')
      assert.equal(url.searchParams.get('pageNum'), String(data.pageNum))
      assert.equal(url.searchParams.get('pageSize'), String(data.pageSize))
      for (const field of ['ageMin', 'ageMax', 'heightMin', 'heightMax', 'education',
        'noTattoo', 'acceptLongDist', 'smokeHabit', 'drinkHabit', 'hasCar', 'hasHouse', 'hometownRequire']) {
        assert.equal(data[field] ?? null, fixture.requirement[field] ?? null, `Saved preference: ${field}`)
      }
      if (data.acceptLongDist === '0') assert.equal(data.cityRequire, fixture.requirement.cityRequire)
      else assert.equal(data.cityRequire, undefined)
      requests.push({ payingId: data.payingId, pageNum: data.pageNum, pageSize: data.pageSize })
      const start = (data.pageNum - 1) * data.pageSize
      return reply({ rows: fixture.rows.slice(start, start + data.pageSize), total: fixture.total })
    }
    if (endpoint === '/system/region/list') {
      const regions = {
        '': [{ code: '440000', name: '广东省', level: 1, leaf: false }],
        '440000': [{ code: '440300', name: '深圳市', level: 2, leaf: false }],
        '440300': [{ code: '440305', name: '南山区', level: 3, leaf: true }]
      }
      return reply({ data: regions[url.searchParams.get('parentCode') || ''] || [] })
    }
    if (endpoint === '/system/dict/data/type/sys_user_education') return reply({
      data: [{ dictValue: '0', dictLabel: '未知' }, { dictValue: '5', dictLabel: '本科' }]
    })
    if (endpoint === '/system/dict/data/type/sys_user_sex') return reply({
      data: [{ dictValue: '0', dictLabel: '男' }, { dictValue: '1', dictLabel: '女' }]
    })
    if (endpoint === '/system/dict/data/type/sys_normal_disable') return reply({
      data: [{ dictValue: '0', dictLabel: '正常' }, { dictValue: '1', dictLabel: '停用' }]
    })
    errors.push(`Unexpected API: ${request.method()} ${endpoint}`)
    return route.fulfill({ status: 400, json: { code: 400, msg: 'Unexpected test request' } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${baseURL}/system/payingUsers`)
  await page.getByText('FT1016182629ee3-A', { exact: true }).waitFor()
  return { context, page }
}

async function screenshot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {})))
  })
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true, animations: 'disabled' })
  const outside = await page.locator('.el-dialog:visible').evaluateAll(dialogs => dialogs.flatMap(dialog => {
    const bounds = dialog.getBoundingClientRect()
    return [dialog, ...dialog.querySelectorAll('.el-input, .el-select, .el-input-number')]
      .filter(element => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && (rect.left < Math.max(0, bounds.left) - 1
          || rect.right > Math.min(innerWidth, bounds.right) + 1)
      }).map(element => element.className)
  }))
  assert.deepEqual(outside, [], `${name}: dialog field overflow`)
}

try {
  let { context, page } = await session()
  assert.equal(await page.getByRole('button', { name: '查询匹配', exact: true }).count(), 10)
  for (let id = 7; id <= 16; id++) {
    const name = `FT1016182629ee3-${String.fromCharCode(65 + id - 7)}`
    const row = page.locator('.el-table__body-wrapper tr').filter({ hasText: name })
    await row.getByRole('button', { name: '查询匹配', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '查询匹配', exact: true })
    await dialog.waitFor()
    // These archived fixtures represent the legacy one-way, all-archive query.
    await dialog.locator('.el-select').filter({ has: page.getByRole('combobox', { name: '候选范围', exact: true }) }).click()
    await page.getByRole('option', { name: '全部正常档案', exact: true }).click()
    await dialog.locator('.el-select').filter({ has: page.getByRole('combobox', { name: '结果排序', exact: true }) }).click()
    await page.getByRole('option', { name: '档案编号倒序', exact: true }).click()
    await page.waitForFunction(total => {
      const count = document.querySelector('.result-toolbar__count b')
      return count && Number(count.textContent) === total
        && !document.querySelector('.el-dialog .el-loading-mask')
    }, fixtures[id].total)
    const renderedIds = await dialog.locator('.el-table__body-wrapper tbody tr td:first-child .cell').allTextContents()
    assert.deepEqual(renderedIds.map(Number), fixtures[id].rows.map(row => row.id))
    assert.ok(requests.some(request => request.payingId === id))
    if (id === 7) {
      await page.waitForFunction(() => [...document.querySelectorAll('.el-dialog .el-cascader input')].some(e => e.value.includes('深圳市')))
      await screenshot(page, 'matching-desktop-table')
      await dialog.getByRole('button', { name: '卡片', exact: true }).click()
      assert.equal(await dialog.locator('.card-grid > *').count(), 5)
      await screenshot(page, 'matching-desktop-cards')
      await page.setViewportSize({ width: 390, height: 844 })
      await screenshot(page, 'matching-mobile-cards')
      await dialog.locator('.card-grid').scrollIntoViewIfNeeded()
      await screenshot(page, 'matching-mobile-cards-scrolled')
      await dialog.getByRole('button', { name: '表格', exact: true }).click()
      await screenshot(page, 'matching-mobile-table')
      await page.setViewportSize({ width: 1440, height: 1000 })
    }
    if (id === 9) {
      await dialog.getByRole('button', { name: '卡片', exact: true }).click()
      await dialog.getByText('暂无匹配结果', { exact: true }).waitFor()
      await screenshot(page, 'matching-empty')
      await dialog.getByRole('button', { name: '表格', exact: true }).click()
    }
    checks.push({ name, total: fixtures[id].total, status: 'PASS' })
    await dialog.locator('.el-dialog__headerbtn').click()
    await dialog.waitFor({ state: 'hidden' })
  }
  const row = page.locator('.el-table__body-wrapper tr').filter({ hasText: 'FT1016182629ee3-A' })
  await row.getByRole('button', { name: '修改需求', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '修改需求', exact: true })
  await edit.waitFor()
  assert.equal(await edit.locator('textarea').first().inputValue(), fixtures[7].requirement.otherRequire)
  await page.waitForFunction(() => [...document.querySelectorAll('.el-dialog .el-cascader input')].some(e => e.value.includes('深圳市')))
  await screenshot(page, 'matching-saved-requirement')
  await edit.getByRole('button', { name: '取消', exact: true }).click()
  await context.close()
  ;({ context, page } = await session(false))
  assert.equal(await page.getByRole('button', { name: '查询匹配', exact: true }).count(), 0)
  await context.close()
  assert.deepEqual(errors, [], 'Browser errors or unexpected API calls')
  await writeFile(path.join(evidence, 'matching-ui-result.json'), JSON.stringify({
    testType: 'UI_REPLAY_OF_REAL_DATABASE_RESULTS_NOT_LIVE_HTTP',
    checks, requestCount: requests.length,
    desktopMobileLayout: 'PASS', tableCardEmptyStates: 'PASS',
    savedRequirementText: 'PASS', savedRegionDisplay: 'PASS',
    permissionVisibility: 'PASS', errors
  }, null, 2), { flag: 'wx' })
  console.log('PASS: 10 archived one-way scenarios, table/card/empty, desktop/mobile, region hydration, permissions; API replay only.')
} finally {
  await browser.close()
}
