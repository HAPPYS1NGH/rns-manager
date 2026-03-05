/**
 * Multi-coin address encoding/decoding utilities
 * Wraps @ensdomains/address-encoder for use with RNS/ENS resolver contracts
 */
import { getCoderByCoinType } from '@ensdomains/address-encoder'

// ─── Supported Coin Types ───────────────────────────────────────────────────
// SLIP-44 coin types for non-EVM chains, ENSIP-11 for EVM chains
// ENSIP-11: coinType = 0x80000000 | chainId  (for EVM chains)

export const SUPPORTED_COINS = [
    { name: 'Rootstock', symbol: 'RBTC', coinType: 137, evmChainId: 30, icon: '◈' },
    { name: 'Ethereum', symbol: 'ETH', coinType: 60, evmChainId: 1, icon: 'Ξ' },
    { name: 'Bitcoin', symbol: 'BTC', coinType: 0, evmChainId: null, icon: '₿' },
]

/**
 * Decode raw bytes from resolver into a human-readable native address
 * @param {number} coinType - SLIP-44 or ENSIP-11 coin type
 * @param {string} rawHex - Raw hex bytes from addr(node, coinType), e.g. "0x1234..."
 * @returns {string|null} - Decoded address or null if empty
 */
export function decodeAddress(coinType, rawHex) {
    if (!rawHex || rawHex === '0x' || rawHex === '0x0' || rawHex === '0x' + '00'.repeat(20)) {
        return null
    }

    try {
        let coderCoinType = coinType;
        if (coinType >= 2147483648) coderCoinType = 60; // Fallback to ETH (60) for ENSIP-11 EVM chains
        const coder = getCoderByCoinType(coderCoinType);
        // Strip 0x prefix and convert to Uint8Array
        const bytes = hexToBytes(rawHex);
        return coder.encode(bytes);
    } catch (err) {
        console.warn(`Failed to decode address for coinType ${coinType}:`, err);
        return rawHex; // fallback: return raw hex
    }
}

/**
 * Encode a human-readable native address into raw bytes for the resolver
 * @param {number} coinType - SLIP-44 or ENSIP-11 coin type
 * @param {string} address - Native address string (e.g. "0x..." for ETH, "bc1q..." for BTC)
 * @returns {string} - Hex-encoded bytes with 0x prefix
 */
export function encodeAddress(coinType, address) {
    let coderCoinType = coinType;
    if (coinType >= 2147483648) coderCoinType = 60; // Fallback to ETH (60) for ENSIP-11 EVM chains
    const coder = getCoderByCoinType(coderCoinType);
    const bytes = coder.decode(address);
    return bytesToHex(bytes);
}

/**
 * Validate a native address for a given coin type
 * @param {number} coinType
 * @param {string} address
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAddress(coinType, address) {
    if (!address || !address.trim()) {
        return { valid: false, error: 'Address is required' }
    }
    try {
        encodeAddress(coinType, address.trim())
        return { valid: true }
    } catch (err) {
        return { valid: false, error: `Invalid address for ${getCoinName(coinType)}: ${err.message}` }
    }
}

/**
 * Get the display name for a coin type
 */
export function getCoinName(coinType) {
    const coin = SUPPORTED_COINS.find(c => c.coinType === coinType)
    return coin ? coin.name : `Coin ${coinType}`
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

function hexToBytes(hex) {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
    }
    return bytes
}

function bytesToHex(bytes) {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
