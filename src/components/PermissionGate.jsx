import { useChainId, useSwitchChain } from 'wagmi'
import { rootstock } from 'viem/chains'

/**
 * PermissionGate — Renders children only when the user is the owner
 * and on the correct chain. Shows appropriate prompts otherwise.
 *
 * @param {Object} props
 * @param {boolean} props.isConnected - Wallet connected?
 * @param {boolean} props.isOwner - Connected wallet is the name owner?
 * @param {React.ReactNode} props.children - Content to gate
 * @param {string} [props.action] - Description of what requires permission
 */
export default function PermissionGate({ isConnected, isOwner, children, action = 'manage this name' }) {
    const chainId = useChainId()
    const { switchChain, isPending: switching } = useSwitchChain()
    const onRootstock = chainId === rootstock.id

    if (!isConnected) return null
    if (!isOwner) return null

    if (!onRootstock) {
        return (
            <div className="switch-chain-block">
                <p className="hint">Switch to Rootstock Mainnet to {action}.</p>
                <button
                    className="btn-primary"
                    disabled={switching}
                    onClick={() => switchChain({ chainId: rootstock.id })}
                >
                    {switching ? 'SWITCHING…' : 'SWITCH TO ROOTSTOCK'}
                </button>
            </div>
        )
    }

    return <>{children}</>
}
