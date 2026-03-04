import { useState } from 'react'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RESOLVER_ABI } from '../contracts'
import { TEXT_KEYS } from '../hooks/useNameData'

// Suggestions for common text record keys
const KEY_SUGGESTIONS = [
    'avatar', 'name', 'description', 'url',
    'com.twitter', 'com.github', 'com.discord', 'email',
    'notice', 'location', 'keywords', 'header',
]

/**
 * TextRecords — Read/write text records panel
 */
export default function TextRecords({ nameData, isConnected }) {
    const { name, node, hasResolver, resolver, textRecords, isOwner, isLoadingRecords, refetch } = nameData

    if (!name || !hasResolver) return null

    const recordEntries = Object.entries(textRecords)
    const hasRecords = recordEntries.length > 0

    return (
        <section className="card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> TEXT RECORDS
            </h2>

            {isLoadingRecords ? (
                <div className="loading-row">
                    <span className="spinner" />
                    <span>Loading text records…</span>
                </div>
            ) : (
                <div className="records">
                    {!hasRecords && (
                        <div className="empty-state">
                            <span className="empty-icon">◌</span>
                            <p>No text records set</p>
                        </div>
                    )}

                    {recordEntries.map(([key, value]) => (
                        <TextRecordRow
                            key={key}
                            recordKey={key}
                            recordValue={value}
                            node={node}
                            resolver={resolver}
                            isOwner={isOwner}
                            isConnected={isConnected}
                            onSuccess={refetch}
                        />
                    ))}

                    <PermissionGate isConnected={isConnected} isOwner={isOwner} action="add a text record">
                        <AddTextRecordForm
                            node={node}
                            resolver={resolver}
                            existingKeys={recordEntries.map(([k]) => k)}
                            onSuccess={refetch}
                        />
                    </PermissionGate>
                </div>
            )}
        </section>
    )
}

// ─── Single Text Record Row ────────────────────────────────────────────────

function TextRecordRow({ recordKey, recordValue, node, resolver, isOwner, isConnected, onSuccess }) {
    const [editing, setEditing] = useState(false)
    const [newValue, setNewValue] = useState(recordValue)
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    const handleSave = () => {
        write({
            address: resolver,
            abi: RESOLVER_ABI,
            functionName: 'setText',
            args: [node, recordKey, newValue],
        })
    }

    const handleCancel = () => {
        setEditing(false)
        setNewValue(recordValue)
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
                <span className="record-label">{recordKey.toUpperCase()}</span>
                <div className="record-edit-area">
                    <div className="input-wrap">
                        <input
                            className="input"
                            type="text"
                            value={newValue}
                            onChange={(e) => { setNewValue(e.target.value); reset() }}
                            placeholder={`Value for ${recordKey}`}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
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
        <RecordRow
            label={recordKey.toUpperCase()}
            value={recordValue}
            editable={isConnected && isOwner}
            onEdit={() => { setNewValue(recordValue); setEditing(true) }}
            mono={false}
        />
    )
}

// ─── Add Text Record Form ──────────────────────────────────────────────────

function AddTextRecordForm({ node, resolver, existingKeys, onSuccess }) {
    const [show, setShow] = useState(false)
    const [key, setKey] = useState('')
    const [value, setValue] = useState('')
    const [error, setError] = useState('')
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    // Filter out keys that already have values
    const availableSuggestions = KEY_SUGGESTIONS.filter(k => !existingKeys.includes(k))

    if (!show) {
        return (
            <button className="btn-add" onClick={() => setShow(true)}>
                + Add Text Record
            </button>
        )
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        if (!key.trim()) {
            setError('Key is required')
            return
        }
        if (!value.trim()) {
            setError('Value is required')
            return
        }
        write({
            address: resolver,
            abi: RESOLVER_ABI,
            functionName: 'setText',
            args: [node, key.trim(), value.trim()],
        })
    }

    if (isConfirmed) {
        setTimeout(() => {
            setShow(false)
            setKey('')
            setValue('')
            reset()
            onSuccess?.()
        }, 1500)
    }

    return (
        <form onSubmit={handleSubmit} className="add-record-form">
            <div className="add-record-row">
                <div className="input-wrap input-sm">
                    <input
                        className="input"
                        list="text-key-suggestions"
                        type="text"
                        value={key}
                        onChange={(e) => { setKey(e.target.value); setError(''); reset() }}
                        placeholder="Key (e.g. avatar)"
                        spellCheck={false}
                        autoComplete="off"
                    />
                    <datalist id="text-key-suggestions">
                        {availableSuggestions.map(k => (
                            <option key={k} value={k} />
                        ))}
                    </datalist>
                </div>
                <div className="input-wrap">
                    <input
                        className="input"
                        type="text"
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setError(''); reset() }}
                        placeholder="Value"
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
            </div>
            {error && <p className="field-error">{error}</p>}
            <div className="action-row">
                <button className="btn-primary btn-sm" type="submit" disabled={isWriting || isConfirming}>
                    {isWriting ? 'SIGN…' : isConfirming ? 'CONFIRMING…' : 'SET RECORD'}
                </button>
                <button className="btn-ghost btn-sm" type="button" onClick={() => { setShow(false); reset() }}>
                    CANCEL
                </button>
                {isConfirmed && <span className="status-ok">✓ Saved</span>}
                {isWriteError && <span className="status-err">✗ {errorMessage}</span>}
            </div>
        </form>
    )
}
