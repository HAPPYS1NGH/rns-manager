/**
 * useSubnames — Subname discovery via Blockscout event logs + localStorage labels
 *
 * Queries the Rootstock Blockscout API for NewOwner events on the parent node,
 * then batch-reads owner + resolver for each discovered subnode on-chain.
 * Merges with localStorage to preserve known label text.
 */
import { useState, useEffect, useCallback } from 'react'
import { useReadContracts } from 'wagmi'
import { namehash, keccak256, encodePacked, toHex } from 'viem'
import { normalize } from 'viem/ens'
import { rootstock } from 'viem/chains'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI } from '../contracts'

const STORAGE_PREFIX = 'rns-subnames:'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

// NewOwner event topic0
const NEW_OWNER_TOPIC = '0xce0457fe73731f824cc272376169235128c118b49d344817417c6d108d155e82'

// Blockscout API base URL for Rootstock
const BLOCKSCOUT_API = 'https://rootstock.blockscout.com/api'

// ─── LocalStorage helpers ───────────────────────────────────────────────────

function getStoredLabels(parentName) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + parentName)
        return raw ? JSON.parse(raw) : {}  // { labelHash: labelText }
    } catch {
        return {}
    }
}

function saveLabels(parentName, labels) {
    localStorage.setItem(STORAGE_PREFIX + parentName, JSON.stringify(labels))
}

// ─── Blockscout event fetcher ───────────────────────────────────────────────

async function fetchNewOwnerEvents(parentNode) {
    const url = new URL(BLOCKSCOUT_API)
    url.searchParams.set('module', 'logs')
    url.searchParams.set('action', 'getLogs')
    url.searchParams.set('address', RNS_REGISTRY_ADDRESS)
    url.searchParams.set('topic0', NEW_OWNER_TOPIC)
    url.searchParams.set('topic1', parentNode)
    url.searchParams.set('topic0_1_opr', 'and')
    url.searchParams.set('fromBlock', '0')
    url.searchParams.set('toBlock', '99999999')

    const res = await fetch(url.toString())
    const json = await res.json()

    if (json.status !== '1' || !Array.isArray(json.result)) {
        return []
    }

    // Each log: topics[2] = labelHash, data = abi.encode(owner)
    // Deduplicate by labelHash (keep latest owner)
    const byLabel = new Map()
    for (const log of json.result) {
        const labelHash = log.topics[2]
        const owner = '0x' + log.data.slice(26) // strip padding
        if (labelHash) {
            byLabel.set(labelHash, owner)
        }
    }

    return Array.from(byLabel.entries()).map(([labelHash, owner]) => ({
        labelHash,
        lastOwner: owner,
    }))
}

// ─── Compute subnode hash from parent node + label hash ─────────────────────

function computeSubnodeHash(parentNode, labelHash) {
    // subnode = keccak256(abi.encodePacked(parentNode, labelHash))
    return keccak256(encodePacked(['bytes32', 'bytes32'], [parentNode, labelHash]))
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * @param {string} parentName - Parent name (e.g. "happy.rsk")
 * @returns {Object} Subnames data + management functions
 */
export function useSubnames(parentName) {
    const [discoveredSubnodes, setDiscoveredSubnodes] = useState([])
    const [labelMap, setLabelMap] = useState({}) // labelHash → labelText
    const [isFetching, setIsFetching] = useState(false)

    // Compute parent node
    let parentNode = null
    try {
        parentNode = parentName ? namehash(normalize(parentName)) : null
    } catch {
        // invalid parent name
    }

    // Load localStorage labels and fetch events
    useEffect(() => {
        if (!parentName || !parentNode) {
            setDiscoveredSubnodes([])
            setLabelMap({})
            return
        }

        // Load known labels from localStorage
        const stored = getStoredLabels(parentName)
        setLabelMap(stored)

        // Fetch events from Blockscout
        setIsFetching(true)
        fetchNewOwnerEvents(parentNode)
            .then(events => {
                setDiscoveredSubnodes(events.map(e => ({
                    labelHash: e.labelHash,
                    subnodeHash: computeSubnodeHash(parentNode, e.labelHash),
                })))
            })
            .catch(err => {
                console.warn('Failed to fetch subname events:', err)
            })
            .finally(() => setIsFetching(false))
    }, [parentName, parentNode])

    // Build contracts for batch read of each subnode's current owner + resolver
    const contracts = discoveredSubnodes.flatMap(sub => [
        {
            address: RNS_REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: 'owner',
            args: [sub.subnodeHash],
            chainId: rootstock.id,
        },
        {
            address: RNS_REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: 'resolver',
            args: [sub.subnodeHash],
            chainId: rootstock.id,
        },
    ])

    const {
        data: results,
        isLoading: isReadingChain,
        refetch,
    } = useReadContracts({
        contracts: contracts.length > 0 ? contracts : [],
        query: { enabled: contracts.length > 0 },
    })

    // Build subnames array from results
    const subnames = discoveredSubnodes.map((sub, i) => {
        const ownerResult = results?.[i * 2]
        const resolverResult = results?.[i * 2 + 1]

        const owner = ownerResult?.status === 'success' ? ownerResult.result : null
        const resolver = resolverResult?.status === 'success' ? resolverResult.result : null

        // Look up human-readable label from localStorage
        const label = labelMap[sub.labelHash] || null

        return {
            labelHash: sub.labelHash,
            label,
            fullName: label ? `${label}.${parentName}` : null,
            displayName: label ? `${label}.${parentName}` : `[${sub.labelHash.slice(0, 10)}...].${parentName}`,
            owner: owner && owner !== ZERO_ADDR ? owner : null,
            hasResolver: !!resolver && resolver !== ZERO_ADDR,
            exists: !!owner && owner !== ZERO_ADDR,
        }
    })

    const isLoading = isFetching || isReadingChain

    // ── Management functions ─────────────────────────────────────────────────

    /**
     * Add a label → labelHash mapping (call after creating a subname)
     */
    const addLabel = useCallback((label) => {
        const normalized = label.toLowerCase().trim()
        const labelHash = keccak256(encodePacked(['string'], [normalized]))

        setLabelMap(prev => {
            const updated = { ...prev, [labelHash]: normalized }
            saveLabels(parentName, updated)
            return updated
        })

        // Also add to discovered subnodes if not already there
        setDiscoveredSubnodes(prev => {
            if (prev.some(s => s.labelHash === labelHash)) return prev
            return [...prev, {
                labelHash,
                subnodeHash: parentNode ? computeSubnodeHash(parentNode, labelHash) : null,
            }]
        })
    }, [parentName, parentNode])

    /**
     * Remove a label from the tracked list
     */
    const removeLabel = useCallback((labelHash) => {
        setLabelMap(prev => {
            const updated = { ...prev }
            delete updated[labelHash]
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
        parentNode,
        isLoading,
        refetch,
        addLabel,
        removeLabel,
        getLabelHash,
    }
}
