import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

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
import { normalizeRouteNameParam, toNamePath } from './utils/name-route'

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<NameManagerPage />} />
      <Route path="/:name" element={<RnsNameRoutePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RnsNameRoutePage() {
  const { name: routeNameParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const normalizedRoute = useMemo(
    () => normalizeRouteNameParam(routeNameParam),
    [routeNameParam],
  )

  useEffect(() => {
    if (!normalizedRoute.isValid || !normalizedRoute.canonicalName) return

    const canonicalPath = toNamePath(normalizedRoute.canonicalName)
    if (location.pathname !== canonicalPath) {
      navigate(canonicalPath, { replace: true })
    }
  }, [location.pathname, navigate, normalizedRoute])

  return (
    <NameManagerPage
      name={normalizedRoute.canonicalName ?? ''}
      invalidRoute={!normalizedRoute.isValid}
    />
  )
}

function NameManagerPage({ name = '', invalidRoute = false }) {
  const { isConnected } = useAccount()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    setActiveTab('profile')
  }, [name])

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

  const handleSearch = useCallback((fullName) => {
    navigate(toNamePath(fullName))
  }, [navigate])

  const handleManageSubname = useCallback((fullName) => {
    navigate(toNamePath(fullName))
  }, [navigate])

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

        {!name && !invalidRoute && (
          <section className="landing-info">
            <div className="landing-card">
              <h2 className="landing-title">Your RNS name works on Ethereum too</h2>
              <p className="landing-text">
                Search for your <span className="mono">.rsk</span> name above. Each one resolves as <span className="mono">.rsk.eth</span> on Ethereum through the CCIP gateway, so you can use it across both networks.
              </p>
              <div className="landing-features">
                <div className="feature">
                  <span className="feature-dot" />
                  <span>Add addresses for any chain</span>
                </div>
                <div className="feature">
                  <span className="feature-dot" />
                  <span>Set your profile and social links</span>
                </div>
                <div className="feature">
                  <span className="feature-dot" />
                  <span>Point to IPFS content</span>
                </div>
                <div className="feature">
                  <span className="feature-dot" />
                  <span>Create subdomains</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {invalidRoute && (
          <section className="card empty-state-card">
            <span className="empty-icon">◌</span>
            <p>Invalid RNS name in the URL</p>
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
