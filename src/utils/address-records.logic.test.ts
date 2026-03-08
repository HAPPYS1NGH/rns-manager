import test from 'node:test'
import assert from 'node:assert/strict'

import {
  addAddressRecord,
  buildAddressMap,
  createAddressDrafts,
  filterSupportedAddresses,
  getChangedAddressRecords,
  isAddressInvalid,
  removeAddressRecord,
  splitAddressRecords,
  upsertAddressDraft,
  updateAddressValue,
} from './address-records.logic.ts'
import { supportedAddresses } from './supported-addresses.ts'

test('filterSupportedAddresses matches chain name and label case-insensitively', () => {
  const baseResults = filterSupportedAddresses(supportedAddresses, 'BASE')
  const bitcoinResults = filterSupportedAddresses(supportedAddresses, 'bit')

  assert.equal(baseResults.some(record => record.chainName === 'base'), true)
  assert.equal(bitcoinResults.some(record => record.label === 'Bitcoin'), true)
})

test('buildAddressMap and splitAddressRecords keep selected and available records separate', () => {
  const addresses = [
    { coinType: 60, value: '0x1111111111111111111111111111111111111111' },
    { coinType: 2147492101, value: '0x2222222222222222222222222222222222222222' },
  ]

  const map = buildAddressMap(addresses)
  const split = splitAddressRecords(supportedAddresses, addresses)

  assert.equal(map[60]?.value, '0x1111111111111111111111111111111111111111')
  assert.equal(split.selected.some(record => record.coinType === 2147492101), true)
  assert.equal(split.available.some(record => record.coinType === 2147492101), false)
})

test('update/add/remove helpers return new arrays without mutating inputs', () => {
  const initial = [{ coinType: 60, value: '0x1111111111111111111111111111111111111111' }]

  const updated = updateAddressValue(initial, 60, '0x2222222222222222222222222222222222222222')
  const added = addAddressRecord(updated, 0)
  const removed = removeAddressRecord(added, 60)

  assert.deepEqual(initial, [{ coinType: 60, value: '0x1111111111111111111111111111111111111111' }])
  assert.equal(updated[0]?.value, '0x2222222222222222222222222222222222222222')
  assert.equal(added.some(record => record.coinType === 0), true)
  assert.equal(removed.some(record => record.coinType === 60), false)
})

test('isAddressInvalid uses record-level validators', () => {
  const ethereum = supportedAddresses.find(record => record.coinType === 60)
  assert.ok(ethereum)

  assert.equal(isAddressInvalid(ethereum, ''), false)
  assert.equal(isAddressInvalid(ethereum, 'not-an-address'), true)
  assert.equal(
    isAddressInvalid(ethereum, '0x1111111111111111111111111111111111111111'),
    false,
  )
})

test('createAddressDrafts includes existing addresses and preserves supported metadata', () => {
  const drafts = createAddressDrafts(supportedAddresses, [
    { coinType: 60, value: '0x1111111111111111111111111111111111111111' },
  ])

  assert.equal(drafts.length > 0, true)
  assert.equal(drafts.find(draft => draft.coinType === 60)?.value, '0x1111111111111111111111111111111111111111')
  assert.equal(drafts.find(draft => draft.coinType === 60)?.label, 'Ethereum')
  assert.equal(drafts.find(draft => draft.coinType === 60)?.isDirty, false)
})

test('createAddressDrafts preserves the incoming saved row order', () => {
  const drafts = createAddressDrafts(supportedAddresses, [
    { coinType: 2147492101, value: '0x2222222222222222222222222222222222222222' },
    { coinType: 60, value: '0x1111111111111111111111111111111111111111' },
  ])

  assert.deepEqual(
    drafts.map(draft => draft.coinType),
    [2147492101, 60],
  )
})

test('getChangedAddressRecords returns only dirty rows with changed values', () => {
  const drafts = [
    {
      coinType: 60,
      value: '0x1111111111111111111111111111111111111111',
      label: 'Ethereum',
      chainName: 'eth',
      isDirty: false,
      isNew: false,
    },
    {
      coinType: 2147492101,
      value: '0x2222222222222222222222222222222222222222',
      label: 'Base',
      chainName: 'base',
      isDirty: true,
      isNew: true,
    },
  ]

  const changed = getChangedAddressRecords(drafts, [
    { coinType: 60, value: '0x1111111111111111111111111111111111111111' },
  ])

  assert.deepEqual(changed, [
    { coinType: 2147492101, value: '0x2222222222222222222222222222222222222222' },
  ])
})

test('upsertAddressDraft keeps existing rows stable and appends new rows at the bottom', () => {
  const existingDrafts = createAddressDrafts(supportedAddresses, [
    { coinType: 60, value: '0x1111111111111111111111111111111111111111' },
    { coinType: 0, value: 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0l98cr' },
  ])

  const base = supportedAddresses.find(record => record.coinType === 2147492101)
  assert.ok(base)

  const nextDrafts = upsertAddressDraft(existingDrafts, {
    coinType: base.coinType,
    value: '0x2222222222222222222222222222222222222222',
    chainName: base.chainName,
    label: base.label,
    placeholder: base.placeholder,
    chainId: base.chainId,
    isEvm: base.isEvm,
    isDirty: true,
    isNew: true,
  })

  assert.deepEqual(
    nextDrafts.map(draft => draft.coinType),
    [60, 0, 2147492101],
  )
})
