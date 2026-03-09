import test from 'node:test'
import assert from 'node:assert/strict'

import { isPrimaryNameMatch } from './primaryName.js'

test('matches names case-insensitively', () => {
  assert.equal(isPrimaryNameMatch('Happy.rsk.eth', 'happy.rsk.eth'), true)
})

test('ignores leading and trailing whitespace', () => {
  assert.equal(isPrimaryNameMatch('  happy.rsk.eth  ', 'happy.rsk.eth'), true)
})

test('returns false when names differ', () => {
  assert.equal(isPrimaryNameMatch('alice.rsk.eth', 'happy.rsk.eth'), false)
})

test('returns false when either name is missing', () => {
  assert.equal(isPrimaryNameMatch('', 'happy.rsk.eth'), false)
  assert.equal(isPrimaryNameMatch('happy.rsk.eth', undefined), false)
})
