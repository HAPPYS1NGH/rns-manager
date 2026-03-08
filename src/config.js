import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { rootstock, mainnet } from 'viem/chains'
import { http } from 'viem'

// Get a free projectId at https://cloud.walletconnect.com
// For MetaMask (injected), the app works even with a placeholder.
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID ?? 'YOUR_WALLETCONNECT_PROJECT_ID'

export const config = getDefaultConfig({
  appName: 'RNS Manager',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [rootstock, mainnet],
  transports: {
    [rootstock.id]: http('https://public-node.rsk.co'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
  },
})
