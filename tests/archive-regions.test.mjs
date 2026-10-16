import assert from 'node:assert/strict'
import test from 'node:test'
import { hydrateArchiveRegions } from '../src/utils/archiveRegions.js'

const tree = {
  '': [{ code: '440000', name: 'Province' }],
  '440000': [{ code: '440300', name: 'City' }],
  '440300': [{ code: '440305', name: 'District' }]
}
test('hydrates persisted names and shares requests for identical regions', async () => {
  const calls = []
  const archive = { currentCity: 'Province/City/District', hometown: 'Province/City/District', name: 'Test' }
  const result = await hydrateArchiveRegions(archive, async parent => {
    calls.push(parent)
    return tree[parent]
  })
  assert.equal(result.currentCityCode, '440000,440300,440305')
  assert.equal(result.hometownCode, result.currentCityCode)
  assert.deepEqual(calls, ['', '440000', '440300'])
  assert.equal(result.currentCity, archive.currentCity)
  assert.equal(archive.currentCityCode, undefined)
})
test('keeps supplied codes and empty optional values without requests', async () => {
  const result = await hydrateArchiveRegions({ currentCityCode: '440000', currentCity: 'Province', hometown: '' },
    () => { throw Error('Unexpected request') })
  assert.equal(result.currentCityCode, '440000')
  assert.equal(result.hometownCode, '')
})
test('unknown names never resolve to a partial or arbitrary path', async () => {
  const result = await hydrateArchiveRegions({ currentCity: 'Province/Unknown' }, async parent => tree[parent])
  assert.equal(result.currentCityCode, '')
  assert.equal(result.currentCity, 'Province/Unknown')
})
test('ambiguous names require manual selection', async () => {
  const result = await hydrateArchiveRegions({ hometown: 'Province' },
    async () => [{ code: '1', name: 'Province' }, { code: '2', name: 'Province' }])
  assert.equal(result.hometownCode, '')
})
test('network errors propagate without changing archive values', async () => {
  const archive = { currentCity: 'Province/City' }
  await assert.rejects(hydrateArchiveRegions(archive, async () => { throw Error('Offline') }), /Offline/)
  assert.deepEqual(archive, { currentCity: 'Province/City' })
})
