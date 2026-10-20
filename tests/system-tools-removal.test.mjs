import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

test('retired tool pages, APIs, utilities and website components are removed', () => {
  for (const path of ['src/views/tool', 'src/api/tool', 'src/utils/generator', 'src/components/RuoYi']) {
    assert.equal(existsSync(new URL(path, root)), false, path)
  }
  assert.doesNotMatch(read('src/router/index.js'), /\/tool\/|views\/tool|tool:gen/)
  assert.doesNotMatch(read('src/layout/components/Navbar.vue'), /RuoYiGit|RuoYiDoc|ruo-yi-git|ruo-yi-doc/)
})

test('remove tool-only dependencies while preserving shared business dependencies', () => {
  const { dependencies } = JSON.parse(read('package.json'))
  for (const name of ['clipboard', 'js-beautify', 'vuedraggable']) {
    assert.equal(dependencies[name], undefined)
  }
  for (const name of ['file-saver', '@vueup/vue-quill', 'element-plus', 'vue-router', 'sortablejs']) {
    assert.ok(dependencies[name], name)
  }
})
