// UI-only fixture routes; these tests never write to the business database.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
const output = process.env.DATING_CONFIG_EVIDENCE ||
  fileURLToPath(new URL('../node_modules/.cache/matchmaker-config/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = [], checks = []
const fields = {
  ageMin: '最早出生年份', ageMax: '最晚出生年份', heightMin: '最低身高', heightMax: '最高身高',
  smokeHabit: '吸烟要求', drinkHabit: '饮酒要求', noTattoo: '是否要求无纹身',
  hasHouse: '是否要求有房', hasCar: '是否要求有车', education: '学历', hometownRequire: '家乡要求',
  acceptLongDist: '是否接受异地', cityRequire: '现居城市要求', otherRequire: '其他要求', remark: '备注'
}
const sample = { configId: 1, name: '标准婚恋服务', watermarkText: '仅限婚恋服务使用', minAge: 1988,
  maxAge: 2004, minHeight: 155, maxHeight: 185, requiredFields: ['remark'], defaultConfig: true, version: 1 }
const menus = [
  { path: '/dating', component: 'Layout', name: 'Dating', meta: { title: '婚恋服务' },
    children: [
      { path: 'payingUsers', name: 'PayingUsers', component: 'system/payingUsers/index', meta: { title: '用户' } },
      { path: 'matchmakerConfig', name: 'DatingMatchmakerConfig', component: 'dating/matchmakerConfig/index', meta: { title: '红娘功能配置' } }
    ] }
]

async function session({ mobile = false, manage = true, requirement = null } = {}) {
  const state = { configs: [], writes: [], requirement, configError: false, requirementWrites: [] }
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-config-ui-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const req = route.request()
    const url = new URL(req.url())
    const endpoint = url.pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    const active = () => state.configs.find(c => c.defaultConfig) ?? null
    if (endpoint === '/getInfo') return reply({ user: { userId: 10, userName: 'fixture', nickName: '配置测试' },
      roles: ['test'], permissions: ['dating:matchmakerConfig:list', 'system:payingUsers:list',
        'system:payingRequirement:add', 'system:payingRequirement:edit', 'system:payingRequirement:query',
        ...(manage ? ['dating:matchmakerConfig:add', 'dating:matchmakerConfig:edit',
          'dating:matchmakerConfig:default', 'dating:matchmakerConfig:remove'] : [])] })
    if (endpoint === '/getRouters') return reply({ data: menus })
    if (endpoint === '/dating/matchmaker-configs/active') {
      if (state.configError) return route.fulfill({ json: { code: 500, msg: '配置暂不可用' } })
      return reply({ data: { config: active(), fields, currentYear: 2026 } })
    }
    if (endpoint === '/dating/matchmaker-configs') {
      if (req.method() === 'GET') {
        const rows = state.configs.filter(c => c.name.includes(url.searchParams.get('name') || ''))
        return reply({ rows, total: rows.length })
      }
      const data = req.postDataJSON()
      state.writes.push({ method: 'POST', data })
      const config = { ...data, configId: state.configs.length + 1, version: 1, defaultConfig: !state.configs.length }
      state.configs.push(config)
      return reply({ data: config })
    }
    if (endpoint.match(/^\/dating\/matchmaker-configs\/\d+\/default$/)) {
      const data = req.postDataJSON()
      const id = Number(endpoint.split('/')[3])
      state.writes.push({ method: 'DEFAULT', data })
      assert.equal(data.expectedDefaultId, active()?.configId ?? null)
      state.configs.forEach(c => { c.defaultConfig = c.configId === id })
      return reply({})
    }
    if (endpoint.match(/^\/dating\/matchmaker-configs\/\d+$/)) {
      const id = Number(endpoint.split('/').at(-1))
      if (req.method() === 'DELETE') state.configs = state.configs.filter(c => c.configId !== id)
      else {
        const data = req.postDataJSON()
        const c = state.configs.find(c => c.configId === id)
        Object.assign(c, data, { version: c.version + 1 })
      }
      state.writes.push({ method: req.method() })
      return reply({ data: state.configs.find(c => c.configId === id) })
    }
    if (endpoint === '/system/payingUsers/list') return reply({
      rows: [{ id: 1, name: '配置测试客户', status: '0', sex: '0', requirement: state.requirement }], total: 1
    })
    if (endpoint === '/system/payingRequirement/1') return reply({ data: state.requirement })
    if (endpoint === '/system/payingRequirement') {
      state.requirementWrites.push(req.postDataJSON())
      return reply({})
    }
    if (endpoint.startsWith('/system/dict/data/type/')) return reply({ data: [] })
    if (endpoint === '/system/region/list') return reply({ data: [] })
    if (endpoint === '/system/config/configKey/sys.user.initPassword') return reply({ msg: 'TEST_ONLY' })
    if (endpoint === '/system/notice/listTop') return reply({ rows: [], total: 0 })
    errors.push(`${req.method()} ${endpoint}`)
    return route.fulfill({ status: 400, json: { code: 400 } })
  })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  return { context, page, state }
}
async function openConfig(page) {
  await page.goto(`${baseURL}/dating/matchmakerConfig`)
  try { await page.getByRole('button', { name: '查询', exact: true }).waitFor({ timeout: 10000 }) }
  catch (error) {
    await page.screenshot({ path: path.join(output, 'load-error.png'), fullPage: true })
    console.log({ url: page.url(), errors, body: await page.locator('body').innerText() })
    throw error
  }
  await page.waitForFunction(() => !document.querySelector('.el-loading-mask'))
}
async function openRequirement(page, edit = false) {
  await page.goto(`${baseURL}/dating/payingUsers`)
  await page.locator('.app-breadcrumb').getByText('婚恋服务', { exact: true }).waitFor()
  await page.getByRole('button', { name: edit ? '修改需求' : '新增需求', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('.el-dialog__footer button')]
    .some(button => button.textContent.trim() === '确定' && !button.disabled))
  return page.getByRole('dialog')
}
async function screenshot(page, name) {
  const dialog = page.getByRole('dialog')
  const bounds = await dialog.boundingBox()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= page.viewportSize().width + 1)
  assert.equal(await dialog.evaluate(el => el.scrollWidth > el.clientWidth + 1), false)
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled' })
}
try {
  const { page, state, context } = await session()
  await openConfig(page)
  await page.getByRole('button', { name: '新增配置', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('配置名称').fill('标准婚恋服务')
  await dialog.getByLabel('图片水印文字').fill('仅限婚恋服务使用')
  await dialog.getByRole('spinbutton').nth(0).fill('1988')
  await dialog.getByRole('spinbutton').nth(1).fill('2004')
  await dialog.getByRole('spinbutton').nth(2).fill('155')
  await dialog.getByRole('spinbutton').nth(3).fill('185')
  await dialog.locator('.el-checkbox').filter({ hasText: /^备注$/ }).click()
  assert.equal(await dialog.getByRole('checkbox', { name: '备注', exact: true }).isChecked(), true)
  await page.waitForFunction(() => !document.querySelector('.config-form .el-form-item__error'))
  await screenshot(page, 'config-desktop')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(state.configs.length, 1)
  assert.equal(state.configs[0].defaultConfig, true)
  assert.deepEqual(state.configs[0].requiredFields, ['remark'])
  assert.equal(state.configs[0].minAge, 1988)
  assert.equal(state.configs[0].maxAge, 2004)
  checks.push('first config automatic default; all settings saved')

  await page.getByRole('button', { name: '新增配置', exact: true }).click()
  await dialog.getByLabel('配置名称').fill('备用配置')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await dialog.waitFor({ state: 'hidden' })
  assert.equal(state.configs[1].defaultConfig, false)
  await page.getByRole('button', { name: '设为默认', exact: true }).nth(1).click()
  await page.getByText('已有默认配置“标准婚恋服务”，是否替换为“备用配置”？', { exact: true }).waitFor()
  await page.locator('.el-message-box').getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(state.writes.filter(w => w.method === 'DEFAULT').length, 0)
  await page.getByRole('button', { name: '设为默认', exact: true }).nth(1).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定', exact: true }).click()
  await page.getByText('默认配置已更新', { exact: true }).waitFor()
  assert.equal(state.configs[1].defaultConfig, true)
  checks.push('new config stays inactive; replacement confirmation and cancellation')

  state.configs = [{ ...sample }]
  const needs = await openRequirement(page)
  assert.deepEqual(await needs.getByRole('spinbutton').evaluateAll(els => els.map(e => e.value)), ['1988', '2004', '155', '185'])
  await needs.getByRole('button', { name: '确定', exact: true }).click()
  await needs.getByText('请填写备注', { exact: true }).waitFor()
  assert.equal(state.requirementWrites.length, 0)
  await needs.getByPlaceholder('输入备注').fill('需求已确认')
  await needs.getByPlaceholder('输入备注').blur()
  await screenshot(page, 'requirements-desktop')
  await needs.getByRole('button', { name: '确定', exact: true }).click()
  await needs.waitFor({ state: 'hidden' })
  assert.equal(state.requirementWrites[0].ageMin, 1988)
  assert.equal(state.requirementWrites[0].remark, '需求已确认')
  checks.push('configured defaults and required validation before save')
  await context.close()

  const old = await session({ requirement: { id: 1, payingId: 1, ageMin: 1970, ageMax: 2000, heightMin: 140, heightMax: 170, remark: '已有备注' } })
  old.state.configs = [{ ...sample }]
  const existing = await openRequirement(old.page, true)
  assert.equal(await existing.getByRole('spinbutton').nth(0).inputValue(), '1970')
  assert.equal(await existing.getByRole('spinbutton').nth(2).inputValue(), '140')
  await existing.getByRole('button', { name: '确定', exact: true }).click()
  await existing.getByText('出生年份须在1988-2004内', { exact: true }).waitFor()
  assert.equal(old.state.requirementWrites.length, 0)
  checks.push('existing out-of-range needs remain unchanged and block submission')
  await old.context.close()

  const validation = await session({ requirement: {
    id: 1, payingId: 1, ageMin: 1985, ageMax: 1995, heightMin: 140, heightMax: 260,
    acceptLongDist: '1'
  } })
  validation.state.configs = [{ ...sample, minAge: 1998, maxAge: 2005,
    requiredFields: Object.keys(fields) }]
  const validationDialog = await openRequirement(validation.page, true)
  await validationDialog.getByRole('button', { name: '确定', exact: true }).click()
  await validationDialog.getByText('出生年份须在1998-2005内', { exact: true }).first().waitFor()
  for (const width of [1440, 800, 390, 320]) {
    await validation.page.setViewportSize({ width, height: 1000 })
    for (const dark of [false, true]) {
      await validation.page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
      await screenshot(validation.page, `requirements-errors-${width}-${dark ? 'dark' : 'light'}`)
      const layout = await validationDialog.evaluate(dialog => {
        const errors = [...dialog.querySelectorAll('.el-form-item__error')]
        const controls = [...dialog.querySelectorAll('.el-input-number, .el-select, .el-cascader, .el-textarea')]
        const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 &&
          a.top < b.bottom - 1 && a.bottom > b.top + 1
        return {
          errors: errors.length,
          contained: errors.every(error => {
            const bounds = error.getBoundingClientRect()
            const parent = error.closest('.el-form-item').getBoundingClientRect()
            return bounds.bottom <= parent.bottom + 1 && bounds.left >= parent.left - 1 &&
              bounds.right <= parent.right + 1 && error.scrollWidth <= error.clientWidth + 1
          }),
          overlaps: errors.some(error => controls.some(control =>
            overlaps(error.getBoundingClientRect(), control.getBoundingClientRect())))
        }
      })
      assert.ok(layout.errors >= 4)
      assert.equal(layout.contained, true, `error containment: ${width}, dark=${dark}`)
      assert.equal(layout.overlaps, false, `error/control overlap: ${width}, dark=${dark}`)
    }
  }
  assert.equal(validation.state.requirementWrites.length, 0)
  assert.deepEqual(await validationDialog.getByRole('spinbutton').evaluateAll(els => els.map(e => e.value)),
    ['1985', '1995', '140', '260'])
  await validation.context.close()
  checks.push('validation errors stay in flow without overlap at 1440/800/390/320px in light/dark themes')

  const noConfig = await session()
  const unrestricted = await openRequirement(noConfig.page)
  assert.deepEqual(await unrestricted.getByRole('spinbutton').evaluateAll(els => els.map(e => e.value)), ['', '', '', ''])
  await unrestricted.getByRole('button', { name: '确定', exact: true }).click()
  await unrestricted.waitFor({ state: 'hidden' })
  assert.equal(noConfig.state.requirementWrites.length, 1)
  noConfig.state.configError = true
  await noConfig.page.getByRole('button', { name: '新增需求', exact: true }).click()
  await noConfig.page.getByText('红娘功能配置加载失败，暂不能保存需求', { exact: true }).waitFor()
  assert.equal(await noConfig.page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).isDisabled(), true)
  checks.push('no-config fallback and fail-closed configuration load errors')
  await noConfig.context.close()

  const mobile = await session({ mobile: true })
  mobile.state.configs = [{ ...sample }]
  await openConfig(mobile.page)
  await mobile.page.getByRole('button', { name: '新增配置', exact: true }).click()
  await screenshot(mobile.page, 'config-mobile')
  await mobile.page.evaluate(() => document.documentElement.classList.add('dark'))
  await screenshot(mobile.page, 'config-mobile-dark')
  await mobile.page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }).scrollIntoViewIfNeeded()
  await mobile.page.screenshot({ path: path.join(output, 'config-mobile-dark-footer.png'), animations: 'disabled' })
  await mobile.page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await openRequirement(mobile.page)
  await mobile.page.evaluate(() => document.documentElement.classList.add('dark'))
  await screenshot(mobile.page, 'requirements-mobile-dark')
  await mobile.page.getByRole('dialog').getByRole('button', { name: '确定', exact: true }).click()
  await mobile.page.getByText('请填写备注', { exact: true }).waitFor()
  assert.equal(mobile.state.requirementWrites.length, 0)
  await mobile.page.screenshot({ path: path.join(output, 'requirements-mobile-dark-footer.png'), animations: 'disabled' })
  await mobile.context.close()
  checks.push('desktop/mobile/light/dark dialogs fit horizontally')

  const readOnly = await session({ manage: false })
  readOnly.state.configs = [{ ...sample }]
  await openConfig(readOnly.page)
  assert.equal(await readOnly.page.getByRole('button', { name: '新增配置', exact: true }).count(), 0)
  assert.equal(await readOnly.page.getByRole('button', { name: '编辑配置', exact: true }).count(), 0)
  assert.equal(await readOnly.page.getByRole('button', { name: '设为默认', exact: true }).count(), 0)
  await readOnly.context.close()
  checks.push('read-only role cannot access management actions')
  assert.deepEqual(errors, [])
  await writeFile(path.join(output, 'browser-summary.json'), JSON.stringify({ checks, errors }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2))
} finally { await browser.close() }
