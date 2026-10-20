import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.DATING_UI_URL || 'http://127.0.0.1'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname))
const output = fileURLToPath(new URL('../node_modules/.cache/system-tools-removal/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    await context.addCookies([{ name: 'Admin-Token', value: 'retired-tools-ui-only', url: baseURL }])
    await context.route('**/dev-api/**', async route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/dev-api', '')
      const reply = data => route.fulfill({ json: { code: 200, ...data } })
      if (endpoint === '/getInfo') return reply({
        user: { userId: 1, userName: 'fixture', nickName: '验收账号' },
        roles: ['admin'], permissions: ['*:*:*']
      })
      if (endpoint === '/getRouters') return reply({ data: [
        { path: '/dating', name: 'Dating', component: 'Layout', meta: { title: '婚恋服务' }, children: [
          { path: 'matchmakerConfig', name: 'DatingMatchmakerConfig', component: 'dating/matchmakerConfig/index',
            meta: { title: '红娘功能配置' } }
        ] }
      ] })
      if (endpoint === '/dating/matchmaker-configs') return reply({ rows: [], total: 0 })
      if (endpoint === '/dating/matchmaker-configs/active') {
        return reply({ data: { config: null, fields: {}, currentYear: 2026 } })
      }
      if (endpoint === '/system/notice/listTop') return reply({ data: [], unreadCount: 0 })
      return reply({ data: [] })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${baseURL}/dating/matchmakerConfig`)
    await page.getByText('配置名称', { exact: true }).first().waitFor()
    assert.equal(await page.locator('#ruoyi-git, #ruoyi-doc').count(), 0)
    assert.equal(await page.getByText('系统工具', { exact: true }).count(), 0)
    assert.equal(await page.getByText('若依官网', { exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await page.screenshot({ path: `${output}/navigation-${width}.png`, fullPage: true })
    await page.goto(`${baseURL}/tool/gen-edit/index/1`)
    await page.getByText('返回首页', { exact: true }).waitFor()
    assert.equal(await page.locator('.wscn-http404-container').count(), 1)
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log('PASS: desktop/mobile navigation has no retired entries; removed route shows 404; no browser errors.')
} finally {
  await browser.close()
}
