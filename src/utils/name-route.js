import { normalize } from 'viem/ens'

function invalidRouteName() {
  return {
    isValid: false,
    canonicalName: null,
  }
}

export function normalizeRouteNameParam(value) {
  if (value == null) return invalidRouteName()

  let decoded
  try {
    decoded = decodeURIComponent(String(value))
  } catch {
    return invalidRouteName()
  }

  const trimmed = decoded.trim().toLowerCase()
  if (!trimmed) return invalidRouteName()

  const canonicalName = trimmed.endsWith('.rsk') ? trimmed : `${trimmed}.rsk`

  if (/[^a-z0-9.\-]/.test(canonicalName.replace(/\.rsk$/, ''))) {
    return invalidRouteName()
  }

  try {
    return {
      isValid: true,
      canonicalName: normalize(canonicalName),
    }
  } catch {
    return invalidRouteName()
  }
}

export function toNamePath(name) {
  return `/${encodeURIComponent(name)}`
}
