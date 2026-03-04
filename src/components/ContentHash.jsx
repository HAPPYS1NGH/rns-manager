import { useState } from 'react'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RESOLVER_ABI } from '../contracts'
import { encodeContentHash, validateContentHash, getContentHashProtocol } from '../utils/contenthash'

/**
 * ContentHash — Read/write content hash record
 */
export default function ContentHash({ nameData, isConnected }) {
    const { name, node, hasResolver, resolver, contentHash, isOwner, isLoadingRecords, refetch } = nameData

    if (!name || !hasResolver) return null

    const protocol = getContentHashProtocol(contentHash)

    return (
        <section className="card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> CONTENT HASH
                {protocol && <span className="protocol-badge">{protocol}</span>}
            </h2>

            {isLoadingRecords ? (
                <div className="loading-row">
                    <span className="spinner" />
                    <span>Loading content hash…</span>
                </div>
            ) : (
                <div className="records">
                    <ContentHashDisplay
                        contentHash={contentHash}
                        node={node}
                        resolver={resolver}
                        isOwner={isOwner}
                        isConnected={isConnected}
                        onSuccess={refetch}
                    />
                </div>
            )}
        </section>
    )
}

function ContentHashDisplay({ contentHash, node, resolver, isOwner, isConnected, onSuccess }) {
    const [editing, setEditing] = useState(false)
    const [newHash, setNewHash] = useState(contentHash || '')
    const [error, setError] = useState('')
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    const handleSave = () => {
        setError('')
        const validation = validateContentHash(newHash)
        if (!validation.valid) {
            setError(validation.error)
            return
        }
        try {
            const encoded = encodeContentHash(newHash.trim())
            write({
                address: resolver,
                abi: RESOLVER_ABI,
                functionName: 'setContenthash',
                args: [node, encoded],
            })
        } catch (err) {
            setError(err.message)
        }
    }

    const handleCancel = () => {
        setEditing(false)
        setNewHash(contentHash || '')
        setError('')
        reset()
    }

    if (isConfirmed && editing) {
        setTimeout(() => {
            setEditing(false)
            reset()
            onSuccess?.()
        }, 1500)
    }

    if (editing) {
        return (
            <div className="record-row record-row-editing">
                <span className="record-label">HASH</span>
                <div className="record-edit-area">
                    <div className="input-wrap">
                        <input
                            className="input"
                            type="text"
                            value={newHash}
                            onChange={(e) => { setNewHash(e.target.value); setError(''); reset() }}
                            placeholder="ipfs://Qm... or ipns://..."
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                    {error && <p className="field-error">{error}</p>}
                    <p className="hint">Supported: ipfs://, ipns://, bzz://, ar://, sia://</p>
                    <div className="action-row">
                        <button className="btn-primary btn-sm" onClick={handleSave} disabled={isWriting || isConfirming}>
                            {isWriting ? 'SIGN…' : isConfirming ? 'CONFIRMING…' : 'SAVE'}
                        </button>
                        <button className="btn-ghost btn-sm" onClick={handleCancel}>CANCEL</button>
                        {isConfirmed && <span className="status-ok">✓ Updated</span>}
                        {isWriteError && <span className="status-err">✗ {errorMessage}</span>}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <RecordRow
                label="HASH"
                value={contentHash}
                dim={!contentHash}
                dimText="(not set)"
                editable={isConnected && isOwner}
                onEdit={() => { setNewHash(contentHash || ''); setEditing(true) }}
                mono={true}
            />
            {contentHash && contentHash.startsWith('ipfs://') && (
                <p className="hint" style={{ paddingLeft: '176px', marginTop: '-8px' }}>
                    <a
                        href={`https://ipfs.io/ipfs/${contentHash.replace('ipfs://', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-inline"
                    >
                        View on IPFS Gateway →
                    </a>
                </p>
            )}
        </>
    )
}
