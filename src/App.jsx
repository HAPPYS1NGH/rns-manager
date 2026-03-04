import { useState, useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { namehash, isAddress } from 'viem'
import { normalize } from 'viem/ens'
import { rootstock } from 'viem/chains'
import { RNS_REGISTRY_ADDRESS, REGISTRY_ABI, RESOLVER_ABI } from './contracts'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000'

function safeNode(name) {
  try {
    return namehash(normalize(name))
  } catch {
    return null
  }
}

function truncate(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`
}

export default function App() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: switching } = useSwitchChain()

  const [input, setInput] = useState('')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [newAddr, setNewAddr] = useState('')
  const [addrError, setAddrError] = useState('')
  const [copied, setCopied] = useState(null)

  const onRootstock = chainId === rootstock.id
  const node = safeNode(name)

  const { data: owner, isLoading: ownerLoading } = useReadContract({
    address: RNS_REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'owner',
    args: node ? [node] : undefined,
    chainId: rootstock.id,
    query: { enabled: !!node },
  })

  const { data: resolver, isLoading: resolverLoading } = useReadContract({
    address: RNS_REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'resolver',
    args: node ? [node] : undefined,
    chainId: rootstock.id,
    query: { enabled: !!node },
  })

  const hasResolver = !!resolver && resolver !== ZERO_ADDR

  const { data: resolvedAddr, isLoading: addrLoading } = useReadContract({
    address: resolver,
    abi: RESOLVER_ABI,
    functionName: 'addr',
    args: node ? [node] : undefined,
    chainId: rootstock.id,
    query: { enabled: !!node && hasResolver },
  })

  const {
    writeContract,
    data: txHash,
    isPending: writing,
    isError: writeError,
    error: writeErrorMsg,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: rootstock.id,
  })

  useEffect(() => {
    if (isConnected && address && !newAddr) {
      setNewAddr(address)
    }
  }, [isConnected, address])

  const handleSearch = (e) => {
    e.preventDefault()
    setNameError('')
    const trimmed = input.trim().toLowerCase()
    if (!trimmed) return
    if (!trimmed.endsWith('.rsk')) {
      setNameError('Name must end with .rsk  (e.g. hap.happy.rsk)')
      return
    }
    try {
      normalize(trimmed)
      setName(trimmed)
      resetWrite()
    } catch {
      setNameError('Invalid RNS name — check for unsupported characters')
    }
  }

  const handleSetAddr = (e) => {
    e.preventDefault()
    setAddrError('')
    if (!isAddress(newAddr)) {
      setAddrError('Not a valid EVM address')
      return
    }
    if (!hasResolver) return
    writeContract({
      address: resolver,
      abi: RESOLVER_ABI,
      functionName: 'setAddr',
      args: [node, newAddr],
      chainId: rootstock.id,
    })
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const nameExists = owner && owner !== ZERO_ADDR
  const isLoading = ownerLoading || resolverLoading
  const addrNotSet = !resolvedAddr || resolvedAddr === ZERO_ADDR

  return (
    <div className="app">
      <div className="grid-overlay" />

      <header className="header">
        <div className="logo">
          <span className="logo-bracket">[</span>
          <span className="logo-rns">RNS</span>
          <span className="logo-sep"> / </span>
          <span className="logo-manager">MANAGER</span>
          <span className="logo-bracket">]</span>
        </div>
        <div className="header-right">
          <span className="chain-tag">ROOTSTOCK</span>
          <ConnectButton
            label="CONNECT"
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </header>

      <main className="main">
        {/* Search */}
        <section className="card">
          <h2 className="card-title">
            <span className="title-icon">▸</span> LOOKUP NAME
          </h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="input-row">
              <div className="input-wrap">
                <input
                  className="input"
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setNameError('')
                  }}
                  placeholder="happy.rsk"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <button className="btn-search" type="submit">
                SEARCH
              </button>
            </div>
            {nameError && <p className="field-error">{nameError}</p>}
          </form>
        </section>

        {/* Records */}
        {name && (
          <section className="card records-card">
            <h2 className="card-title">
              <span className="title-icon">▸</span> RECORDS
              <span className="name-badge">{name}</span>
            </h2>

            {isLoading ? (
              <div className="loading-row">
                <span className="spinner" />
                <span>Querying Rootstock mainnet…</span>
              </div>
            ) : !nameExists ? (
              <div className="empty-state">
                <span className="empty-icon">◌</span>
                <p>Name not found in the RNS registry</p>
              </div>
            ) : (
              <div className="records">
                <RecordRow
                  label="OWNER"
                  value={owner}
                  onCopy={() => copyToClipboard(owner, 'owner')}
                  copied={copied === 'owner'}
                />
                <RecordRow
                  label="RESOLVER"
                  value={resolver}
                  onCopy={() => copyToClipboard(resolver, 'resolver')}
                  copied={copied === 'resolver'}
                  dim={!hasResolver}
                  dimText="(no resolver set)"
                />
                <RecordRow
                  label="RSK ADDRESS"
                  value={addrNotSet ? null : resolvedAddr}
                  onCopy={!addrNotSet ? () => copyToClipboard(resolvedAddr, 'addr') : undefined}
                  copied={copied === 'addr'}
                  loading={addrLoading}
                  dim={addrNotSet}
                  dimText="(not set)"
                />
              </div>
            )}
          </section>
        )}

        {/* Set Address */}
        {isConnected && name && nameExists && (
          <section className="card action-card">
            <h2 className="card-title">
              <span className="title-icon">▸</span> SET RSK ADDRESS
            </h2>

            {!onRootstock ? (
              <div className="switch-chain-block">
                <p className="hint">Switch to Rootstock Mainnet to write on-chain.</p>
                <button
                  className="btn-primary"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: rootstock.id })}
                >
                  {switching ? 'SWITCHING…' : 'SWITCH TO ROOTSTOCK'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetAddr} className="addr-form">
                <label className="field-label">ADDRESS TO RESOLVE TO</label>
                <div className="input-wrap">
                  <input
                    className="input"
                    type="text"
                    value={newAddr}
                    onChange={(e) => {
                      setNewAddr(e.target.value)
                      setAddrError('')
                      resetWrite()
                    }}
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                {addrError && <p className="field-error">{addrError}</p>}

                {!hasResolver && (
                  <p className="hint hint-warn">
                    ⚠ No resolver is set for this name — assign one first.
                  </p>
                )}

                <div className="action-row">
                  <button
                    className="btn-primary"
                    type="submit"
                    disabled={writing || confirming || !hasResolver}
                  >
                    {writing
                      ? 'CONFIRM IN WALLET…'
                      : confirming
                        ? 'CONFIRMING TX…'
                        : 'SET ADDRESS'}
                  </button>

                  {confirmed && (
                    <span className="status-ok">✓ Address updated on-chain</span>
                  )}
                  {writeError && (
                    <span className="status-err">
                      ✗ {writeErrorMsg?.shortMessage ?? 'Transaction failed'}
                    </span>
                  )}
                </div>

                <p className="hint">
                  Connected as <span className="mono">{truncate(address)}</span>. You must be
                  authorised on the resolver to write.
                </p>
              </form>
            )}
          </section>
        )}

        {!isConnected && name && nameExists && (
          <section className="card connect-cta">
            <p className="cta-text">Connect your wallet to set address records.</p>
            <ConnectButton label="CONNECT WALLET" accountStatus="address" chainStatus="none" showBalance={false} />
          </section>
        )}
      </main>
    </div>
  )
}

function RecordRow({ label, value, onCopy, copied, loading, dim, dimText = '—' }) {
  return (
    <div className="record-row">
      <span className="record-label">{label}</span>
      <div className="record-right">
        {loading ? (
          <span className="record-value dim">loading…</span>
        ) : dim || !value ? (
          <span className="record-value dim">{dimText}</span>
        ) : (
          <>
            <span className="record-value mono">{value}</span>
            {onCopy && (
              <button className="copy-btn" onClick={onCopy} title="Copy">
                {copied ? '✓' : '⎘'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
