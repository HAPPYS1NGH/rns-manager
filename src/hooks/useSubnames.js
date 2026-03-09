/**
 * useSubnames — Subname discovery via The Graph subgraph
 *
 * Queries the RNS subgraph directly to fetch all subdomains of a parent name.
 * The subgraph provides label names directly, eliminating the need for
 * Blockscout event parsing.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import { keccak256, encodePacked, namehash } from 'viem'
import { normalize } from 'viem/ens'
import { rootstock } from 'viem/chains'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI, RESOLVER_ABI } from '../contracts'
import {
    buildOptimisticSubnodes,
    mergeDiscoveredSubnodes,
    normalizeStoredLabelMap,
} from '../utils/subname-discovery.logic.ts'

const STORAGE_PREFIX = 'rns-subnames:'
const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

// The Graph API key (set via Vite env)
const THEGRAPH_API_KEY = import.meta.env.VITE_THEGRAPH_API_KEY
const SUBGRAPH_ID = 'DhBgWdhFsujyqFmYqaTwUyyYm5QWBEhqVnBHek9JYPkn'

const GET_SUBDOMAINS_QUERY = `
  query GetSubdomains($nameContains: String!) {
    domains(where: { name_contains: $nameContains }) {
      id
      name
      labelName
      labelhash
      owner
      resolver {
        id
      }
    }
  }
`

// ─── LocalStorage helpers ───────────────────────────────────────────────────

function getStoredLabels(parentName) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + parentName)
        return raw ? normalizeStoredLabelMap(JSON.parse(raw)) : {}  // { labelHash: labelText }
    } catch {
        return {}
    }
}

function saveLabels(parentName, labels) {
    localStorage.setItem(STORAGE_PREFIX + parentName, JSON.stringify(labels))
}

// ─── The Graph Subgraph Fetcher ─────────────────────────────────────────────

/**
 * Fetch all subdomains directly from the RNS subgraph using fetch (POST).
 * Note: The subgraph doesn't index parent relationship, so we search by name
 * and filter client-side.
 *
 * @param {string} parentName - The parent domain name (e.g., "happy.rsk")
 * @returns {Promise<Array>} Array of subdomain objects with label, labelhash, owner
 */
async function fetchSubnamesFromSubgraph(parentName) {
    if (!THEGRAPH_API_KEY || !parentName) {
        console.warn('[useSubnames] Missing THEGRAPH_API_KEY or parentName:', { 
            hasApiKey: !!THEGRAPH_API_KEY, 
            parentName 
        })
        return []
    }

    console.log('[useSubnames] Fetching subnames from subgraph, parentName:', parentName)

    const url = `https://gateway-arbitrum.network.thegraph.com/api/${THEGRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`

    try {
        console.log('[useSubnames] Querying subgraph with POST:', url)
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: GET_SUBDOMAINS_QUERY,
                variables: { nameContains: parentName },
            }),
        })

        console.log('[useSubnames] Response status:', res.status)
        
        const result = await res.json()
        console.log('[useSubnames] Query result:', result)

        if (result.errors) {
            console.warn('[useSubnames] Subgraph query error:', result.errors)
            return []
        }

        const domains = result.data?.domains

        if (!Array.isArray(domains)) {
            console.warn('[useSubnames] Subgraph returned no domains:', result.data)
            return []
        }

        console.log('[useSubnames] Found domains before filter:', domains.length, domains)

        // Filter to only include subdomains (not the parent itself)
        // Subdomains have format: "label.parentName"
        const subdomains = domains.filter(d => 
            d.name && 
            d.name !== parentName && 
            d.name.endsWith('.' + parentName)
        )

        console.log('[useSubnames] Found subdomains after filter:', subdomains.length, subdomains)

        // Transform subgraph results into our format
        return subdomains.map(d => ({
            label: d.labelName || null,
            labelHash: d.labelhash || null,
            fullDomain: d.name || null,
            owner: d.owner || null,
            hasResolver: !!d.resolver?.id,
            subnodeHash: d.id,
        }))
    } catch (err) {
        console.warn('[useSubnames] Failed to fetch subnames:', err)
        return []
    }
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

    // Fetch subnames from The Graph subgraph
    useEffect(() => {
        console.log('[useSubnames] useEffect triggered:', { parentName, parentNode })
        
        if (!parentName || !parentNode) {
            console.log('[useSubnames] Skipping - missing parentName or parentNode')
            setDiscoveredSubnodes([])
            setLabelMap({})
            return
        }

        // Load known labels from localStorage (user overrides)
        const stored = getStoredLabels(parentName)
        console.log('[useSubnames] Stored labels:', stored)
        setLabelMap(stored)

        const optimisticSubnodes = buildOptimisticSubnodes(parentNode, stored)
        setDiscoveredSubnodes(optimisticSubnodes)

        // Fetch subnames from The Graph subgraph
        setIsFetching(true)
        fetchSubnamesFromSubgraph(parentName)
            .then(subdomains => {
                // Transform subgraph results into our format
                const nextSubnodes = subdomains.map(d => ({
                    labelHash: d.labelHash,
                    subnodeHash: d.subnodeHash,
                    label: d.label,                 // Direct from subgraph!
                    fullDomain: d.fullDomain,       // Full name from subgraph
                    subgraphOwner: d.owner,         // Owner from subgraph (may be stale)
                    hasResolver: d.hasResolver,
                }))
                setDiscoveredSubnodes(mergeDiscoveredSubnodes(nextSubnodes, optimisticSubnodes))

                // Merge labels: subgraph provides direct labels, localStorage takes precedence
                if (nextSubnodes.length > 0) {
                    const subgraphLabels = {}
                    for (const sub of nextSubnodes) {
                        if (sub.label && sub.labelHash) {
                            subgraphLabels[sub.labelHash] = sub.label
                        }
                    }
                    // Merge: localStorage/user entries take precedence over subgraph
                    const merged = { ...subgraphLabels, ...stored }
                    saveLabels(parentName, merged)
                    setLabelMap(merged)
                }
            })
            .catch(err => {
                console.warn('Failed to fetch subnames from subgraph:', err)
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

    // Second batch: fetch name from resolver text record for subnames that have a resolver
    const nameContracts = useMemo(() => {
        if (!results) return []
        return discoveredSubnodes.flatMap((sub, i) => {
            const resolver = results[i * 2 + 1]?.status === 'success' ? results[i * 2 + 1].result : null
            if (!resolver || resolver === ZERO_ADDR) return []
            return [{
                address: resolver,
                abi: RESOLVER_ABI,
                functionName: 'text',
                args: [sub.subnodeHash, 'name'],
                chainId: rootstock.id,
            }]
        })
    }, [results, discoveredSubnodes])

    const { data: nameResults } = useReadContracts({
        contracts: nameContracts,
        query: { enabled: nameContracts.length > 0 },
    })

    // Map subnodeHash → resolved name from text record
    const nameBySubnodeHash = useMemo(() => {
        const map = {}
        if (!nameResults || !results) return map
        let nameResultIdx = 0
        for (let i = 0; i < discoveredSubnodes.length; i++) {
            const sub = discoveredSubnodes[i]
            const resolver = results[i * 2 + 1]?.status === 'success' ? results[i * 2 + 1].result : null
            if (resolver && resolver !== ZERO_ADDR) {
                const r = nameResults[nameResultIdx]
                const nameVal = r?.status === 'success' ? r.result : null
                if (nameVal && typeof nameVal === 'string' && nameVal.trim()) {
                    map[sub.subnodeHash] = nameVal.trim()
                }
                nameResultIdx++
            }
        }
        return map
    }, [nameResults, results, discoveredSubnodes])

    // Build subnames array from results
    const subnames = discoveredSubnodes.map((sub, i) => {
        const ownerResult = results?.[i * 2]
        const resolverResult = results?.[i * 2 + 1]

        const owner = ownerResult?.status === 'success' ? ownerResult.result : null
        const resolver = resolverResult?.status === 'success' ? resolverResult.result : null

        // Look up human-readable label: localStorage/user first, then subgraph direct label, then resolver text("name"), then fallback to hash
        const label = labelMap[sub.labelHash] || sub.label || null
        const resolvedName = nameBySubnodeHash[sub.subnodeHash] // full name from resolver, e.g. "alice.happy.rsk"
        const resolvedLabel = resolvedName && resolvedName.includes('.')
            ? resolvedName.split('.')[0]
            : resolvedName

        const displayLabel = label || resolvedLabel
        const fullName = resolvedName || (displayLabel ? `${displayLabel}.${parentName}` : null) || sub.fullDomain || null
        const displayName = fullName || (sub.labelHash ? `[${sub.labelHash.slice(0, 10)}...].${parentName}` : `?.${parentName}`)

        return {
            labelHash: sub.labelHash,
            label: displayLabel,
            fullName,
            displayName,
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
                subnodeHash: buildOptimisticSubnodes(parentNode, { [labelHash]: normalized })[0]?.subnodeHash ?? null,
                label: normalized,  // We know the label since we're adding it
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
