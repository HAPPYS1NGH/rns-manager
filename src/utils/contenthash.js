/**
 * Content hash encoding/decoding utilities
 * Uses @ensdomains/content-hash for standard ENS content hash encoding
 */
import { encode, decode, getCodec } from '@ensdomains/content-hash'

const URI_SCHEMES = {
    ipfs: 'ipfs://',
    swarm: 'swarm://',
    onion: 'onion://',
    onion3: 'onion3://',
    ipns: 'ipns://',
}

const SUPPORTED_PROTOCOLS = Object.keys(URI_SCHEMES)

/**
 * Decode raw content hash bytes from the resolver into a human-readable URI
 * @param {string} rawHex - Raw hex bytes from contenthash(node), e.g. "0xe3010170..."
 * @returns {string|null} - Decoded URI (e.g. "ipfs://bafybeig...") or null if empty
 */
export function decodeContentHash(rawHex) {
    if (!rawHex || rawHex === '0x' || rawHex === '0x0') {
        return null
    }

    try {
        const normalized = rawHex.startsWith('0x') ? rawHex : `0x${rawHex}`
        
        // Use the library's getCodec to determine protocol
        let protocol
        try {
            protocol = getCodec(normalized)
        } catch {
            // Fall back to hex prefix detection for unknown codecs
            protocol = getProtocolFromHex(normalized)
        }
        
        if (!protocol || !URI_SCHEMES[protocol]) {
            return null
        }

        const decoded = decode(normalized)
        return `${URI_SCHEMES[protocol]}${decoded}`
    } catch (err) {
        console.warn('Failed to decode content hash:', err)
        return null
    }
}

/**
 * Encode a content hash value into raw bytes for the resolver.
 * Accepts:
 *   - IPFS CID (Qm... or bafy...)
 *   - Swarm hash
 *   - Onion/onion3 address
 *   - Full URI with any supported scheme (ipfs://, swarm://, onion://, onion3://)
 *
 * @param {string} input - CID string, hash, or URI
 * @returns {string} - Hex-encoded contenthash bytes with 0x prefix
 */
export function encodeContentHash(input) {
    const trimmed = input.trim()

    const uriMatch = trimmed.match(/^(ipfs|ipns|swarm|onion|onion3):\/\/(.+)$/)

    let protocol, value
    if (uriMatch) {
        protocol = uriMatch[1]
        value = uriMatch[2]
    } else {
        // Try to detect protocol from format
        protocol = detectProtocol(trimmed)
        if (!protocol) {
            // Default to IPFS for raw CIDs
            protocol = 'ipfs'
            value = trimmed
        } else {
            value = trimmed
        }
    }

    if (!SUPPORTED_PROTOCOLS.includes(protocol)) {
        throw new Error(`Unsupported protocol: ${protocol}. Use ipfs, swarm, onion, or onion3`)
    }

    try {
        const encoded = encode(protocol, value)
        return `0x${encoded}`
    } catch (err) {
        throw new Error(`Failed to encode ${protocol} content hash: ${err.message}`)
    }
}

/**
 * Validate a content hash input
 * @param {string} input
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateContentHash(input) {
    if (!input || !input.trim()) {
        return { valid: false, error: 'Content hash is required' }
    }
    try {
        encodeContentHash(input.trim())
        return { valid: true }
    } catch (err) {
        return { valid: false, error: err.message }
    }
}

/**
 * Get the protocol from a decoded content hash URI
 * @param {string} uri - e.g. "ipfs://bafybeig..."
 * @returns {string|null} - e.g. "IPFS"
 */
export function getContentHashProtocol(uri) {
    if (!uri) return null
    const match = uri.match(/^(\w+):\/\//)
    return match ? match[1].toUpperCase() : null
}

/**
 * Get the protocol type from encoded hex bytes
 * @param {string} hex - Raw hex bytes
 * @returns {string|null} - Protocol name (ipfs, swarm, onion, onion3)
 */
function getProtocolFromHex(hex) {
    if (!hex || hex === '0x') return null
    
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex
    if (clean.length < 2) return null

    // Multicodec prefixes
    const prefixes = {
        'e3': 'ipns',
        'e4': 'swarm',
        'e5': 'ipfs',
        'bc': 'onion',
        'bd': 'onion3',
    }

    const code = clean.substring(0, 2)
    return prefixes[code] || null
}

/**
 * Detect protocol from raw value format
 * @param {string} value - Raw value
 * @returns {string|null} - Protocol name
 */
function detectProtocol(value) {
    // Onion addresses are 16 characters base32
    if (/^[a-z2]{16}$/i.test(value)) return 'onion'
    // Onion3 addresses are 56 characters base32
    if (/^[a-z2]{56}$/i.test(value)) return 'onion3'
    // Swarm addresses start with 0x
    if (/^0x[a-f0-9]{40}$/i.test(value)) return 'swarm'
    return null
}

/**
 * Get supported protocols for UI
 * @returns {string[]} - List of supported protocol names
 */
export function getSupportedProtocols() {
    return SUPPORTED_PROTOCOLS
}
