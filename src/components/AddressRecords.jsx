import { useCallback, useEffect, useMemo, useState } from 'react'
import { simulateContract, waitForTransactionReceipt, writeContract } from '@wagmi/core'
import { rootstock } from 'viem/chains'
import { useConfig } from 'wagmi'
import RecordRow from './RecordRow'
import PermissionGate from './PermissionGate'
import { RESOLVER_ABI } from '../contracts'
import { SUPPORTED_COINS, buildMulticallSetAddrCalls, validateAddress, getCoinName } from '../utils/coins'
import { supportedAddresses, getSupportedAddressByCoin } from '../utils/supportedChains'
import {
    buildAddressMap,
    createAddressDrafts,
    getChangedAddressRecords,
    upsertAddressDraft,
} from '../utils/address-records.logic.ts'

/**
 * AddressRecords — Read/write multi-coin addresses
 */
export default function AddressRecords({ nameData, isConnected }) {
    const { name, node, hasResolver, resolver, multiCoinAddresses, isOwner, isLoadingRecords, refetch } = nameData
    const config = useConfig()

    if (!name || !hasResolver) return null

    const initialRecords = useMemo(
        () => Object.entries(multiCoinAddresses || {}).map(([coinType, value]) => ({
            coinType: Number(coinType),
            value,
        })),
        [multiCoinAddresses],
    )
    const initialAddressMap = useMemo(() => buildAddressMap(initialRecords), [initialRecords])
    const [drafts, setDrafts] = useState(() => createAddressDrafts(supportedAddresses, initialRecords))
    const [fieldErrors, setFieldErrors] = useState({})
    const [saveState, setSaveState] = useState({
        status: 'idle',
        currentIndex: -1,
        total: 0,
        currentLabel: '',
        errorMessage: '',
    })

    useEffect(() => {
        setDrafts(createAddressDrafts(supportedAddresses, initialRecords))
        setFieldErrors({})
        setSaveState({
            status: 'idle',
            currentIndex: -1,
            total: 0,
            currentLabel: '',
            errorMessage: '',
        })
    }, [initialRecords])

    const hasAnyAddress = drafts.length > 0
    const draftCoinTypes = useMemo(() => drafts.map(draft => draft.coinType), [drafts])
    const pendingRecords = useMemo(
        () => getChangedAddressRecords(drafts, initialRecords),
        [drafts, initialRecords],
    )
    const isSaving = saveState.status === 'saving'

    const upsertDraft = useCallback((coinType, value) => {
        const normalizedValue = value.trim()
        const supported = getSupportedAddressByCoin(coinType)
        if (!supported) return

        setDrafts(prev => {
            const existing = prev.find(draft => draft.coinType === coinType)
            const nextDraft = {
                coinType,
                value: normalizedValue,
                chainName: supported.chainName,
                label: supported.label,
                placeholder: supported.placeholder,
                chainId: supported.chainId,
                isEvm: supported.isEvm,
                isDirty: (initialAddressMap[coinType]?.value ?? '') !== normalizedValue,
                isNew: !initialAddressMap[coinType],
            }

            return existing
                ? upsertAddressDraft(prev, nextDraft)
                : upsertAddressDraft(prev, nextDraft)
        })

        setFieldErrors(prev => {
            const next = { ...prev }
            delete next[coinType]
            return next
        })
        setSaveState(prev => prev.status === 'idle' ? prev : {
            status: 'idle',
            currentIndex: -1,
            total: 0,
            currentLabel: '',
            errorMessage: '',
        })
    }, [initialAddressMap])

    const resetDraft = useCallback((coinType) => {
        const initial = initialAddressMap[coinType]
        if (!initial) {
            setDrafts(prev => prev.filter(draft => draft.coinType !== coinType))
        } else {
            upsertDraft(coinType, initial.value)
            setDrafts(prev => prev.map(draft => draft.coinType === coinType ? {
                ...draft,
                value: initial.value,
                isDirty: false,
                isNew: false,
            } : draft))
        }

        setFieldErrors(prev => {
            const next = { ...prev }
            delete next[coinType]
            return next
        })
    }, [initialAddressMap, upsertDraft])

    const handleAddDraft = useCallback((coinType, value) => {
        upsertDraft(coinType, value)
    }, [upsertDraft])

    const handleSaveAll = useCallback(async () => {
        if (pendingRecords.length === 0 || isSaving) return

        const nextErrors = {}
        for (const record of pendingRecords) {
            const validation = validateAddress(record.coinType, record.value)
            if (!validation.valid) {
                nextErrors[record.coinType] = validation.error
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors)
            setSaveState({
                status: 'error',
                currentIndex: -1,
                total: pendingRecords.length,
                currentLabel: '',
                errorMessage: 'Fix the invalid addresses before saving.',
            })
            return
        }

        try {
            setSaveState({
                status: 'saving',
                currentIndex: 0,
                total: pendingRecords.length,
                currentLabel: `${pendingRecords.length} update${pendingRecords.length === 1 ? '' : 's'}`,
                errorMessage: '',
            })

            const simulation = await simulateContract(config, {
                address: resolver,
                abi: RESOLVER_ABI,
                functionName: 'multicall',
                args: [buildMulticallSetAddrCalls(node, pendingRecords)],
                chainId: rootstock.id,
            })

            const hash = await writeContract(config, simulation.request)
            await waitForTransactionReceipt(config, {
                hash,
                chainId: rootstock.id,
            })

            await refetch?.()
            setSaveState({
                status: 'confirmed',
                currentIndex: 0,
                total: pendingRecords.length,
                currentLabel: '',
                errorMessage: '',
            })
        } catch (err) {
            setSaveState(prev => ({
                ...prev,
                status: 'error',
                errorMessage: err?.shortMessage ?? err?.message ?? 'Failed to save addresses.',
            }))
        }
    }, [config, isSaving, node, pendingRecords, refetch, resolver])

    const handleResetAll = useCallback(() => {
        setDrafts(createAddressDrafts(supportedAddresses, initialRecords))
        setFieldErrors({})
        setSaveState({
            status: 'idle',
            currentIndex: -1,
            total: 0,
            currentLabel: '',
            errorMessage: '',
        })
    }, [initialRecords])

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
                    {hasAnyAddress ? drafts.map((draft) => {
                        let coin = SUPPORTED_COINS.find(c => c.coinType === draft.coinType)
                        if (!coin) {
                            coin = {
                                name: draft.label,
                                symbol: draft.chainName.toUpperCase(),
                                coinType: draft.coinType,
                                icon: draft.isEvm ? '◈' : '❖',
                            }
                        }

                        return (
                            <AddressRow
                                key={draft.coinType}
                                coin={coin}
                                draft={draft}
                                originalAddress={initialAddressMap[draft.coinType]?.value ?? ''}
                                isOwner={isOwner}
                                isConnected={isConnected}
                                isSaving={isSaving}
                                saveState={saveState}
                                fieldError={fieldErrors[draft.coinType]}
                                onCommit={upsertDraft}
                                onReset={resetDraft}
                            />
                        )
                    }) : (
                        <div className="empty-state">
                            <span className="empty-icon">◌</span>
                            <span>No addresses added yet.</span>
                        </div>
                    )}

                    {/* Add custom coin type */}
                    <PermissionGate isConnected={isConnected} isOwner={isOwner} action="add an address">
                        <AddAddressForm
                            existingCoinTypes={draftCoinTypes}
                            onAddDraft={handleAddDraft}
                            disabled={isSaving}
                        />
                        <div className="action-row address-save-row">
                            <button
                                className="btn-primary btn-sm"
                                onClick={handleSaveAll}
                                disabled={isSaving || pendingRecords.length === 0}
                            >
                                {isSaving ? 'Saving changes…' : 'Save changes'}
                            </button>
                            <button
                                className="btn-ghost btn-sm"
                                onClick={handleResetAll}
                                disabled={isSaving || pendingRecords.length === 0}
                            >
                                Discard
                            </button>
                            {saveState.status === 'saving' && (
                                <span className="status-pending">{saveState.currentLabel} in progress…</span>
                            )}
                            {saveState.status === 'confirmed' && (
                                <span className="status-ok">✓ Changes saved</span>
                            )}
                            {saveState.status === 'error' && saveState.errorMessage && (
                                <span className="status-err">✗ {saveState.errorMessage}</span>
                            )}
                        </div>
                    </PermissionGate>
                </div>
            )}
        </section>
    )
}

// ─── Single Address Row ─────────────────────────────────────────────────────

function AddressRow({
    coin,
    draft,
    originalAddress,
    isOwner,
    isConnected,
    isSaving,
    saveState,
    fieldError,
    onCommit,
    onReset,
}) {
    const [editing, setEditing] = useState(false)
    const [newAddr, setNewAddr] = useState(draft.value || '')
    const [error, setError] = useState('')

    useEffect(() => {
        setNewAddr(draft.value || '')
        if (fieldError) {
            setError(fieldError)
        } else if (!editing) {
            setError('')
        }
    }, [draft.value, editing, fieldError])

    useEffect(() => {
        if (draft.isNew && !isSaving) {
            setEditing(true)
        }
    }, [draft.isNew, isSaving])

    const handleDone = () => {
        setError('')
        console.info('[AddressRow] Updating staged address record', {
            coinType: coin.coinType,
            coinName: coin.name,
            addressInput: newAddr.trim(),
        })

        const validation = validateAddress(coin.coinType, newAddr)
        if (!validation.valid) {
            console.warn('[AddressRow] Staged address validation failed', {
                coinType: coin.coinType,
                coinName: coin.name,
                addressInput: newAddr.trim(),
                validationError: validation.error,
            })
            setError(validation.error)
            return
        }

        onCommit(coin.coinType, newAddr.trim())
        setEditing(false)
    }

    const handleCancel = () => {
        setEditing(false)
        setNewAddr(originalAddress || '')
        setError('')
        onReset(coin.coinType)
    }

    const label = `${coin.icon} ${coin.name.toUpperCase()}`
    const isCurrentSave = isSaving && saveState.currentLabel === getCoinName(coin.coinType)

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
                            onChange={(e) => { setNewAddr(e.target.value); setError('') }}
                            placeholder={`${coin.symbol} address`}
                            spellCheck={false}
                            autoComplete="off"
                            disabled={isSaving}
                        />
                    </div>
                    {error && <p className="field-error">{error}</p>}
                    <div className="action-row">
                        <button className="btn-primary btn-sm" onClick={handleDone} disabled={isSaving}>
                            DONE
                        </button>
                        <button className="btn-ghost btn-sm" onClick={handleCancel} disabled={isSaving}>CANCEL</button>
                        {draft.isDirty && <span className="status-pending">Unsaved</span>}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="address-row-stack">
            <RecordRow
                label={label}
                value={draft.value}
                dim={!draft.value}
                dimText="(not set)"
                editable={isConnected && isOwner && !isSaving}
                onEdit={() => { setNewAddr(draft.value || ''); setEditing(true) }}
            />
            {(draft.isDirty || isCurrentSave) && (
                <div className="address-row-meta">
                    <span className="status-pending">
                        {isCurrentSave ? 'Saving now…' : 'Unsaved'}
                    </span>
                </div>
            )}
        </div>
    )
}

// ─── Add Address Form ───────────────────────────────────────────────────────

function AddAddressForm({ existingCoinTypes, onAddDraft, disabled = false }) {
    const [show, setShow] = useState(false)
    const [selectedOption, setSelectedOption] = useState('')
    const [customCoinType, setCustomCoinType] = useState('')
    const [addr, setAddr] = useState('')
    const [error, setError] = useState('')

    if (!show) {
        return (
            <button className="btn-add" onClick={() => setShow(true)} disabled={disabled}>
                Add address
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
        console.info('[AddAddressForm] Staging address record', {
            coinType: ct,
            addressInput: addr.trim(),
        })
        if (!validation.valid) {
            console.warn('[AddAddressForm] Staged address validation failed', {
                coinType: ct,
                addressInput: addr.trim(),
                validationError: validation.error,
            })
            setError(validation.error)
            return
        }

        onAddDraft(ct, addr.trim())
        setShow(false)
        setSelectedOption('')
        setCustomCoinType('')
        setAddr('')
        setError('')
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
                        onChange={(e) => { setSelectedOption(e.target.value); setError('') }}
                        style={{ cursor: 'pointer' }}
                        disabled={disabled}
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
                            onChange={(e) => { setCustomCoinType(e.target.value); setError('') }}
                            placeholder="Coin type (e.g. 60)"
                            min="0"
                            disabled={disabled}
                        />
                    </div>
                )}
                <div className="input-wrap" style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        className="input"
                        type="text"
                        value={addr}
                        onChange={(e) => { setAddr(e.target.value); setError('') }}
                        placeholder={placeholder}
                        spellCheck={false}
                        autoComplete="off"
                        disabled={disabled}
                    />
                </div>
            </div>
            {error && <p className="field-error">{error}</p>}
            <div className="action-row">
                <button className="btn-primary btn-sm" type="submit" disabled={disabled}>
                    Add
                </button>
                <button
                    className="btn-ghost btn-sm"
                    type="button"
                    onClick={() => {
                        setShow(false)
                        setSelectedOption('')
                        setCustomCoinType('')
                        setAddr('')
                        setError('')
                    }}
                    disabled={disabled}
                >
                    CANCEL
                </button>
            </div>
        </form>
    )
}
