export function normalizePrimaryName(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export function isPrimaryNameMatch(currentPrimaryName, targetName) {
  const current = normalizePrimaryName(currentPrimaryName)
  const target = normalizePrimaryName(targetName)

  if (!current || !target) return false
  return current === target
}
