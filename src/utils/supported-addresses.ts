import { isAddress } from 'viem';
import {
  arbitrum,
  base,
  celo,
  mainnet,
  optimism,
  polygon,
  zora,
} from 'viem/chains';

import type { SupportedEnsAddress } from './address-records.types';

export const EVM_COIN_TYPE_OFFSET = 0x80000000;

export const convertEVMChainIdToCoinType = (chainId: number): number => {
  return EVM_COIN_TYPE_OFFSET + chainId;
};

const isValidEvmAddress = (value: string) => isAddress(value);

const isValidBtcAddress = (value: string): boolean => {
  if (!value || value.length < 26 || value.length > 62) return false;
  return /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})$/.test(
    value,
  );
};

const isValidSolAddress = (value: string): boolean => {
  if (!value || value.length < 32 || value.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
};

export const supportedAddresses: SupportedEnsAddress[] = [
  {
    label: 'Rootstock',
    coinType: 137,
    chainName: 'rsk',
    placeholder: '0x1D8...c19f8',
    chainId: 30,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Ethereum',
    coinType: 60,
    chainName: 'eth',
    placeholder: '0x1D8...c19f8',
    chainId: mainnet.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Bitcoin',
    coinType: 0,
    chainName: 'bitcoin',
    placeholder: '7Mi3m...sy7dw',
    validate: isValidBtcAddress,
  },
  {
    label: 'Solana',
    coinType: 501,
    chainName: 'sol',
    placeholder: '1BH2S...Y3x33',
    validate: isValidSolAddress,
  },
  {
    label: 'Base',
    coinType: convertEVMChainIdToCoinType(base.id),
    chainName: 'base',
    placeholder: '0x1D8...c19f8',
    chainId: base.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Arbitrum',
    coinType: convertEVMChainIdToCoinType(arbitrum.id),
    chainName: 'arb',
    placeholder: '0x1D8...c19f8',
    chainId: arbitrum.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Celo',
    coinType: convertEVMChainIdToCoinType(celo.id),
    chainName: 'celo',
    placeholder: '0x1D8...c19f8',
    chainId: celo.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Polygon',
    coinType: convertEVMChainIdToCoinType(polygon.id),
    chainName: 'matic',
    placeholder: '0x1D8...c19f8',
    chainId: polygon.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Optimism',
    coinType: convertEVMChainIdToCoinType(optimism.id),
    chainName: 'op',
    placeholder: '0x1D8...c19f8',
    chainId: optimism.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
  {
    label: 'Zora',
    coinType: convertEVMChainIdToCoinType(zora.id),
    chainName: 'zora',
    placeholder: '0x1D8...c19f8',
    chainId: zora.id,
    isEvm: true,
    validate: isValidEvmAddress,
  },
];

export const getSupportedAddressMap = (): Record<number, SupportedEnsAddress> => {
  const map: Record<number, SupportedEnsAddress> = {};
  for (const addr of supportedAddresses) {
    map[addr.coinType] = addr;
  }
  return map;
};

export const getSupportedAddressByCoin = (
  coinType: number,
): SupportedEnsAddress | undefined => {
  return supportedAddresses.find(addr => addr.coinType === coinType);
};

export const getSupportedAddressByName = (
  chainName: string,
): SupportedEnsAddress | undefined => {
  return supportedAddresses.find(addr => addr.chainName === chainName);
};

export const getSupportedAddressByChainId = (
  chainId: number,
): SupportedEnsAddress | undefined => {
  return supportedAddresses.find(addr => addr.chainId === chainId);
};

export const isEvmCoinType = (coinType: number): boolean => {
  const supported = getSupportedAddressByCoin(coinType);
  return supported?.isEvm === true || coinType >= EVM_COIN_TYPE_OFFSET;
};
