export interface EnsAddressRecord {
  coinType: number;
  value: string;
}

export interface EnsAddressDraft extends EnsAddressRecord {
  chainName: string;
  label: string;
  placeholder?: string;
  chainId?: number;
  isEvm?: boolean;
  isDirty: boolean;
  isNew: boolean;
}

export interface SupportedEnsAddress {
  coinType: number;
  chainName: string;
  label: string;
  placeholder?: string;
  chainId?: number;
  isEvm?: boolean;
  validate?: (value: string) => boolean;
}
