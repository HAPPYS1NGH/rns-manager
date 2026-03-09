import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOptimisticSubnodes,
  mergeDiscoveredSubnodes,
  normalizeStoredLabelMap,
} from './subname-discovery.logic.ts'

const PARENT_NODE = '0x1111111111111111111111111111111111111111111111111111111111111111'

test('buildOptimisticSubnodes seeds local labels into discovered subnodes', () => {
  const optimistic = buildOptimisticSubnodes(PARENT_NODE, {
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': 'alice',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 'bob',
  })

  assert.deepEqual(
    optimistic.map(sub => ({ label: sub.label, labelHash: sub.labelHash })),
    [
      {
        label: 'alice',
        labelHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      {
        label: 'bob',
        labelHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      },
    ],
  )
  assert.equal(optimistic.every(sub => typeof sub.subnodeHash === 'string' && sub.subnodeHash.startsWith('0x')), true)
})

test('mergeDiscoveredSubnodes keeps optimistic entries until the subgraph catches up', () => {
  const optimistic = buildOptimisticSubnodes(PARENT_NODE, {
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': 'alice',
  })

  assert.deepEqual(mergeDiscoveredSubnodes([], optimistic), optimistic)

  const merged = mergeDiscoveredSubnodes(
    [
      {
        labelHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        subnodeHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
        label: 'alice',
        fullDomain: 'alice.happy.rsk',
        subgraphOwner: '0x123',
        hasResolver: true,
      },
    ],
    optimistic,
  )

  assert.equal(merged.length, 1)
  assert.deepEqual(merged[0], {
    labelHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    subnodeHash: '0x9999999999999999999999999999999999999999999999999999999999999999',
    label: 'alice',
    fullDomain: 'alice.happy.rsk',
    subgraphOwner: '0x123',
    hasResolver: true,
  })
})

test('normalizeStoredLabelMap converts legacy label-to-hash cache entries', () => {
  const normalized = normalizeStoredLabelMap({
    alice: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 'bob',
    nope: 'still-invalid',
  })

  assert.deepEqual(normalized, {
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': 'alice',
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 'bob',
  })
})
