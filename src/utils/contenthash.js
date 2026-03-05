/**
 * Content hash encoding/decoding utilities
 * Uses multiformats/cid directly since @ensdomains/content-hash v3's
 * encode() doesn't produce proper multicodec-prefixed contenthash bytes.
 */
import { CID } from 'multiformats/cid'

// Multicodec namespace prefixes for contenthash
const NAMESPACE = {
    ipfs: 0xe3,
    ipns: 0xe5,
    swarm: 0xe4,
}

const NAMESPACE_NAMES = {
    0xe3: 'ipfs',
    0xe5: 'ipns',
    0xe4: 'swarm',
}

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
        const clean = rawHex.startsWith('0x') ? rawHex.slice(2) : rawHex
        const bytes = hexToBytes(clean)

        const nsCode = bytes[0]
        const nsName = NAMESPACE_NAMES[nsCode]

        if (!nsName) {
            return null // unknown namespace
        }

        if (nsName === 'ipfs' || nsName === 'ipns') {
            const cidBytes = bytes.slice(1)
            const cid = CID.decode(cidBytes)
            return `${nsName}://${cid.toString()}`
        }

        // Swarm or other: return raw hex after namespace byte
        return `${nsName}://${bytesToHex(bytes.slice(1))}`
    } catch (err) {
        console.warn('Failed to decode content hash:', err)
        return null
    }
}

/**
 * Encode a content hash value into raw bytes for the resolver.
 * Accepts:
 *   - IPFS CID (Qm... or bafy...)
 *   - ipfs://CID
 *   - Full URI with any supported scheme
 *
 * @param {string} input - CID string or URI
 * @returns {string} - Hex-encoded contenthash bytes with 0x prefix
 */
export function encodeContentHash(input) {
    const trimmed = input.trim()

    // Try to parse as URI first
    const uriMatch = trimmed.match(/^(ipfs|ipns):\/\/(.+)$/)

    let scheme, value
    if (uriMatch) {
        scheme = uriMatch[1]
        value = uriMatch[2]
    } else {
        // Assume raw IPFS CID if no scheme (most common use case)
        scheme = 'ipfs'
        value = trimmed
    }

    const nsCode = NAMESPACE[scheme]
    if (nsCode === undefined) {
        throw new Error(`Unsupported scheme: ${scheme}. Use ipfs:// or ipns://`)
    }

    if (scheme === 'ipfs') {
        let cid = CID.parse(value)
        // Convert v0 CIDs (Qm...) to v1 for proper encoding
        if (cid.version === 0) cid = cid.toV1()
        const cidBytes = cid.bytes
        const result = new Uint8Array(1 + cidBytes.length)
        result[0] = nsCode
        result.set(cidBytes, 1)
        return '0x' + bytesToHexStr(result)
    }

    if (scheme === 'ipns') {
        // IPNS names are typically encoded as UTF-8 bytes
        const nameBytes = new TextEncoder().encode(value)
        const result = new Uint8Array(1 + nameBytes.length)
        result[0] = nsCode
        result.set(nameBytes, 1)
        return '0x' + bytesToHexStr(result)
    }

    throw new Error(`Encoding not yet implemented for: ${scheme}`)
}

/**
 * Validate a content hash input (CID or URI)
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    return bytes
}

function bytesToHex(bytes) {
    return '0x' + bytesToHexStr(bytes)
}

function bytesToHexStr(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
