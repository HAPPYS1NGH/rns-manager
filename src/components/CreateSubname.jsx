import { useState } from 'react'
import { isAddress, keccak256, encodePacked, namehash } from 'viem'
import { normalize } from 'viem/ens'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { useSubnames } from '../hooks/useSubnames'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI, PUBLIC_RESOLVER_ADDRESS } from '../contracts'

/**
 * CreateSubname — Form to create a new subname under the parent name
 */
export default function CreateSubname({ nameData, isConnected }) {
    const { name: parentName, node: parentNode, isOwner, resolver: parentResolver } = nameData
    const { addLabel, refetch } = useSubnames(parentName)

    const [show, setShow] = useState(false)
    const [label, setLabel] = useState('')
    const [ownerAddr, setOwnerAddr] = useState('')
    const [autoResolver, setAutoResolver] = useState(true)
    const [error, setError] = useState('')

    // Write hooks for both operations
    const subnodeWrite = useWriteRecord()
    const resolverWrite = useWriteRecord()

    if (!parentName || !parentNode) return null

    const preview = label.trim() ? `${label.trim().toLowerCase()}.${parentName}` : ''

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')

        const trimmedLabel = label.trim().toLowerCase()
        if (!trimmedLabel) {
            setError('Label is required')
            return
        }
        if (/[.\s]/.test(trimmedLabel)) {
            setError('Label cannot contain dots or spaces')
            return
        }

        const targetOwner = ownerAddr.trim() || undefined
        if (targetOwner && !isAddress(targetOwner)) {
            setError('Not a valid EVM address')
            return
        }

        try {
            normalize(trimmedLabel)
        } catch {
            setError('Label contains unsupported characters')
            return
        }

        // Compute labelHash = keccak256(abi.encodePacked(string))
        const labelHash = keccak256(encodePacked(['string'], [trimmedLabel]))

        subnodeWrite.write({
            address: RNS_REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: 'setSubnodeOwner',
            args: [parentNode, labelHash, targetOwner || nameData.owner],
        })

        // Track the label in localStorage
        addLabel(trimmedLabel)
    }

    // When subnode creation is confirmed, optionally set resolver
    if (subnodeWrite.isConfirmed && autoResolver && parentResolver && resolverWrite.status === 'idle') {
        try {
            const fullName = `${label.trim().toLowerCase()}.${parentName}`
            const subnodeHash = namehash(normalize(fullName))
            resolverWrite.write({
                address: RNS_REGISTRY_ADDRESS,
                abi: REGISTRY_ABI,
                functionName: 'setResolver',
                args: [subnodeHash, parentResolver],
            })
        } catch (err) {
            console.warn('Failed to auto-set resolver:', err)
        }
    }

    // Full success: both done (or only subnode if auto-resolver is off)
    const fullSuccess = subnodeWrite.isConfirmed && (!autoResolver || resolverWrite.isConfirmed)

    if (fullSuccess) {
        setTimeout(() => {
            setShow(false)
            setLabel('')
            setOwnerAddr('')
            subnodeWrite.reset()
            resolverWrite.reset()
            refetch()
        }, 2000)
    }

    if (!show) {
        return (
            <PermissionGate isConnected={isConnected} isOwner={isOwner} action="create a subname">
                <button className="btn-add" onClick={() => setShow(true)}>
                    + Create Subname
                </button>
            </PermissionGate>
        )
    }

    const anyPending = subnodeWrite.isWriting || subnodeWrite.isConfirming || resolverWrite.isWriting || resolverWrite.isConfirming

    return (
        <PermissionGate isConnected={isConnected} isOwner={isOwner} action="create a subname">
            <section className="card create-subname-card">
                <h2 className="card-title">
                    <span className="title-icon">▸</span> CREATE SUBNAME
                </h2>

                <form onSubmit={handleSubmit} className="create-subname-form">
                    {/* Label */}
                    <label className="field-label">LABEL</label>
                    <div className="input-row">
                        <div className="input-wrap">
                            <input
                                className="input"
                                type="text"
                                value={label}
                                onChange={(e) => { setLabel(e.target.value); setError(''); subnodeWrite.reset(); resolverWrite.reset() }}
                                placeholder="alice"
                                spellCheck={false}
                                autoComplete="off"
                            />
                        </div>
                        <span className="subname-preview">.{parentName}</span>
                    </div>
                    {preview && <p className="hint">Will create: <span className="mono">{preview}</span></p>}

                    {/* Owner */}
                    <label className="field-label">OWNER ADDRESS (optional, defaults to you)</label>
                    <div className="input-wrap">
                        <input
                            className="input"
                            type="text"
                            value={ownerAddr}
                            onChange={(e) => { setOwnerAddr(e.target.value); setError('') }}
                            placeholder="0x... (defaults to your wallet)"
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>

                    {/* Auto-set resolver */}
                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={autoResolver}
                            onChange={(e) => setAutoResolver(e.target.checked)}
                        />
                        <span>Auto-set resolver (uses parent's resolver)</span>
                    </label>

                    {error && <p className="field-error">{error}</p>}

                    <div className="action-row">
                        <button className="btn-primary" type="submit" disabled={anyPending}>
                            {subnodeWrite.isWriting ? 'SIGN CREATION…'
                                : subnodeWrite.isConfirming ? 'CONFIRMING CREATION…'
                                    : resolverWrite.isWriting ? 'SIGN RESOLVER…'
                                        : resolverWrite.isConfirming ? 'CONFIRMING RESOLVER…'
                                            : 'CREATE SUBNAME'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => { setShow(false); subnodeWrite.reset(); resolverWrite.reset() }}>
                            CANCEL
                        </button>
                    </div>

                    {/* Status */}
                    {subnodeWrite.isConfirmed && !resolverWrite.isConfirmed && autoResolver && (
                        <span className="status-ok">✓ Subname created — setting resolver…</span>
                    )}
                    {fullSuccess && (
                        <span className="status-ok">✓ Subname created{autoResolver ? ' + resolver set' : ''}</span>
                    )}
                    {(subnodeWrite.isWriteError || resolverWrite.isWriteError) && (
                        <span className="status-err">
                            ✗ {subnodeWrite.errorMessage || resolverWrite.errorMessage}
                        </span>
                    )}
                </form>
            </section>
        </PermissionGate>
    )
}
