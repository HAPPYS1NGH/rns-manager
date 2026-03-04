import { useState } from 'react'
import { isAddress } from 'viem'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RESOLVER_ABI } from '../contracts'
import { SUPPORTED_COINS, encodeAddress, validateAddress, getCoinName } from '../utils/coins'

/**
 * AddressRecords — Read/write multi-coin addresses
 */
export default function AddressRecords({ nameData, isConnected }) {
    const { name, node, hasResolver, resolver, multiCoinAddresses, isOwner, isLoadingRecords, refetch } = nameData

    if (!name || !hasResolver) return null

    const hasAnyAddress = Object.keys(multiCoinAddresses).length > 0

    return (
        <section className="card">
            <h2 className="card-title">
                <span className="title-icon">▸</span> ADDRESSES
            </h2>

            {isLoadingRecords ? (
                <div className="loading-row">
                    <span className="spinner" />
                    <span>Loading addresses…</span>
                </div>
            ) : (
                <div className="records">
                    {SUPPORTED_COINS.map(coin => {
                        const addr = multiCoinAddresses[coin.coinType]
                        return (
                            <AddressRow
                                key={coin.coinType}
                                coin={coin}
                                address={addr}
                                node={node}
                                resolver={resolver}
                                isOwner={isOwner}
                                isConnected={isConnected}
                                onSuccess={refetch}
                            />
                        )
                    })}

                    {/* Add custom coin type */}
                    <PermissionGate isConnected={isConnected} isOwner={isOwner} action="add an address">
                        <AddAddressForm
                            node={node}
                            resolver={resolver}
                            existingCoinTypes={Object.keys(multiCoinAddresses).map(Number)}
                            onSuccess={refetch}
                        />
                    </PermissionGate>
                </div>
            )}
        </section>
    )
}

// ─── Single Address Row ─────────────────────────────────────────────────────

function AddressRow({ coin, address, node, resolver, isOwner, isConnected, onSuccess }) {
    const [editing, setEditing] = useState(false)
    const [newAddr, setNewAddr] = useState(address || '')
    const [error, setError] = useState('')
    const { write, status, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    const handleSave = () => {
        setError('')
        const validation = validateAddress(coin.coinType, newAddr)
        if (!validation.valid) {
            setError(validation.error)
            return
        }

        const encoded = encodeAddress(coin.coinType, newAddr.trim())
        write({
            address: resolver,
            abi: RESOLVER_ABI,
            functionName: 'setAddr',
            args: [node, BigInt(coin.coinType), encoded],
        })
    }

    const handleCancel = () => {
        setEditing(false)
        setNewAddr(address || '')
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

    const label = `${coin.icon} ${coin.name.toUpperCase()} (${coin.coinType})`

    if (editing) {
        return (
            <div className="record-row record-row-editing">
                <span className="record-label">{label}</span>
                <div className="record-edit-area">
                    <div className="input-wrap">
                        <input
                            className="input"
                            type="text"
                            value={newAddr}
                            onChange={(e) => { setNewAddr(e.target.value); setError(''); reset() }}
                            placeholder={`${coin.symbol} address`}
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                    {error && <p className="field-error">{error}</p>}
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
            label={label}
            value={address}
            dim={!address}
            dimText="(not set)"
            editable={isConnected && isOwner}
            onEdit={() => { setNewAddr(address || ''); setEditing(true) }}
        />
    )
}

// ─── Add Address Form ───────────────────────────────────────────────────────

function AddAddressForm({ node, resolver, existingCoinTypes, onSuccess }) {
    const [show, setShow] = useState(false)
    const [coinType, setCoinType] = useState('')
    const [addr, setAddr] = useState('')
    const [error, setError] = useState('')
    const { write, isWriting, isConfirming, isConfirmed, isWriteError, errorMessage, reset } = useWriteRecord()

    if (!show) {
        return (
            <button className="btn-add" onClick={() => setShow(true)}>
                + Add Address
            </button>
        )
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setError('')
        const ct = parseInt(coinType, 10)
        if (isNaN(ct) || ct < 0) {
            setError('Enter a valid coin type number')
            return
        }
        const validation = validateAddress(ct, addr)
        if (!validation.valid) {
            setError(validation.error)
            return
        }

        const encoded = encodeAddress(ct, addr.trim())
        write({
            address: resolver,
            abi: RESOLVER_ABI,
            functionName: 'setAddr',
            args: [node, BigInt(ct), encoded],
        })
    }

    if (isConfirmed) {
        setTimeout(() => {
            setShow(false)
            setCoinType('')
            setAddr('')
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
                        type="number"
                        value={coinType}
                        onChange={(e) => { setCoinType(e.target.value); setError(''); reset() }}
                        placeholder="Coin type (e.g. 60)"
                        min="0"
                    />
                </div>
                <div className="input-wrap">
                    <input
                        className="input"
                        type="text"
                        value={addr}
                        onChange={(e) => { setAddr(e.target.value); setError(''); reset() }}
                        placeholder="Address"
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>
            </div>
            {error && <p className="field-error">{error}</p>}
            <div className="action-row">
                <button className="btn-primary btn-sm" type="submit" disabled={isWriting || isConfirming}>
                    {isWriting ? 'SIGN…' : isConfirming ? 'CONFIRMING…' : 'SET ADDRESS'}
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
