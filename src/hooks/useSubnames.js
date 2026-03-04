/**
 * useSubnames — Manual subname management backed by localStorage
 *
 * Since there's no indexer/subgraph for RNS, we use localStorage to track
 * labels the user has created, and fetch on-chain state for each.
 */
import { useState, useEffect, useCallback } from 'react'
import { useReadContracts } from 'wagmi'
import { namehash, keccak256, encodePacked } from 'viem'
import { normalize } from 'viem/ens'
import { rootstock } from 'viem/chains'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI } from '../contracts'

const STORAGE_PREFIX = 'rns-subnames:'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

/**
 * Get stored labels from localStorage
 */
function getStoredLabels(parentName) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + parentName)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

/**
 * Save labels to localStorage
 */
function saveLabels(parentName, labels) {
    localStorage.setItem(STORAGE_PREFIX + parentName, JSON.stringify(labels))
}

/**
 * @param {string} parentName - Parent name (e.g. "happy.rsk")
 * @returns {Object} Subnames data + management functions
 */
export function useSubnames(parentName) {
    const [labels, setLabels] = useState([])

    // Load labels from localStorage on mount / when parentName changes
    useEffect(() => {
        if (parentName) {
            setLabels(getStoredLabels(parentName))
        } else {
            setLabels([])
        }
    }, [parentName])

    // Compute parent node
    let parentNode = null
    try {
        parentNode = parentName ? namehash(normalize(parentName)) : null
    } catch {
        // invalid parent name
    }

    // Build contracts for batch read of each subname's owner + resolver
    const contracts = labels.flatMap(label => {
        try {
            const fullName = `${label}.${parentName}`
            const subnodeHash = namehash(normalize(fullName))
            return [
                {
                    address: RNS_REGISTRY_ADDRESS,
                    abi: REGISTRY_ABI,
                    functionName: 'owner',
                    args: [subnodeHash],
                    chainId: rootstock.id,
                },
                {
                    address: RNS_REGISTRY_ADDRESS,
                    abi: REGISTRY_ABI,
                    functionName: 'resolver',
                    args: [subnodeHash],
                    chainId: rootstock.id,
                },
            ]
        } catch {
            return []
        }
    })

    const {
        data: results,
        isLoading,
        refetch,
    } = useReadContracts({
        contracts: contracts.length > 0 ? contracts : [],
        query: { enabled: contracts.length > 0 },
    })

    // Build subnames array from results
    const subnames = labels.map((label, i) => {
        const ownerResult = results?.[i * 2]
        const resolverResult = results?.[i * 2 + 1]

        const owner = ownerResult?.status === 'success' ? ownerResult.result : null
        const resolver = resolverResult?.status === 'success' ? resolverResult.result : null

        return {
            label,
            fullName: `${label}.${parentName}`,
            owner: owner && owner !== ZERO_ADDR ? owner : null,
            hasResolver: !!resolver && resolver !== ZERO_ADDR,
            exists: !!owner && owner !== ZERO_ADDR,
        }
    })

    // ── Management functions ─────────────────────────────────────────────────

    /**
     * Add a label to the tracked list (call after successful setSubnodeOwner)
     */
    const addLabel = useCallback((label) => {
        const normalized = label.toLowerCase().trim()
        setLabels(prev => {
            if (prev.includes(normalized)) return prev
            const updated = [...prev, normalized]
            saveLabels(parentName, updated)
            return updated
        })
    }, [parentName])

    /**
     * Remove a label from the tracked list
     */
    const removeLabel = useCallback((label) => {
        const normalized = label.toLowerCase().trim()
        setLabels(prev => {
            const updated = prev.filter(l => l !== normalized)
            saveLabels(parentName, updated)
            return updated
        })
    }, [parentName])

    /**
     * Compute the keccak256 label hash for setSubnodeOwner
     */
    const getLabelHash = (label) => {
        return keccak256(encodePacked(['string'], [label]))
    }

    return {
        subnames,
        labels,
        parentNode,
        isLoading,
        refetch,
        addLabel,
        removeLabel,
        getLabelHash,
    }
}
