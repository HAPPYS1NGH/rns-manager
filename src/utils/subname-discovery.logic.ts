import { keccak256, encodePacked } from 'viem'

function isBytes32Hex(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)
}

function normalizeLabel(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function computeSubnodeHash(parentNode: string | null, labelHash: string | null) {
  if (!parentNode || !labelHash) return null
  return keccak256(encodePacked(['bytes32', 'bytes32'], [parentNode, labelHash]))
}

export function normalizeStoredLabelMap(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}

  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(input)) {
    const normalizedKeyLabel = normalizeLabel(key)
    const normalizedValueLabel = normalizeLabel(value)

    if (isBytes32Hex(key) && normalizedValueLabel) {
      normalized[key.toLowerCase()] = normalizedValueLabel
      continue
    }

    if (normalizedKeyLabel && isBytes32Hex(value)) {
      normalized[value.toLowerCase()] = normalizedKeyLabel
    }
  }

  return normalized
}

export function buildOptimisticSubnodes(
  parentNode: string | null,
  labelMap: Record<string, string>,
) {
  return Object.entries(normalizeStoredLabelMap(labelMap)).map(([labelHash, label]) => ({
    labelHash,
    subnodeHash: computeSubnodeHash(parentNode, labelHash),
    label,
  }))
}

export function mergeDiscoveredSubnodes<
  T extends {
    labelHash: string | null
    subnodeHash: string | null
  },
>(subgraphSubnodes: T[], optimisticSubnodes: T[]) {
  const merged = new Map<string, T>()

  for (const sub of optimisticSubnodes) {
    const key = sub.labelHash || sub.subnodeHash
    if (key) merged.set(key, sub)
  }

  for (const sub of subgraphSubnodes) {
    const key = sub.labelHash || sub.subnodeHash
    if (key) merged.set(key, { ...(merged.get(key) || {}), ...sub })
  }

  return Array.from(merged.values())
}
