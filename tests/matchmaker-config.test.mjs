import test from 'node:test'
import assert from 'node:assert/strict'
import { requirementLimits, applyRequirementDefaults, requirementFieldError } from '../src/utils/matchmakerConfig.js'

test('no configuration preserves original limits and values', () => {
  assert.deepEqual(requirementLimits(null, 2026), { ageMin: 1900, ageMax: 2026, heightMin: 100, heightMax: 250 })
  const form = { ageMin: 1999 }
  assert.equal(applyRequirementDefaults(form, null, 2026), form)
  assert.equal(requirementFieldError('remark', '', form, null, 2026), '')
})
test('birth-year endpoints are used directly and remain unchanged at year rollover', () => {
  const config = { minAge: 1988, maxAge: 2004, minHeight: 155, maxHeight: 185 }
  assert.deepEqual(requirementLimits(config, 2026), { ageMin: 1988, ageMax: 2004, heightMin: 155, heightMax: 185 })
  assert.equal(requirementLimits(config, 2027).ageMin, 1988)
  assert.equal(requirementLimits(config, 2027).ageMax, 2004)
  assert.deepEqual(applyRequirementDefaults({}, config, 2026), { ageMin: 1988, ageMax: 2004, heightMin: 155, heightMax: 185 })
  assert.equal(applyRequirementDefaults({ ageMin: 1970 }, config, 2026).ageMin, 1970)
})
test('required fields distinguish zero from absent data and reject whitespace', () => {
  const config = { requiredFields: ['hasCar', 'remark', 'smokeHabit'] }
  assert.equal(requirementFieldError('hasCar', '0', {}, config, 2026), '')
  assert.ok(requirementFieldError('hasCar', null, {}, config, 2026))
  assert.ok(requirementFieldError('remark', ' ', {}, config, 2026))
  assert.ok(requirementFieldError('smokeHabit', '', {}, config, 2026))
})
test('configured bounds and conditional city requirement are enforced', () => {
  const config = { minAge: 1988, maxAge: 2004, minHeight: 155, maxHeight: 185 }
  for (const [field, value] of [['ageMin', 1987], ['ageMax', 2005], ['heightMin', 154], ['heightMax', 186]])
    assert.ok(requirementFieldError(field, value, {}, config, 2026))
  assert.equal(requirementFieldError('heightMax', 185, { heightMin: 155 }, config, 2026), '')
  assert.ok(requirementFieldError('heightMax', 160, { heightMin: 170, heightMax: 160 }, config, 2026))
  assert.ok(requirementFieldError('cityRequire', '', { acceptLongDist: '0' }, null, 2026))
  assert.equal(requirementFieldError('cityRequire', '', { acceptLongDist: '1' }, null, 2026), '')
  assert.ok(requirementFieldError('cityRequire', '', { acceptLongDist: '1' }, { requiredFields: ['cityRequire'] }, 2026))
})
