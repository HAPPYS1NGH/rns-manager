import { useState } from 'react'

export default function ProfileHero({ name, nameData }) {
    const { owner, textRecords, nameExists, isLoading } = nameData
    const [copied, setCopied] = useState(false)

    const ensName = name ? name.replace('.rsk', '.rsk.eth') : ''
    const displayName = textRecords?.name || name?.replace('.rsk', '')

    const copyAddress = () => {
        if (owner) {
            navigator.clipboard.writeText(owner)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (!name || isLoading) return null

    return (
        <section className="profile-hero">
            <div className="hero-info">
                <div className="hero-name-row">
                    <h1 className="hero-name">{displayName}</h1>
                    <span className="hero-tld">.rsk</span>
                    <span className="hero-eth">.eth</span>
                </div>

                <div className="hero-badges">
                    <span className="badge badge-rns">RNS NAME</span>
                    {nameExists && (
                        <span className="badge badge-ens">ENS COMPATIBLE</span>
                    )}
                </div>
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
