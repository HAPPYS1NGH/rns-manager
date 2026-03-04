import { useState, useCallback } from 'react'
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

export default function App() {
  const { isConnected } = useAccount()
  const [name, setName] = useState('')

  const nameData = useNameData(name)

  // Handle "Manage →" from SubnamesList — loads a subname into search
  const handleManageSubname = useCallback((fullName) => {
    setName(fullName)
  }, [])

  // Derive parent name for subnames section
  // e.g. "happy.rsk" → parentName is "happy.rsk"
  // e.g. "alice.happy.rsk" → parentName is "happy.rsk"
  const getParentName = (n) => {
    if (!n) return null
    const parts = n.split('.')
    // Only show subnames for 2nd-level names (e.g. happy.rsk), not sub-subnames
    if (parts.length === 2) return n
    return null
  }

  const parentName = getParentName(name)

  return (
    <div className="app">
      <div className="grid-overlay" />
      <Header />

      <main className="main">
        {/* Search */}
        <NameSearch onSearch={(n) => { setName(n); nameData.refetch?.() }} />

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
