import { useState } from 'react'
import { isAddress } from 'viem'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { useWriteRecord } from '../hooks/useWriteRecord'
import { RESOLVER_ABI } from '../contracts'
import { SUPPORTED_COINS, encodeAddress, validateAddress, getCoinName } from '../utils/coins'
import { supportedAddresses, getSupportedAddressByCoin } from '../utils/supportedChains'

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
                    {(() => {
                        const displayCoinTypes = new Set(SUPPORTED_COINS.map(c => c.coinType));
                        Object.keys(multiCoinAddresses).forEach(ct => displayCoinTypes.add(Number(ct)));

                        return Array.from(displayCoinTypes).map(coinType => {
                            let coin = SUPPORTED_COINS.find(c => c.coinType === coinType);
                            if (!coin) {
                                const sc = getSupportedAddressByCoin(coinType);
                                if (sc) {
                                    coin = {
                                        name: sc.label,
                                        symbol: sc.chainName.toUpperCase(),
                                        coinType: sc.coinType,
                                        icon: '❖'
                                    };
                                } else {
                                    coin = {
                                        name: getCoinName(coinType),
                                        symbol: `CT_${coinType}`,
                                        coinType: coinType,
                                        icon: '❖'
                                    };
                                }
                            }

                            const addr = multiCoinAddresses[coinType]
                            return (
                                <AddressRow
                                    key={coinType}
                                    coin={coin}
                                    address={addr}
                                    node={node}
                                    resolver={resolver}
                                    isOwner={isOwner}
                                    isConnected={isConnected}
                                    onSuccess={refetch}
                                />
                            )
                        })
                    })()}

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

    const label = `${coin.icon} ${coin.name.toUpperCase()}`

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
    const [selectedOption, setSelectedOption] = useState('')
    const [customCoinType, setCustomCoinType] = useState('')
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

        let ct;
        if (selectedOption === 'custom') {
            ct = parseInt(customCoinType, 10)
            if (isNaN(ct) || ct < 0) {
                setError('Enter a valid custom coin type number')
                return
            }
        } else {
            ct = parseInt(selectedOption, 10)
            if (isNaN(ct)) {
                setError('Please select a chain first')
                return
            }
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
            setSelectedOption('')
            setCustomCoinType('')
            setAddr('')
            reset()
            onSuccess?.()
        }, 1500)
    }

    const currentChain = selectedOption && selectedOption !== 'custom'
        ? getSupportedAddressByCoin(parseInt(selectedOption, 10))
        : null;
    const placeholder = currentChain?.placeholder || "Address";

    return (
        <form onSubmit={handleSubmit} className="add-record-form">
            <div className="add-record-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div className="input-wrap input-sm" style={{ minWidth: '150px' }}>
                    <select
                        className="input"
                        value={selectedOption}
                        onChange={(e) => { setSelectedOption(e.target.value); setError(''); reset() }}
                        style={{ cursor: 'pointer' }}
                    >
                        <option value="" disabled>Select Chain…</option>
                        {supportedAddresses.filter(c => !existingCoinTypes.includes(c.coinType)).map(c => (
                            <option key={c.coinType} value={c.coinType}>
                                {c.label}
                            </option>
                        ))}
                        <option value="custom">Custom Coin Type…</option>
                    </select>
                </div>
                {selectedOption === 'custom' && (
                    <div className="input-wrap input-sm" style={{ width: '120px' }}>
                        <input
                            className="input"
                            type="number"
                            value={customCoinType}
                            onChange={(e) => { setCustomCoinType(e.target.value); setError(''); reset() }}
                            placeholder="Coin type (e.g. 60)"
                            min="0"
                        />
                    </div>
                )}
                <div className="input-wrap" style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        className="input"
                        type="text"
                        value={addr}
                        onChange={(e) => { setAddr(e.target.value); setError(''); reset() }}
                        placeholder={placeholder}
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
