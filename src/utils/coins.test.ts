import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMulticallSetAddrCalls,
  decodeAddress,
  encodeAddress,
  getCoinName,
  validateAddress,
} from './coins.js'
import { convertEVMChainIdToCoinType, supportedAddresses } from './supported-addresses.ts'

const baseCoinType = convertEVMChainIdToCoinType(8453)
const evmAddress = '0x1111111111111111111111111111111111111111'

test('supportedAddresses includes Base with the ENSIP-11 coin type', () => {
  const base = supportedAddresses.find(record => record.chainName === 'base')

  assert.ok(base)
  assert.equal(base.coinType, 2147492101)
  assert.equal(base.coinType, baseCoinType)
})

test('validateAddress accepts EVM addresses for ENSIP-11 coin types', () => {
  assert.deepEqual(validateAddress(baseCoinType, evmAddress), { valid: true })
})

test('encodeAddress and decodeAddress round-trip EVM ENSIP-11 addresses', () => {
  const encoded = encodeAddress(baseCoinType, evmAddress)
  const decoded = decodeAddress(baseCoinType, encoded)

  assert.equal(encoded, evmAddress.toLowerCase())
  assert.equal(decoded, evmAddress)
})

test('getCoinName uses supported metadata for ENSIP-11 EVM chains', () => {
  assert.equal(getCoinName(baseCoinType), 'Base')
})

test('buildMulticallSetAddrCalls encodes one resolver setAddr call per address record', () => {
  const node = '0x' + '11'.repeat(32)
  const calls = buildMulticallSetAddrCalls(node, [
    { coinType: 60, value: evmAddress },
    { coinType: baseCoinType, value: '0x2222222222222222222222222222222222222222' },
  ])

  assert.equal(calls.length, 2)
  assert.equal(calls.every(call => call.startsWith('0x')), true)
  assert.notEqual(calls[0], calls[1])
})
