// ─── RNS Contract Addresses (Rootstock Mainnet) ────────────────────────────

export const RNS_REGISTRY_ADDRESS = '0xcb868aeabd31e2b66f74e9a55cf064abb31a4ad5'

// Known public resolver used by most RNS names (e.g. happy.rsk)
export const PUBLIC_RESOLVER_ADDRESS = '0xD87f8121d44f3717d4baDC50b24e50044f86D64b'

// ─── Registry ABI ───────────────────────────────────────────────────────────

export const REGISTRY_ABI = [
  // ── Read ──
  {
    name: 'owner',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'resolver',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'ttl',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'recordExists',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Write ──
  {
    name: 'setSubnodeOwner',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setResolver',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'resolver', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'setOwner',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Events ──
  {
    name: 'NewOwner',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: true, name: 'label', type: 'bytes32' },
      { indexed: false, name: 'owner', type: 'address' },
    ],
  },
  {
    name: 'NewResolver',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: false, name: 'resolver', type: 'address' },
    ],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: false, name: 'owner', type: 'address' },
    ],
  },
]

// ─── Resolver ABI ───────────────────────────────────────────────────────────
// Standard ENS Public Resolver interface — the RNS resolver implements all of these.

export const RESOLVER_ABI = [
  // ── Single-coin address (RSK native) ──
  {
    name: 'addr',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'setAddr',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'addr', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Multi-coin address (ENSIP-9) ──
  {
    name: 'addr',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'setAddr',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'coinType', type: 'uint256' },
      { name: 'a', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    name: 'multicall',
    inputs: [{ name: 'data', type: 'bytes[]' }],
    outputs: [{ name: 'results', type: 'bytes[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Text records (ENSIP-5) ──
  {
    name: 'text',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'setText',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Content hash (ENSIP-7) ──
  {
    name: 'contenthash',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'setContenthash',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'hash', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },

  // ── Interface detection (ERC-165) ──
  {
    name: 'supportsInterface',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },

  // ── Events ──
  {
    name: 'AddrChanged',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: false, name: 'a', type: 'address' },
    ],
  },
  {
    name: 'TextChanged',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: false, name: 'key', type: 'string' },
      { indexed: false, name: 'value', type: 'string' },
    ],
  },
  {
    name: 'ContenthashChanged',
    type: 'event',
    inputs: [
      { indexed: true, name: 'node', type: 'bytes32' },
      { indexed: false, name: 'hash', type: 'bytes' },
    ],
  },
]
