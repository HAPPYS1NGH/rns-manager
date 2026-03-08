/**
 * useSetPrimaryName — Hook for setting ENS primary name via Reverse Registrar
 * 
 * Flow:
 * 1. User clicks button
 * 2. If not on Ethereum Mainnet, switch chains
 * 3. Call setName on ENS Reverse Registrar
 */
import { useState, useCallback, useEffect } from 'react'
import { useSwitchChain, useChainId, useConfig, useAccount } from 'wagmi'
import { simulateContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { estimateContractGas, getEnsName } from 'viem/actions'
import { mainnet } from 'viem/chains'
import { isPrimaryNameMatch } from '../utils/primaryName'

// ENS Reverse Registrar on Ethereum Mainnet (current deployment)
const REVERSE_REGISTRAR_ADDRESS = '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb'

const REVERSE_REGISTRAR_ABI = [
  {
    name: 'setName',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
]

function serializeError(error) {
  return {
    name: error?.name,
    message: error?.message,
    shortMessage: error?.shortMessage,
    details: error?.details,
    cause: error?.cause?.message ?? error?.cause,
    stack: error?.stack,
  }
}

export function useSetPrimaryName({ name, enabled = true, onSuccess, onError } = {}) {
  const chainId = useChainId()
  const config = useConfig()
  const { address } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  
  const [status, setStatus] = useState('idle')
  const [txHash, setTxHash] = useState(null)
  const [error, setError] = useState(null)
  const [isCheckingPrimary, setIsCheckingPrimary] = useState(false)
  const [isAlreadyPrimary, setIsAlreadyPrimary] = useState(false)
  const [currentPrimaryName, setCurrentPrimaryName] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function checkPrimaryName() {
      if (!enabled || !address || !name) {
        setIsCheckingPrimary(false)
        setIsAlreadyPrimary(false)
        setCurrentPrimaryName(null)
        return
      }

      setIsCheckingPrimary(true)

      try {
        const publicClient = config.getClient({ chainId: mainnet.id })
        const primaryName = await getEnsName(publicClient, { address })

        if (cancelled) return

        setCurrentPrimaryName(primaryName ?? null)
        setIsAlreadyPrimary(isPrimaryNameMatch(primaryName, name))
      } catch (err) {
        if (cancelled) return

        console.error('[useSetPrimaryName] Failed to read current primary name', serializeError(err))
        setCurrentPrimaryName(null)
        setIsAlreadyPrimary(false)
      } finally {
        if (!cancelled) {
          setIsCheckingPrimary(false)
        }
      }
    }

    checkPrimaryName()

    return () => {
      cancelled = true
    }
  }, [address, config, enabled, name, refreshKey])

  const setPrimaryName = useCallback(async (name) => {
    if (!name) {
      console.error('[useSetPrimaryName] No name provided')
      return
    }

    console.info('[useSetPrimaryName] Starting primary-name flow', {
      name,
      currentChainId: chainId,
      targetChainId: mainnet.id,
      reverseRegistrar: REVERSE_REGISTRAR_ADDRESS,
      hasSwitchChain: typeof switchChainAsync === 'function',
    })

    setStatus('switching')
    setError(null)
    setTxHash(null)

    try {
      // Step 1: Switch to Ethereum Mainnet if needed
      if (chainId !== mainnet.id) {
        console.log('[useSetPrimaryName] Switching to Ethereum Mainnet...')
        await switchChainAsync({ chainId: mainnet.id })
        console.log('[useSetPrimaryName] Switched to Ethereum Mainnet')
      } else {
        console.info('[useSetPrimaryName] Already on Ethereum Mainnet')
      }

      // Step 2: Submit transaction
      setStatus('signing')
      console.log('[useSetPrimaryName] Sending transaction...')

      // Simulate first so viem validates the call and we can send an explicit gas limit.
      const simulation = await simulateContract(config, {
        address: REVERSE_REGISTRAR_ADDRESS,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: 'setName',
        args: [name],
        chainId: mainnet.id,
      })

      console.info('[useSetPrimaryName] Simulation completed', {
        account: simulation.request?.account?.address ?? simulation.request?.account,
        chainId: simulation.request?.chainId,
        to: simulation.request?.address,
      })

      const publicClient = config.getClient({ chainId: mainnet.id })
      const gas = await estimateContractGas(publicClient, simulation.request)

      console.info('[useSetPrimaryName] Gas estimated', {
        gas: gas.toString(),
      })

      const hash = await writeContract(config, {
        ...simulation.request,
        gas,
      })

      setTxHash(hash)
      setStatus('confirming')
      console.log('[useSetPrimaryName] Transaction submitted:', hash)

      // Step 3: Wait for confirmation
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        chainId: mainnet.id,
      })

      console.log('[useSetPrimaryName] Transaction confirmed:', receipt)
      setStatus('confirmed')
      setRefreshKey((value) => value + 1)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('[useSetPrimaryName] Error during primary-name flow', serializeError(err))
      setError(err)
      setStatus('error')
      
      if (onError) {
        onError(err)
      }
    }
  }, [chainId, config, switchChainAsync, onSuccess, onError])

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }, [])

  const isPending = status === 'switching' || status === 'signing' || status === 'confirming'
  const isConfirmed = status === 'confirmed'
  const isError = status === 'error'

  const errorMessage = error?.shortMessage ?? error?.message ?? 'Transaction failed'

  return {
    currentPrimaryName,
    setPrimaryName,
    reset,
    txHash,
    status,
    isAlreadyPrimary,
    isCheckingPrimary,
    isSwitching: status === 'switching',
    isWriting: status === 'signing',
    isConfirming: status === 'confirming',
    isConfirmed,
    isError,
    isPending,
    error,
    errorMessage,
  }
}
