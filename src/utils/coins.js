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

const EVM_COIN_TYPE_OFFSET = 2147483648

function isEnsip11EvmCoinType(coinType) {
    return Number(coinType) >= EVM_COIN_TYPE_OFFSET
}

function getCoinDebugMeta(coinType, value) {
    const normalizedCoinType = Number(coinType)
    const rawValue = typeof value === 'string' ? value : ''

    return {
        coinType: normalizedCoinType,
        coinName: getCoinName(normalizedCoinType),
        isEnsip11Evm: isEnsip11EvmCoinType(normalizedCoinType),
        evmChainId: isEnsip11EvmCoinType(normalizedCoinType) ? normalizedCoinType - EVM_COIN_TYPE_OFFSET : null,
        valueLength: rawValue.length,
        valuePreview: rawValue ? `${rawValue.slice(0, 18)}...${rawValue.slice(-10)}` : '',
    }
}

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
        const coder = getCoderByCoinType(coinType)
        // Strip 0x prefix and convert to Uint8Array
        const bytes = hexToBytes(rawHex)
        const decoded = coder.encode(bytes)

        console.info('[coins.decodeAddress] decoded resolver address', {
            ...getCoinDebugMeta(coinType, rawHex),
            byteLength: bytes.length,
            decoded,
        })

        return decoded
    } catch (err) {
        console.warn('[coins.decodeAddress] failed to decode resolver address', {
            ...getCoinDebugMeta(coinType, rawHex),
            errorMessage: err?.message ?? String(err),
        })
        return rawHex // fallback: return raw hex so the bad stored value is still inspectable
    }
}

/**
 * Encode a human-readable native address into raw bytes for the resolver
 * @param {number} coinType - SLIP-44 or ENSIP-11 coin type
 * @param {string} address - Native address string (e.g. "0x..." for ETH, "bc1q..." for BTC)
 * @returns {string} - Hex-encoded bytes with 0x prefix
 */
export function encodeAddress(coinType, address) {
    const normalizedAddress = address.trim()
    const coder = getCoderByCoinType(coinType)
    const bytes = coder.decode(normalizedAddress)
    const encoded = bytesToHex(bytes)

    console.info('[coins.encodeAddress] encoded address for resolver write', {
        ...getCoinDebugMeta(coinType, normalizedAddress),
        byteLength: bytes.length,
        encoded,
    })

    return encoded
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

    const normalizedAddress = address.trim()

    console.info('[coins.validateAddress] validating address input', {
        ...getCoinDebugMeta(coinType, normalizedAddress),
    })

    try {
        encodeAddress(coinType, normalizedAddress)
        return { valid: true }
    } catch (err) {
        console.warn('[coins.validateAddress] invalid address input', {
            ...getCoinDebugMeta(coinType, normalizedAddress),
            errorMessage: err?.message ?? String(err),
        })
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
