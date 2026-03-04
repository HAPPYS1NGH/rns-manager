/**
 * Content hash encoding/decoding utilities
 * Wraps @ensdomains/content-hash for use with RNS/ENS resolver contracts
 */
import { encode, decode, getCodec } from '@ensdomains/content-hash'

/**
 * Decode raw content hash bytes from the resolver into a human-readable URI
 * @param {string} rawHex - Raw hex bytes from contenthash(node), e.g. "0xe3010170..."
 * @returns {string|null} - Decoded URI (e.g. "ipfs://Qm...") or null if empty
 */
export function decodeContentHash(rawHex) {
    if (!rawHex || rawHex === '0x' || rawHex === '0x0') {
        return null
    }

    try {
        const hex = rawHex.startsWith('0x') ? rawHex.slice(2) : rawHex
        const codec = getCodec(hex)
        const decoded = decode(hex)

        // Map codec to URI scheme
        const schemes = {
            'ipfs-ns': 'ipfs',
            'ipns-ns': 'ipns',
            'swarm-ns': 'bzz',
            'onion': 'onion',
            'onion3': 'onion3',
            'skynet-ns': 'sia',
            'arweave-ns': 'ar',
        }

        const scheme = schemes[codec] || codec
        return `${scheme}://${decoded}`
    } catch (err) {
        console.warn('Failed to decode content hash:', err)
        return null
    }
}

/**
 * Encode a human-readable content hash URI into raw bytes for the resolver
 * Supports: ipfs://<CID>, ipns://<name>, bzz://<hash>
 * @param {string} uri - Content hash URI
 * @returns {string} - Hex-encoded bytes with 0x prefix
 */
export function encodeContentHash(uri) {
    const match = uri.match(/^(ipfs|ipns|bzz|sia|ar|onion|onion3):\/\/(.+)$/)
    if (!match) {
        throw new Error('Invalid content hash URI. Use ipfs://, ipns://, bzz://, etc.')
    }

    const [, scheme, value] = match

    // Map URI scheme back to codec
    const codecs = {
        'ipfs': 'ipfs-ns',
        'ipns': 'ipns-ns',
        'bzz': 'swarm-ns',
        'onion': 'onion',
        'onion3': 'onion3',
        'sia': 'skynet-ns',
        'ar': 'arweave-ns',
    }

    const codec = codecs[scheme]
    if (!codec) {
        throw new Error(`Unsupported content hash scheme: ${scheme}`)
    }

    const encoded = encode(codec, value)
    return '0x' + encoded
}

/**
 * Validate a content hash URI
 * @param {string} uri
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateContentHash(uri) {
    if (!uri || !uri.trim()) {
        return { valid: false, error: 'Content hash URI is required' }
    }
    try {
        encodeContentHash(uri.trim())
        return { valid: true }
    } catch (err) {
        return { valid: false, error: err.message }
    }
}

/**
 * Get the protocol/scheme from a decoded content hash URI
 * @param {string} uri - e.g. "ipfs://Qm..."
 * @returns {string} - e.g. "IPFS"
 */
export function getContentHashProtocol(uri) {
    if (!uri) return null
    const match = uri.match(/^(\w+):\/\//)
    return match ? match[1].toUpperCase() : null
}
