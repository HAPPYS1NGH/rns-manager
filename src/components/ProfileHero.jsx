import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useSetPrimaryName } from '../hooks/useSetPrimaryName'

export default function ProfileHero({ name, nameData }) {
    const { owner, textRecords, nameExists, isLoading, isOwner } = nameData
    const { address: connectedAddress, isConnected } = useAccount()
    const [copied, setCopied] = useState(false)

    const ensName = name ? name.replace('.rsk', '.rsk.eth') : ''
    const displayName = textRecords?.name || name?.replace('.rsk', '')

    // Handle success - show a temporary success state
    const handleSuccess = useCallback(() => {
        console.info('[ProfileHero] Primary name transaction confirmed', {
            ensName,
            owner,
            connectedAddress,
        })
    }, [ensName, owner, connectedAddress])

    const handleError = useCallback((err) => {
        console.error('[ProfileHero] Primary name flow failed', {
            ensName,
            owner,
            connectedAddress,
            status: err?.status,
            shortMessage: err?.shortMessage,
            message: err?.message,
            cause: err?.cause?.message ?? err?.cause,
        })
    }, [])

    const {
        currentPrimaryName,
        setPrimaryName,
        status,
        isAlreadyPrimary,
        isCheckingPrimary,
        isPending,
        isConfirmed,
        isError,
        errorMessage,
    } = useSetPrimaryName({
        name: ensName,
        enabled: isConnected && isOwner,
        onSuccess: handleSuccess,
        onError: handleError,
    })

    const copyAddress = () => {
        if (owner) {
            navigator.clipboard.writeText(owner)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleSetPrimary = () => {
        console.log('[ProfileHero] Set primary clicked:', {
            ensName,
            isOwner,
            isConnected,
            owner,
            connectedAddress,
            currentPrimaryName,
            isAlreadyPrimary,
            buttonDisabled: buttonState.disabled,
            currentStatus: status,
        })
        if (!ensName || !isOwner) return
        setPrimaryName(ensName)
    }

    // Determine button state
    const getButtonState = () => {
        if (!isConnected) return { text: 'Connect Wallet', disabled: true }
        if (!isOwner) return { text: 'Not Owner', disabled: true }
        if (isCheckingPrimary) return { text: 'Checking Primary Name...', disabled: true }
        if (isPending) {
            if (status === 'switching') return { text: 'Switching to Ethereum...', disabled: true }
            if (status === 'signing') return { text: 'Confirm in Wallet...', disabled: true }
            if (status === 'confirming') return { text: 'Confirming...', disabled: true }
        }
        if (isAlreadyPrimary) return { text: 'Ethereum Identity Set', disabled: true }
        if (isConfirmed) return { text: 'Primary Name Set ✓', disabled: true }
        return { text: 'Set as Primary Name', disabled: false }
    }

    const buttonState = getButtonState()

    if (!name || isLoading) return null

    return (
        <section className="profile-hero">
            <div className="hero-info">
                <div className="hero-name-row">
                    <h1 className="hero-name">{displayName}</h1>
                    <a
                        href={`https://explorer.rootstock.io/address/${owner}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-rsk-link"
                        title="View on Rootstock Explorer"
                    >
                        .rsk
                    </a>
                    <a
                        href={`https://app.ens.domains/${ensName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-eth-link"
                        title="View on ENS App"
                    >
                        .eth
                    </a>
                </div>

                <div className="hero-badges">
                    <span className="badge badge-rns">RNS NAME</span>
                    {nameExists && (
                        <span className="badge badge-ens">ENS COMPATIBLE</span>
                    )}
                </div>

                {isOwner && (
                    <div className="primary-name-section">
                        <button
                            onClick={handleSetPrimary}
                            disabled={buttonState.disabled}
                            className={`btn-set-primary ${isPending ? 'pending' : ''} ${isConfirmed || isAlreadyPrimary ? 'success' : ''}`}
                            title="Sets this as your primary ENS name across Ethereum"
                        >
                            <span className="primary-icon">◈</span>
                            <span className="primary-text">{buttonState.text}</span>
                        </button>
                        {isError && (
                            <p className="field-error">
                                {errorMessage}
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="hero-owner">
                <span className="owner-label">OWNER</span>
                <button className="owner-address" onClick={copyAddress} title="Click to copy">
                    <span className="address-text">
                        {owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : '—'}
                    </span>
                    <span className="copy-icon">{copied ? '✓' : '⧉'}</span>
                </button>
            </div>

            <a
                href={`https://app.ens.domains/${ensName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-view-ens"
            >
                View on ENS App
            </a>
        </section>
    )
}
