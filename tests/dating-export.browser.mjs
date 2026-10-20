// UI requests are mocked; backend authorization and ZIP contents have separate tests.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname))
const output = process.env.DATING_EXPORT_EVIDENCE
  || fileURLToPath(new URL('../node_modules/.cache/dating-export/', import.meta.url))
assert.ok(process.env.DATING_EXPORT_XLSX && process.env.DATING_EXPORT_ZIP, 'Synthetic download fixtures required')
const xlsx = await readFile(process.env.DATING_EXPORT_XLSX)
const zip = await readFile(process.env.DATING_EXPORT_ZIP)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
const checks = []
const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const menus = [{
  path: '/system', component: 'Layout', name: 'System', meta: { title: '系统管理' },
  children: [{ path: 'payingUsers', name: 'PayingUsers', component: 'system/payingUsers/index',
    meta: { title: '客户档案' } }]
}]
const estimate = {
  userCount: 2, photoCount: 18, unavailablePhotoCount: 0, legacyPhotoCount: 0,
  imageBytes: 68 * 1024 * 1024, partCount: 2, fileType: 'zip',
  maxPartImageBytes: 64 * 1024 * 1024, maxTotalImageBytes: 512 * 1024 * 1024, maxUsersPerPart: 1000
}

async function session(canExport = true, mobile = false) {
  const state = { estimates: [], exports: [], estimate: { ...estimate }, failEstimate: false,
    failDownload: false, format: 'zip', delay: 0, downloads: [] }
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
  })
  await context.addCookies([{ name: 'Admin-Token', value: 'mock-export-ui-only', url: baseURL }])
  await context.route('**/dev-api/**', async route => {
    const request = route.request()
    const endpoint = new URL(request.url()).pathname.replace('/dev-api', '')
    const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
    if (endpoint === '/getInfo') return reply({
      user: { userId: 10, userName: 'export-test', nickName: '导出测试' }, roles: ['test'],
      permissions: ['system:payingUsers:list', ...(canExport ? ['system:payingUsers:export'] : [])]
    })
    if (endpoint === '/getRouters') return reply({ data: menus })
    if (endpoint === '/system/payingUsers/list') return reply({
      rows: [{ id: 1, name: '导出测试客户', sex: '0', status: '0', serviceStatus: 'SERVING' }], total: 1
    })
    if (endpoint === '/system/payingUsers/export/estimate' || endpoint === '/system/payingUsers/export') {
      assert.equal(request.method(), 'POST')
      assert.ok(request.headers()['content-type'].startsWith('application/x-www-form-urlencoded'))
      assert.equal(request.headers().authorization, 'Bearer mock-export-ui-only')
      const data = Object.fromEntries(new URLSearchParams(request.postData()))
      assert.equal(data.pageNum, undefined)
      assert.equal(data.pageSize, undefined)
      if (endpoint.endsWith('/estimate')) {
        state.estimates.push(data)
        if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay))
        if (state.failEstimate) return route.fulfill({ json: { code: 500, msg: '本次照片总量超过512MB' } })
        return reply({ data: state.estimate })
      }
      state.exports.push(data)
      if (state.failDownload) return route.fulfill({ json: { code: 500, msg: '已有用户数据正在导出，请稍后重试' } })
      return route.fulfill({ contentType: state.format === 'zip' ? 'application/zip' : xlsxType,
        body: state.format === 'zip' ? zip : xlsx })
    }
    if (endpoint === '/system/region/list') return reply({ data: [] })
    if (endpoint.startsWith('/system/dict/data/type/')) return reply({ data: [] })
    if (endpoint === '/system/config/configKey/sys.user.initPassword') return reply({ msg: 'TEST_ONLY' })
    if (endpoint === '/system/notice/listTop') return reply({ rows: [], total: 0 })
    errors.push(`${request.method()} ${endpoint}`)
    return route.fulfill({ status: 400, json: { code: 400 } })
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  page.on('download', download => state.downloads.push(download))
  await page.goto(`${baseURL}/system/payingUsers`)
  await page.getByText('导出测试客户', { exact: true }).waitFor()
  return { page, context, state }
}

async function preview(page) {
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await page.getByRole('button', { name: '开始导出', exact: true }).waitFor()
}
async function ready(page) {
  await page.waitForFunction(() => !document.querySelector('.el-loading-mask')
    && ![...document.querySelectorAll('button')].some(button =>
      button.textContent.trim() === '导出' && button.classList.contains('is-loading')))
}
async function screenshot(page, name) {
  const box = page.locator('.el-message-box')
  const bounds = await box.boundingBox()
  const viewport = page.viewportSize()
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1)
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1)
  assert.equal(await box.evaluate(element => element.scrollWidth > element.clientWidth + 1), false)
  await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' })
}

try {
  const { page, context, state } = await session()
  state.delay = 200
  await page.getByPlaceholder('请输入用户名称').fill('导出筛选')
  const button = page.getByRole('button', { name: '导出', exact: true })
  await button.dispatchEvent('click')
  await button.dispatchEvent('click')
  await page.getByRole('button', { name: '开始导出', exact: true }).waitFor()
  assert.equal(state.estimates.length, 1)
  assert.equal(state.estimates[0].name, '导出筛选')
  assert.equal(state.exports.length, 0)
  await screenshot(page, 'estimate-desktop')
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await ready(page)
  assert.equal(state.exports.length, 0)
  checks.push('estimate, filters, duplicate prevention and cancellation')

  state.delay = 0
  // Re-evaluation on the backend can change file type between preview and download.
  state.estimate = { ...estimate, partCount: 1, fileType: 'xlsx', imageBytes: 1000 }
  await preview(page)
  const zipDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '开始导出', exact: true }).click()
  const downloadedZip = await zipDownload
  assert.match(downloadedZip.suggestedFilename(), /\.zip$/)
  await downloadedZip.saveAs(path.join(output, 'downloaded-parts.zip'))
  assert.deepEqual(await readFile(path.join(output, 'downloaded-parts.zip')), zip)
  assert.deepEqual(state.exports[0], state.estimates.at(-1))
  await ready(page)
  checks.push('actual ZIP type, binary bytes and stable export filters')

  state.format = 'xlsx'
  await preview(page)
  const xlsxDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '开始导出', exact: true }).click()
  const downloadedXlsx = await xlsxDownload
  assert.match(downloadedXlsx.suggestedFilename(), /\.xlsx$/)
  await downloadedXlsx.saveAs(path.join(output, 'downloaded-users.xlsx'))
  assert.deepEqual(await readFile(path.join(output, 'downloaded-users.xlsx')), xlsx)
  await ready(page)
  checks.push('single-workbook download')

  state.failDownload = true
  await preview(page)
  await page.getByRole('button', { name: '开始导出', exact: true }).click()
  await page.getByText('已有用户数据正在导出，请稍后重试', { exact: true }).waitFor()
  await ready(page)
  assert.equal(state.downloads.length, 2)
  state.failEstimate = true
  await button.click()
  await page.getByText('本次照片总量超过512MB', { exact: true }).waitFor()
  await ready(page)
  assert.equal(state.exports.length, 3)
  checks.push('business errors do not become downloaded files; controls recover')
  await context.close()

  const mobile = await session(true, true)
  mobile.state.estimate.unavailablePhotoCount = 3
  mobile.state.estimate.legacyPhotoCount = 2
  await preview(mobile.page)
  await mobile.page.getByText('缺失或无效照片：3 张；未迁移历史照片：2 张', { exact: true }).waitFor()
  await screenshot(mobile.page, 'estimate-mobile')
  await mobile.page.evaluate(() => document.documentElement.classList.add('dark'))
  await screenshot(mobile.page, 'estimate-mobile-dark')
  await mobile.context.close()
  checks.push('mobile, dark theme and unavailable-photo warning')

  const forbidden = await session(false)
  assert.equal(await forbidden.page.getByRole('button', { name: '导出', exact: true }).count(), 0)
  assert.equal(forbidden.state.estimates.length, 0)
  await forbidden.context.close()
  checks.push('export action hidden without permission')
  assert.deepEqual(errors, [])
  await writeFile(path.join(output, 'browser-summary.json'), JSON.stringify({ checks, errors }, null, 2))
  console.log(JSON.stringify({ passed: checks.length, checks, errors }, null, 2))
} finally {
  await browser.close()
}
