import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

import { useNameData } from './hooks/useNameData'
import Header from './components/Header'
import NameSearch from './components/NameSearch'
import ProfileHero from './components/ProfileHero'
import TabNav, { TABS } from './components/TabNav'
import RecordsCard from './components/RecordsCard'
import AddressRecords from './components/AddressRecords'
import TextRecords from './components/TextRecords'
import ContentHash from './components/ContentHash'
import SubnamesList from './components/SubnamesList'
import CreateSubname from './components/CreateSubname'

// ─── Path routing helpers ───────────────────────────────────────────────────

function getNameFromPath() {
  const path = window.location.pathname
  if (!path || path === '/') return ''
  // Remove leading slash if present (e.g. /happy.rsk → happy.rsk)
  const cleaned = path.startsWith('/') ? path.slice(1) : path
  const decoded = decodeURIComponent(cleaned).toLowerCase().trim()
  // Auto-append .rsk if missing
  if (decoded && !decoded.endsWith('.rsk')) return `${decoded}.rsk`
  return decoded
}

function setPathRoute(name) {
  const path = name || ''
  window.history.replaceState(null, '', path ? `/${path}` : '/')
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const { isConnected } = useAccount()
  const [name, setName] = useState(() => getNameFromPath())
  const [activeTab, setActiveTab] = useState('profile')

  // Sync name from URL path on mount and popstate
  useEffect(() => {
    const onPopState = () => {
      const pathName = getNameFromPath()
      if (pathName) setName(pathName)
      else setName('')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const nameData = useNameData(name)

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    const counts = { profile: 0, addresses: 0, content: 0, subnames: 0 }
    if (!nameData.nameExists) return counts
    
    // Profile: name, description, url, socials
    const profileKeys = ['name', 'description', 'url', 'com.twitter', 'com.github', 'com.discord', 'email', 'notice', 'location']
    counts.profile = profileKeys.filter(k => nameData.textRecords?.[k]).length
    
    // Addresses: multi-coin addresses set
    counts.addresses = Object.keys(nameData.multiCoinAddresses || {}).length
    if (nameData.rskAddress) counts.addresses++
    
    // Content: content hash set
    counts.content = nameData.contentHash ? 1 : 0
    
    // Subnames: always show as an option
    counts.subnames = 0
    
    return counts
  }, [nameData.nameExists, nameData.textRecords, nameData.multiCoinAddresses, nameData.rskAddress, nameData.contentHash])

  // Handle search: update state + URL
  const handleSearch = useCallback((fullName) => {
    setName(fullName)
    setPathRoute(fullName)
    setActiveTab('profile')
  }, [])

  // Handle "Manage →" from SubnamesList
  const handleManageSubname = useCallback((fullName) => {
    setName(fullName)
    setPathRoute(fullName)
    setActiveTab('profile')
  }, [])

  // Derive parent name for subnames section
  const getParentName = (n) => {
    if (!n) return null
    const parts = n.split('.')
    if (parts.length === 2) return n
    return null
  }

  const parentName = getParentName(name)
  const ensName = name ? name.replace('.rsk', '.rsk.eth') : ''

  return (
    <div className="app">
      <div className="grid-overlay" />
      <Header />

      <main className="main">
        <NameSearch onSearch={handleSearch} initialValue={name} />

        {/* Landing page - show ENS compatibility info */}
        {!name && (
          <section className="landing-info">
            <div className="landing-card">
              <h2 className="landing-title">RNS Names are ENS Compatible</h2>
              <p className="landing-text">
                Every RNS name resolves as <span className="mono">{name ? name.replace('.rsk', '.rsk.eth') : '*.rsk.eth'}</span> on Ethereum.
                Manage your profile, addresses, and content hash here, or view on ENS App.
              </p>
              <div className="landing-features">
                <div className="feature">
                  <span className="feature-icon">📍</span>
                  <span>Multi-chain addresses</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">📝</span>
                  <span>Profile & social records</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🔗</span>
                  <span>Content hash (IPFS)</span>
                </div>
                <div className="feature">
                  <span className="feature-icon">🌐</span>
                  <span>Subdomains</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {name && nameData.nameExists && (
          <>
            <ProfileHero name={name} nameData={nameData} />

            <TabNav 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
              counts={tabCounts}
            />

            <div className="tab-content">
              {activeTab === 'profile' && (
                <TextRecords nameData={nameData} isConnected={isConnected} />
              )}

              {activeTab === 'addresses' && (
                <AddressRecords nameData={nameData} isConnected={isConnected} />
              )}

              {activeTab === 'content' && (
                <ContentHash nameData={nameData} isConnected={isConnected} />
              )}

              {activeTab === 'subnames' && (
                <>
                 
                  {parentName && (
                    <SubnamesList parentName={parentName} onManage={handleManageSubname} />
                  )}
                  {parentName && (
                    <CreateSubname nameData={nameData} isConnected={isConnected} />
                  )}
                   <RecordsCard nameData={nameData} isConnected={isConnected} showAdvanced={true} />
                </>
              )}
            </div>
          </>
        )}

        {name && !nameData.nameExists && !nameData.isLoading && (
          <section className="card empty-state-card">
            <span className="empty-icon">◌</span>
            <p>Name not found in the RNS registry</p>
            {ensName && (
              <a
                href={`https://app.ens.domains/${ensName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-view-ens"
              >
                View on ENS App
              </a>
            )}
          </section>
        )}

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
