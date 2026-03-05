import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

import { useNameData } from './hooks/useNameData'
import Header from './components/Header'
import NameSearch from './components/NameSearch'
import RecordsCard from './components/RecordsCard'
import AddressRecords from './components/AddressRecords'
import TextRecords from './components/TextRecords'
import ContentHash from './components/ContentHash'
import SubnamesList from './components/SubnamesList'
import CreateSubname from './components/CreateSubname'

// ─── Hash routing helpers ───────────────────────────────────────────────────

function getNameFromHash() {
  const hash = window.location.hash.slice(1) // strip '#'
  if (!hash) return ''
  // Remove leading slash if present (e.g. #/happy.rsk → happy.rsk)
  const cleaned = hash.startsWith('/') ? hash.slice(1) : hash
  const decoded = decodeURIComponent(cleaned).toLowerCase().trim()
  // Auto-append .rsk if missing
  if (decoded && !decoded.endsWith('.rsk')) return `${decoded}.rsk`
  return decoded
}

function setHashRoute(name) {
  const path = name || ''
  window.history.replaceState(null, '', path ? `#/${path}` : window.location.pathname)
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const { isConnected } = useAccount()
  const [name, setName] = useState(() => getNameFromHash())

  // Sync name from URL hash on mount and hashchange
  useEffect(() => {
    const onHashChange = () => {
      const hashName = getNameFromHash()
      if (hashName) setName(hashName)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const nameData = useNameData(name)

  // Handle search: update state + URL
  const handleSearch = useCallback((fullName) => {
    setName(fullName)
    setHashRoute(fullName)
  }, [])

  // Handle "Manage →" from SubnamesList
  const handleManageSubname = useCallback((fullName) => {
    setName(fullName)
    setHashRoute(fullName)
  }, [])

  // Derive parent name for subnames section
  // "happy.rsk" → parentName = "happy.rsk"
  // "alice.happy.rsk" → parentName = null (only show subnames for 2nd-level names)
  const getParentName = (n) => {
    if (!n) return null
    const parts = n.split('.')
    if (parts.length === 2) return n // e.g. happy.rsk
    return null
  }

  const parentName = getParentName(name)

  return (
    <div className="app">
      <div className="grid-overlay" />
      <Header />

      <main className="main">
        {/* Search */}
        <NameSearch onSearch={handleSearch} initialValue={name} />

        {/* Core Records */}
        <RecordsCard nameData={nameData} isConnected={isConnected} />

        {/* Address Records (multi-coin) */}
        {nameData.nameExists && nameData.hasResolver && (
          <AddressRecords nameData={nameData} isConnected={isConnected} />
        )}

        {/* Text Records */}
        {nameData.nameExists && nameData.hasResolver && (
          <TextRecords nameData={nameData} isConnected={isConnected} />
        )}

        {/* Content Hash */}
        {nameData.nameExists && nameData.hasResolver && (
          <ContentHash nameData={nameData} isConnected={isConnected} />
        )}

        {/* Subnames (only for 2nd-level names) */}
        {nameData.nameExists && parentName && (
          <SubnamesList
            parentName={parentName}
            onManage={handleManageSubname}
          />
        )}

        {/* Create Subname */}
        {nameData.nameExists && parentName && (
          <CreateSubname nameData={nameData} isConnected={isConnected} />
        )}

        {/* ENS Compatibility Indicator */}
        {nameData.nameExists && name && (
          <section className="card ens-compat-card">
            <h2 className="card-title">
              <span className="title-icon">▸</span> ENS COMPATIBILITY
            </h2>
            <div className="ens-compat-content">
              <p className="ens-compat-text">
                <span className="ens-link-icon">🔗</span>
                Also resolves as <span className="mono ens-name">{name.replace('.rsk', '.rsk.eth')}</span> on Ethereum via CCIP gateway
              </p>
              <a
                href={`https://app.ens.domains/${name.replace('.rsk', '.rsk.eth')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-sm"
              >
                View on ENS App →
              </a>
            </div>
          </section>
        )}

        {/* Connect CTA (when not connected but looking at a name) */}
        {!isConnected && name && nameData.nameExists && (
          <section className="card connect-cta">
            <p className="cta-text">Connect your wallet to manage records and create subnames.</p>
            <ConnectButton label="CONNECT WALLET" accountStatus="address" chainStatus="none" showBalance={false} />
          </section>
        )}
      </main>
    </div>
  )
}
