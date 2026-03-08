import type {
  EnsAddressDraft,
  EnsAddressRecord,
  SupportedEnsAddress,
} from './address-records.types';

export function buildAddressMap(addresses: EnsAddressRecord[]): Record<number, EnsAddressRecord> {
  const map: Record<number, EnsAddressRecord> = {};
  for (const addr of addresses) map[addr.coinType] = addr;
  return map;
}

export function filterSupportedAddresses(
  supported: SupportedEnsAddress[],
  searchFilter?: string,
): SupportedEnsAddress[] {
  if (!searchFilter?.trim()) return supported;
  const needle = searchFilter.toLowerCase();
  return supported.filter(
    a => a.chainName.toLowerCase().includes(needle) || a.label.toLowerCase().includes(needle),
  );
}

export function updateAddressValue(
  addresses: EnsAddressRecord[],
  coinType: number,
  value: string,
): EnsAddressRecord[] {
  return addresses.map(a => (a.coinType === coinType ? { ...a, value } : a));
}

export function addAddressRecord(
  addresses: EnsAddressRecord[],
  coinType: number,
  initialAddresses: EnsAddressRecord[] = [],
): EnsAddressRecord[] {
  if (addresses.some(a => a.coinType === coinType)) return addresses;
  const initial = initialAddresses.find(a => a.coinType === coinType);
  return [...addresses, { coinType, value: initial?.value ?? '' }];
}

export function removeAddressRecord(
  addresses: EnsAddressRecord[],
  coinType: number,
): EnsAddressRecord[] {
  return addresses.filter(a => a.coinType !== coinType);
}

export function isAddressInvalid(record: SupportedEnsAddress, value: string): boolean {
  return value.length > 0 && !!record.validate && !record.validate(value);
}

export function splitAddressRecords(
  supported: SupportedEnsAddress[],
  addresses: EnsAddressRecord[],
): { selected: SupportedEnsAddress[]; available: SupportedEnsAddress[] } {
  const map = buildAddressMap(addresses);
  return {
    selected: supported.filter(r => map[r.coinType] !== undefined),
    available: supported.filter(r => map[r.coinType] === undefined),
  };
}

export function createAddressDrafts(
  supported: SupportedEnsAddress[],
  addresses: EnsAddressRecord[],
): EnsAddressDraft[] {
  const supportedMap = buildSupportedAddressMap(supported);

  return addresses
    .map(address => {
      const record = supportedMap[address.coinType];
      if (!record) return null;

      return {
        coinType: record.coinType,
        value: address.value,
        chainName: record.chainName,
        label: record.label,
        placeholder: record.placeholder,
        chainId: record.chainId,
        isEvm: record.isEvm,
        isDirty: false,
        isNew: false,
      };
    })
    .filter((draft): draft is EnsAddressDraft => draft !== null);
}

export function getChangedAddressRecords(
  drafts: EnsAddressDraft[],
  initialAddresses: EnsAddressRecord[],
): EnsAddressRecord[] {
  const initialMap = buildAddressMap(initialAddresses);

  return drafts
    .filter(draft => {
      if (!draft.isDirty) return false;
      const initial = initialMap[draft.coinType];
      return (initial?.value ?? '') !== draft.value;
    })
    .map(draft => ({
      coinType: draft.coinType,
      value: draft.value,
    }));
}

export function upsertAddressDraft(
  drafts: EnsAddressDraft[],
  nextDraft: EnsAddressDraft,
): EnsAddressDraft[] {
  const existingIndex = drafts.findIndex(draft => draft.coinType === nextDraft.coinType);
  if (existingIndex === -1) {
    return [...drafts, nextDraft];
  }

  return drafts.map(draft => (draft.coinType === nextDraft.coinType ? nextDraft : draft));
}

function buildSupportedAddressMap(
  supported: SupportedEnsAddress[],
): Record<number, SupportedEnsAddress> {
  const map: Record<number, SupportedEnsAddress> = {};
  for (const record of supported) {
    map[record.coinType] = record;
  }
  return map;
}
