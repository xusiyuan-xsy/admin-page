// UI fixtures only; real authorization and file validation are covered by Java HTTP tests.
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1:5174'
const output = fileURLToPath(new URL('../node_modules/.cache/dating-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const token = 'mock-photo-test-only'
const photo = id => `/dating/archives/${id}/photos/${'a'.repeat(32)}.png`
const second = `/dating/archives/1/photos/${'b'.repeat(32)}.png`
const errors = [], requests = [], unexpected = []
let saved, failedPhoto = false, uploads = 0
const user = { id: 1, name: '测试客户', phone: '13800000001', sex: '0', birthYear: 1996,
  height: 170, weight: 60, currentCity: '北京市/北京市', hometown: '北京市/北京市',
  hasHouse: '0', hasCar: '0', hasTattoo: '0', smokeHabit: '0', drinkHabit: '0',
  acceptLongDist: '1', photos: [photo(1)], legacyPhotoCount: 1, status: '0', requirement: {} }
await context.addCookies([{ name: 'Admin-Token', value: token, url: baseURL }])
await context.addInitScript(() => {
  const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
  window.photoObjectUrls = new Set()
  URL.createObjectURL = blob => { const url = create(blob); window.photoObjectUrls.add(url); return url }
  URL.revokeObjectURL = url => { window.photoObjectUrls.delete(url); revoke(url) }
})
const page = await context.newPage()
page.on('pageerror', error => errors.push(error.message))
const png = Buffer.from(await page.evaluate(() => {
  const canvas = document.createElement('canvas')
  canvas.width = 80; canvas.height = 60
  const c = canvas.getContext('2d')
  c.fillStyle = '#258c6a'; c.fillRect(0, 0, 40, 60)
  c.fillStyle = '#cc4455'; c.fillRect(40, 0, 40, 60)
  return canvas.toDataURL('image/png').split(',')[1]
}), 'base64')
await context.route('**/dev-api/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname.replace('/dev-api', '')
  const reply = data => route.fulfill({ json: { code: 200, msg: '操作成功', ...data } })
  if (path === '/getInfo') return reply({ user: { userId: 10, userName: 'alice', nickName: '测试红娘' },
    roles: ['matchmaker'], permissions: ['system:payingUsers:list', 'system:payingUsers:query',
      'system:payingUsers:edit', 'system:payingUsers:add', 'system:payingRequirement:search'] })
  if (path === '/getRouters') return reply({ data: [{
    path: '/system', component: 'Layout', name: 'System', meta: { title: '系统管理' },
    children: [{ path: 'payingUser', name: 'PayingUser', component: 'system/payingUsers/index', meta: { title: '客户档案' } }]
  }] })
  if (path.startsWith('/dating/archives/')) {
    assert.equal(req.headers().authorization, `Bearer ${token}`)
    assert.equal(new URL(req.url()).search, '')
    requests.push(path)
    if (req.method() === 'POST') { uploads++; return reply({ url: second, fileName: second }) }
    if (failedPhoto) return route.fulfill({ json: { code: 403, msg: '无权访问' } })
    return route.fulfill({ body: png, contentType: 'image/png', headers: { 'Cache-Control': 'no-store' } })
  }
  if (path === '/oss/upload') { unexpected.push(path); return reply({}) }
  if (path === '/system/payingUsers/list') return reply({ rows: [user], total: 1 })
  if (path === '/system/payingUsers/1') return reply({ data: user })
  if (path === '/system/payingUsers' && req.method() === 'PUT') {
    saved = req.postDataJSON(); user.photos = saved.photos; return reply({})
  }
  if (path === '/system/payingRequirement/search') return reply({ rows: [{
    id: 2, name: '测试候选', photos: [photo(2), 'https://private.example.test/legacy.png'], sex: '1'
  }], total: 1 })
  if (path === '/system/dict/data/type/sys_user_sex') return reply({ data: [
    { dictValue: '0', dictLabel: '男' }, { dictValue: '1', dictLabel: '女' }
  ] })
  if (path === '/system/dict/data/type/sys_normal_disable') return reply({ data: [
    { dictValue: '0', dictLabel: '正常' }
  ] })
  return reply({ data: [], rows: [], total: 0 })
})
await context.route('https://private.example.test/**', route => { unexpected.push(route.request().url()); return route.abort() })
await context.route('**/dating/archives/**', route => {
  if (new URL(route.request().url()).pathname.startsWith('/dev-api/')) return route.fallback()
  unexpected.push(route.request().url())
  return route.abort()
})

async function screenshot(name) {
  await page.screenshot({ path: output + name + '.png', fullPage: true, animations: 'disabled' })
  const bounds = await page.locator('.el-dialog:visible').evaluateAll(nodes =>
    nodes.map(node => { const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, viewport: innerWidth } }))
  for (const b of bounds) assert.ok(b.left >= 0 && b.right <= b.viewport + 1, `${name}: dialog overflow`)
}
async function waitImages(selector, count) {
  await page.waitForFunction(({ selector, count }) => {
    const images = [...document.querySelectorAll(selector)]
    return images.length === count && images.every(img => img.src.startsWith('blob:') && img.naturalWidth === 80)
  }, { selector, count })
}
try {
  await page.goto(`${baseURL}/system/payingUser`)
  await page.getByText('测试客户', { exact: true }).waitFor()
  await page.getByRole('button', { name: '修改', exact: true }).last().click()
  const editor = page.getByRole('dialog', { name: '修改用户', exact: true })
  const thumbnails = '.el-upload-list__item-thumbnail'
  await waitImages(thumbnails, 1)
  await editor.getByText('1张历史公开照片待安全迁移').waitFor()
  await editor.locator('input[type=file]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png })
  await waitImages(thumbnails, 2)
  assert.equal(uploads, 1)
  await editor.locator('.el-upload-list__item').first().hover()
  await editor.locator('.el-upload-list__item-preview').first().click()
  const preview = page.getByRole('dialog', { name: '预览', exact: true })
  await preview.waitFor()
  await screenshot('desktop-private-photo-preview')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot('mobile-private-photo-preview')
  await preview.locator('.el-dialog__headerbtn').click()
  await preview.waitFor({ state: 'hidden' })
  await editor.locator('.component-upload-image').scrollIntoViewIfNeeded()
  await screenshot('mobile-private-photo-editor')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await editor.locator('.el-upload-list__item').first().hover()
  await editor.locator('.el-upload-list__item-delete').first().click()
  await waitImages(thumbnails, 1)
  await editor.getByRole('button', { name: /^确\s*定$/ }).click()
  await editor.waitFor({ state: 'hidden' })
  assert.deepEqual(saved.photos, [second])
  await page.waitForFunction(() => window.photoObjectUrls.size === 0)

  await page.getByRole('button', { name: '查询匹配', exact: true }).click()
  await page.getByRole('button', { name: '卡片', exact: true }).click()
  await waitImages('.user-card__avatar-img img', 1)
  await screenshot('desktop-private-photo-matching')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '收起', exact: true }).click()
  await page.locator('.user-card__avatar-img').scrollIntoViewIfNeeded()
  await screenshot('mobile-private-photo-matching')
  await page.getByRole('dialog', { name: '查询匹配' }).locator('.el-dialog__headerbtn').click()
  await page.waitForFunction(() => window.photoObjectUrls.size === 0)

  failedPhoto = true
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '修改', exact: true }).last().click()
  await editor.getByText('照片加载失败，当前不可修改照片').waitFor()
  assert.equal(await editor.locator('.el-upload.is-disabled').count(), 1)
  await editor.getByRole('button', { name: /^取\s*消$/ }).click()
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const fresh = page.getByRole('dialog', { name: '添加用户', exact: true })
  await page.getByText('档案尚未保存', { exact: true }).waitFor()
  assert.equal(await fresh.locator('input[type=file]').count(), 0)
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  assert.ok(requests.includes(photo(1)) && requests.includes(photo(2)))
  console.log('PASS: private headers, upload/save/remove, preview, matching, failure state, object URL cleanup, desktop/mobile; mock API only')
} catch (error) {
  await page.screenshot({ path: output + 'private-photo-failure.png', fullPage: true })
  console.error('Browser errors:', errors)
  throw error
} finally { await browser.close() }
