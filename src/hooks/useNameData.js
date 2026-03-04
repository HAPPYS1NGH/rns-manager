/**
 * useNameData — Composite hook that fetches all records for an RNS name
 *
 * Reads: owner, resolver, RSK address, multi-coin addresses,
 *        text records, and content hash.
 */
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { namehash } from 'viem'
import { normalize } from 'viem/ens'
import { rootstock } from 'viem/chains'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI, RESOLVER_ABI } from '../contracts'
import { SUPPORTED_COINS, decodeAddress } from '../utils/coins'
import { decodeContentHash } from '../utils/contenthash'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

// Common text record keys to fetch automatically
export const TEXT_KEYS = [
    'avatar',
    'name',
    'description',
    'url',
    'com.twitter',
    'com.github',
    'com.discord',
    'email',
    'notice',
    'location',
]

/**
 * Safely compute namehash, returning null on invalid names
 */
function safeNode(name) {
    try {
        return namehash(normalize(name))
    } catch {
        return null
    }
}

/**
 * @param {string} name - Fully qualified RNS name (e.g. "happy.rsk")
 * @returns {Object} All name data + loading/error states
 */
export function useNameData(name) {
    const { address: connectedAddress } = useAccount()
    const node = name ? safeNode(name) : null
    const enabled = !!node

    // ── 1. Registry reads: owner + resolver ──────────────────────────────────

    const { data: owner, isLoading: ownerLoading, refetch: refetchOwner } = useReadContract({
        address: RNS_REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'owner',
        args: node ? [node] : undefined,
        chainId: rootstock.id,
        query: { enabled },
    })

    const { data: resolver, isLoading: resolverLoading, refetch: refetchResolver } = useReadContract({
        address: RNS_REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'resolver',
        args: node ? [node] : undefined,
        chainId: rootstock.id,
        query: { enabled },
    })

    const hasResolver = !!resolver && resolver !== ZERO_ADDR
    const nameExists = !!owner && owner !== ZERO_ADDR

    // ── 2. RSK address (single-coin) ─────────────────────────────────────────

    const { data: rskAddress, isLoading: rskAddrLoading, refetch: refetchRskAddr } = useReadContract({
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: 'addr',
        args: node ? [node] : undefined,
        chainId: rootstock.id,
        query: { enabled: enabled && hasResolver },
    })

    // ── 3. Multi-coin addresses ──────────────────────────────────────────────

    const multiCoinContracts = SUPPORTED_COINS.map(coin => ({
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: 'addr',
        args: [node, BigInt(coin.coinType)],
        chainId: rootstock.id,
    }))

    const {
        data: multiCoinResults,
        isLoading: multiCoinLoading,
        refetch: refetchMultiCoin,
    } = useReadContracts({
        contracts: enabled && hasResolver ? multiCoinContracts : [],
        query: { enabled: enabled && hasResolver },
    })

    // Decode multi-coin results
    const multiCoinAddresses = {}
    if (multiCoinResults) {
        SUPPORTED_COINS.forEach((coin, i) => {
            const result = multiCoinResults[i]
            if (result?.status === 'success' && result.result) {
                const decoded = decodeAddress(coin.coinType, result.result)
                if (decoded) {
                    multiCoinAddresses[coin.coinType] = decoded
                }
            }
        })
    }

    // ── 4. Text records ─────────────────────────────────────────────────────

    const textContracts = TEXT_KEYS.map(key => ({
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: 'text',
        args: [node, key],
        chainId: rootstock.id,
    }))

    const {
        data: textResults,
        isLoading: textLoading,
        refetch: refetchText,
    } = useReadContracts({
        contracts: enabled && hasResolver ? textContracts : [],
        query: { enabled: enabled && hasResolver },
    })

    // Build text records object (skip empty values)
    const textRecords = {}
    if (textResults) {
        TEXT_KEYS.forEach((key, i) => {
            const result = textResults[i]
            if (result?.status === 'success' && result.result && result.result !== '') {
                textRecords[key] = result.result
            }
        })
    }

    // ── 5. Content hash ─────────────────────────────────────────────────────

    const { data: rawContentHash, isLoading: contentHashLoading, refetch: refetchContentHash } = useReadContract({
        address: resolver,
        abi: RESOLVER_ABI,
        functionName: 'contenthash',
        args: node ? [node] : undefined,
        chainId: rootstock.id,
        query: { enabled: enabled && hasResolver },
    })

    const contentHash = rawContentHash ? decodeContentHash(rawContentHash) : null

    // ── 6. Ownership check ──────────────────────────────────────────────────

    const isOwner = !!(
        connectedAddress &&
        owner &&
        connectedAddress.toLowerCase() === owner.toLowerCase()
    )

    // ── Aggregate loading state ─────────────────────────────────────────────

    const isLoading = ownerLoading || resolverLoading
    const isLoadingRecords = rskAddrLoading || multiCoinLoading || textLoading || contentHashLoading

    // ── Refetch all ─────────────────────────────────────────────────────────

    const refetch = () => {
        refetchOwner()
        refetchResolver()
        if (hasResolver) {
            refetchRskAddr()
            refetchMultiCoin()
            refetchText()
            refetchContentHash()
        }
    }

    return {
        // Core
        node,
        name,
        nameExists,
        owner,
        resolver,
        hasResolver,

        // Records
        rskAddress: rskAddress && rskAddress !== ZERO_ADDR ? rskAddress : null,
        multiCoinAddresses,
        textRecords,
        contentHash,

        // Permissions
        isOwner,

        // Loading
        isLoading,
        isLoadingRecords,

        // Actions
        refetch,
    }
}
