import { useState } from 'react'
import { isAddress } from 'viem'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI, RESOLVER_ABI, PUBLIC_RESOLVER_ADDRESS } from '../contracts'

/**
 * RecordsCard — Core name info: owner, resolver, RSK address
 * When showAdvanced is true, shows resolver and set resolver form
 */
export default function RecordsCard({ nameData, isConnected, showAdvanced = false }) {
    const {
        name, node, nameExists, owner, resolver, hasResolver,
        rskAddress, isLoading, isOwner,
    } = nameData

    if (!name) return null

    return (
        <section className="card records-card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> RECORDS
            </h2>

            {isLoading ? (
                <div className="loading-row">
                    <span className="spinner" />
                    <span>Querying Rootstock mainnet…</span>
                </div>
            ) : !nameExists ? (
                <div className="empty-state">
                    <span className="empty-icon">◌</span>
                    <p>Name not found in the RNS registry</p>
                </div>
            ) : (
                <div className="records">
                    <RecordRow label="OWNER" value={owner} />
                    
                    {showAdvanced && (
                        <>
                            <RecordRow
                                label="RESOLVER"
                                value={hasResolver ? resolver : null}
                                dim={!hasResolver}
                                dimText="(no resolver set)"
                            />
                            <RecordRow
                                label="RSK ADDRESS"
                                value={rskAddress}
                                dim={!rskAddress}
                                dimText="(not set)"
                            />
                        </>
                    )}

                    {showAdvanced && nameExists && !hasResolver && (
                        <PermissionGate isConnected={isConnected} isOwner={isOwner} action="set a resolver">
                            <SetResolverForm node={node} />
                        </PermissionGate>
                    )}
                </div>
            )}
        </section>
    )
}

// ─── Sub-component: Set Resolver Form ───────────────────────────────────────

function SetResolverForm({ node }) {
    const [resolverAddr, setResolverAddr] = useState(PUBLIC_RESOLVER_ADDRESS)
    const [error, setError] = useState('')
    const { write, status, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        if (!isAddress(resolverAddr)) {
            setError('Not a valid address')
            return
        }
        write({
            address: RNS_REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: 'setResolver',
            args: [node, resolverAddr],
        })
    }

    return (
        <div className="set-resolver-block">
            <p className="hint hint-warn">⚠ No resolver is set — assign one to manage records.</p>
            <form onSubmit={handleSubmit} className="inline-form">
                <label className="field-label">RESOLVER ADDRESS</label>
                <div className="input-wrap">
                    <input
                        className="input"
                        type="text"
                        value={resolverAddr}
                        onChange={(e) => { setResolverAddr(e.target.value); setError(''); reset() }}
                        placeholder="0x..."
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
                {error && <p className="field-error">{error}</p>}
                <div className="action-row">
                    <button className="btn-primary" type="submit" disabled={isWriting || isConfirming}>
                        {isWriting ? 'CONFIRM IN WALLET…' : isConfirming ? 'CONFIRMING TX…' : 'SET RESOLVER'}
                    </button>
                    {isConfirmed && <span className="status-ok">✓ Resolver set on-chain</span>}
                    {isWriteError && <span className="status-err">✗ {errorMessage}</span>}
                </div>
            </form>
        </div>
    )
}
