import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = new URL(process.env.DATING_UI_URL || 'http://127.0.0.1:5174')
assert.ok(['http:', 'https:'].includes(baseURL.protocol))
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(baseURL.hostname))
assert.equal(baseURL.username, '')
assert.equal(baseURL.password, '')
const output = fileURLToPath(new URL('../node_modules/.cache/dating-ui/', import.meta.url))
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  headless: true
})
const errors = []
const writes = []
try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }
    })
    try {
      const page = await context.newPage()
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => {
        if (new URL(request.url()).pathname.startsWith('/dev-api/') &&
            !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
        }
      })
      // No cookies, fixtures or route interception: exercise the actual local proxy.
      const captchaResponse = page.waitForResponse(
        response => new URL(response.url()).pathname === '/dev-api/captchaImage'
      )
      await page.goto(new URL('/dating/entitlements', baseURL).href)
      await page.waitForURL(url => url.pathname === '/login')
      await page.locator('input[type="password"]').waitFor({ state: 'visible' })
      const response = await captchaResponse
      assert.equal(response.status(), 200)
      const captcha = await response.json()
      assert.equal(captcha.code, 200)
      assert.equal(typeof captcha.captchaEnabled, 'boolean')
      if (captcha.captchaEnabled) {
        assert.ok(captcha.uuid)
        await page.locator('.login-code-img').waitFor({ state: 'visible' })
        await page.waitForFunction(() => {
          const image = document.querySelector('.login-code-img')
          return image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0
        })
      }
      const protectedResponse = await context.request.get(
        new URL('/dev-api/dating/integrity-issues?pageNum=1&pageSize=1', baseURL).href
      )
      assert.equal((await protectedResponse.json()).code, 401)
      await page.screenshot({
        path: `${output}local-smoke-${viewport.name}-login.png`,
        fullPage: true
      })
      console.log(`${viewport.name}: real login page, captcha and anonymous guard passed`)
    } finally {
      await context.close()
    }
  }
  assert.deepEqual(errors, [], 'Browser runtime errors')
  assert.deepEqual(writes, [], 'The smoke test must not submit login or business writes')
  console.log('Authenticated roles and business workflows were not tested.')
} finally {
  await browser.close()
}
