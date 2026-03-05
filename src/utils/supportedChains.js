import { isAddress } from "viem";
import {
    base,
    arbitrum,
    polygon,
    optimism,
    zora,
    mainnet,
    celo,
} from "viem/chains";

/**
 * Converts an EVM Chain ID to ENS/RNS Coin Type (ENSIP-11)
 * @param {number} chainId
 * @returns {number}
 */
export const convertEVMChainIdToCoinType = (chainId) => {
    return (2147483648 + chainId) >>> 0;
};

const isValidEmvAddress = (value) => {
    return isAddress(value);
};

// Simple BTC address validation (P2PKH, P2SH, Bech32, Bech32m)
const isValidBtcAddress = (value) => {
    if (!value || value.length < 26 || value.length > 62) return false;
    // P2PKH (starts with 1), P2SH (starts with 3), Bech32/Bech32m (starts with bc1)
    const btcRegex = /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})$/;
    return btcRegex.test(value);
};

// Simple Solana address validation (base58, 32-44 chars)
const isValidSolAddress = (value) => {
    if (!value || value.length < 32 || value.length > 44) return false;
    const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solRegex.test(value);
};

/**
 * @typedef {Object} SupportedEnsAddress
 * @property {function(string): boolean} [validateFunc]
 * @property {boolean} [isEMV]
 * @property {string} label
 * @property {number} coinType
 * @property {number} [chainId]
 * @property {string} chainName
 * @property {string} [placeholder]
 */

/** @type {SupportedEnsAddress[]} */
export const supportedAddresses = [
    {
        isEMV: true,
        label: "Rootstock",
        coinType: 137, // Rootstock SLIP-44
        chainId: 30, // Rootstock mainnet
        chainName: "rsk",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Ethereum",
        coinType: 60,
        chainId: mainnet.id,
        chainName: "eth",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: false,
        label: "Bitcoin",
        coinType: 0,
        chainName: "bitcoin",
        chainId: 0,
        placeholder: "7Mi3m...sy7dw",
        validateFunc: isValidBtcAddress,
    },
    {
        isEMV: false,
        label: "Solana",
        coinType: 501,
        chainName: "sol",
        chainId: 501,
        placeholder: "1BH2S...Y3x33",
        validateFunc: isValidSolAddress,
    },
    {
        isEMV: true,
        label: "Base",
        coinType: convertEVMChainIdToCoinType(base.id),
        chainId: base.id,
        chainName: "base",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Arbitrum",
        coinType: convertEVMChainIdToCoinType(arbitrum.id),
        chainId: arbitrum.id,
        chainName: "arb",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Celo",
        coinType: convertEVMChainIdToCoinType(celo.id),
        chainId: celo.id, // Fixed typo in user's prompt (was arbitrum.id)
        chainName: "celo",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Polygon",
        coinType: convertEVMChainIdToCoinType(polygon.id),
        chainId: polygon.id,
        chainName: "matic",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Optimism",
        coinType: convertEVMChainIdToCoinType(optimism.id),
        chainId: optimism.id,
        chainName: "op",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
    {
        isEMV: true,
        label: "Zora",
        coinType: convertEVMChainIdToCoinType(zora.id),
        chainId: zora.id,
        chainName: "zora",
        validateFunc: isValidEmvAddress,
        placeholder: "0x1D8...c19f8",
    },
];

/**
 * @returns {Record<number, SupportedEnsAddress>}
 */
export const getSupportedAddressMap = () => {
    /** @type {Record<number, SupportedEnsAddress>} */
    const map = {};

    supportedAddresses.forEach(addr => {
        map[addr.coinType] = addr;
    });

    return map;
};

/**
 * @param {number} coin
 * @returns {SupportedEnsAddress | undefined}
 */
export const getSupportedAddressByCoin = (coin) => {
    return supportedAddresses.find(addr => addr.coinType === coin);
};

/**
 * @param {string} name
 * @returns {SupportedEnsAddress | undefined}
 */
export const getSupportedAddressByName = (name) => {
    return supportedAddresses.find(addr => addr.chainName === name);
};

/**
 * @param {number} chainId
 * @returns {SupportedEnsAddress | undefined}
 */
export const getSupportedAddressByChainId = (chainId) => {
    return supportedAddresses.find(addr => addr.chainId === chainId);
};

/**
 * @typedef {"profile" | "social"} TextCategory
 */

/**
 * @typedef {Object} SupportedText
 * @property {string} iconUrl
 * @property {string} key
 * @property {TextCategory} category
 * @property {string} label
 * @property {string} placeholder
 * @property {string} [iconName]
 * @property {boolean} [hidden]
 */
