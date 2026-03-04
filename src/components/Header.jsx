import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function Header() {
    return (
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
    )
}
