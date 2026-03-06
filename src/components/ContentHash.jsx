import { useState } from 'react'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RESOLVER_ABI } from '../contracts'
import { encodeContentHash, validateContentHash, getContentHashProtocol, getSupportedProtocols } from '../utils/contenthash'

const SUPPORTED_PROTOCOLS = getSupportedProtocols()

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

                    {!contentHash && (
                        <PermissionGate isConnected={isConnected} isOwner={isOwner} action="set a content hash">
                            <SetContentHashButton
                                node={node}
                                resolver={resolver}
                                onSuccess={refetch}
                            />
                        </PermissionGate>
                    )}
                </div>
            )}
        </section>
    )
}

function ContentHashDisplay({ contentHash, node, resolver, isOwner, isConnected, onSuccess }) {
    const [editing, setEditing] = useState(false)
    const [newHash, setNewHash] = useState(contentHash || '')
    const [protocol, setProtocol] = useState('ipfs')
    const [error, setError] = useState('')
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    const currentProtocol = getContentHashProtocol(contentHash)

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

    const handleClear = () => {
        write({
            address: resolver,
            abi: RESOLVER_ABI,
            functionName: 'setContenthash',
            args: [node, '0x'],
        })
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
                    <div className="input-row">
                        <select
                            className="input protocol-select"
                            value={protocol}
                            onChange={(e) => setProtocol(e.target.value)}
                        >
                            {SUPPORTED_PROTOCOLS.map((p) => (
                                <option key={p} value={p}>{p.toUpperCase()}</option>
                            ))}
                        </select>
                        <input
                            className="input"
                            type="text"
                            value={newHash}
                            onChange={(e) => { setNewHash(e.target.value); setError(''); reset() }}
                            placeholder={getPlaceholder(protocol)}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                    {error && <p className="field-error">{error}</p>}
                    <p className="hint">{getHint(protocol)}</p>
                    <div className="action-row">
                        <button className="btn-primary btn-sm" onClick={handleSave} disabled={isWriting || isConfirming}>
                            {isWriting ? 'SIGN…' : isConfirming ? 'CONFIRMING…' : 'SAVE'}
                        </button>
                        {currentProtocol && (
                            <button className="btn-danger btn-sm" onClick={handleClear} disabled={isWriting || isConfirming}>
                                CLEAR
                            </button>
                        )}
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

function getPlaceholder(protocol) {
    const placeholders = {
        ipfs: 'Qm... or bafy...',
        swarm: '0x...',
        onion: '16 character base32',
        onion3: '56 character base32',
        ipns: 'k51...',
    }
    return placeholders[protocol] || 'Enter content hash'
}

function getHint(protocol) {
    const hints = {
        ipfs: 'Paste an IPFS CID (Qm... or bafy...)',
        swarm: 'Paste a Swarm hash (0x...)',
        onion: 'Paste an Onion address (16 characters)',
        onion3: 'Paste an Onion3 address (56 characters)',
        ipns: 'Paste an IPNS name',
    }
    return hints[protocol] || 'Enter content hash'
}

function SetContentHashButton({ node, resolver, onSuccess }) {
    const [show, setShow] = useState(false)
    const [value, setValue] = useState('')
    const [protocol, setProtocol] = useState('ipfs')
    const [error, setError] = useState('')
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    if (!show) {
        return (
            <button className="btn-add" onClick={() => setShow(true)}>
                + Set Content Hash
            </button>
        )
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        const validation = validateContentHash(value)
        if (!validation.valid) {
            setError(validation.error)
            return
        }
        try {
            const encoded = encodeContentHash(value.trim())
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

    if (isConfirmed) {
        setTimeout(() => {
            setShow(false)
            setValue('')
            reset()
            onSuccess?.()
        }, 1500)
    }

    return (
        <form onSubmit={handleSubmit} className="add-record-form">
            <div className="input-row">
                <select
                    className="input protocol-select"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                >
                    {SUPPORTED_PROTOCOLS.map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                    ))}
                </select>
                <input
                    className="input"
                    type="text"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(''); reset() }}
                    placeholder={getPlaceholder(protocol)}
                    spellCheck={false}
                    autoComplete="off"
                />
            </div>
            {error && <p className="field-error">{error}</p>}
            <p className="hint">{getHint(protocol)}</p>
            <div className="action-row">
                <button className="btn-primary btn-sm" type="submit" disabled={isWriting || isConfirming}>
                    {isWriting ? 'SIGN…' : isConfirming ? 'CONFIRMING…' : 'SET CONTENT HASH'}
                </button>
                <button className="btn-ghost btn-sm" type="button" onClick={() => { setShow(false); setValue(''); setError(''); reset() }}>
                    CANCEL
                </button>
                {isConfirmed && <span className="status-ok">✓ Saved</span>}
                {isWriteError && <span className="status-err">✗ {errorMessage}</span>}
            </div>
        </form>
    )
}
