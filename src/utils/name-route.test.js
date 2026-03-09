import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeRouteNameParam, toNamePath } from './name-route.js'

test('normalizeRouteNameParam preserves a valid .rsk name', () => {
  assert.deepEqual(normalizeRouteNameParam('happy.rsk'), {
    isValid: true,
    canonicalName: 'happy.rsk',
  })
})

test('normalizeRouteNameParam appends .rsk to a bare label', () => {
  assert.deepEqual(normalizeRouteNameParam('Happy'), {
    isValid: true,
    canonicalName: 'happy.rsk',
  })
})

test('normalizeRouteNameParam rejects invalid names', () => {
  assert.deepEqual(normalizeRouteNameParam('happy!'), {
    isValid: false,
    canonicalName: null,
  })
})

test('normalizeRouteNameParam rejects empty input', () => {
  assert.deepEqual(normalizeRouteNameParam('   '), {
    isValid: false,
    canonicalName: null,
  })
})

test('toNamePath returns the canonical path for a name', () => {
  assert.equal(toNamePath('happy.rsk'), '/happy.rsk')
})
