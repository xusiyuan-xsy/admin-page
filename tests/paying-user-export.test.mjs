import test from 'node:test'
import assert from 'node:assert/strict'
import { formatExportBytes, payingUserExportExtension } from '../src/utils/payingUserExport.js'

test('formats image byte estimates without claiming final download sizes', () => {
  assert.equal(formatExportBytes(0), '0 B')
  assert.equal(formatExportBytes(1024), '1.0 KB')
  assert.equal(formatExportBytes(64 * 1024 * 1024), '64.0 MB')
  assert.equal(formatExportBytes(NaN), '-')
})

test('uses actual response type instead of estimated file type', async () => {
  const signature = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  assert.equal(await payingUserExportExtension(new Blob([signature], { type: 'application/zip' })), 'zip')
  assert.equal(await payingUserExportExtension(new Blob([signature], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })), 'xlsx')
})

test('does not save business errors, HTML errors or empty downloads as spreadsheets', async () => {
  await assert.rejects(payingUserExportExtension(new Blob([JSON.stringify({ code: 500, msg: '已有导出任务' })],
    { type: 'application/json;charset=UTF-8' })), /已有导出任务/)
  await assert.rejects(payingUserExportExtension(new Blob(['{bad'], { type: 'application/json' })), /响应异常/)
  await assert.rejects(payingUserExportExtension(new Blob(['<html>Bad gateway</html>'],
    { type: 'text/html' })), /格式异常/)
  await assert.rejects(payingUserExportExtension(new Blob([], { type: 'application/zip' })), /格式异常/)
})
