/**
 * useWriteRecord — Generic write hook for RNS records
 *
 * Wraps wagmi's useWriteContract + useWaitForTransactionReceipt to provide
 * a consistent write → confirm → success flow for all record types.
 */
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { rootstock } from 'viem/chains'

/**
 * @param {Object} options
 * @param {Function} [options.onSuccess] - Callback fired after TX confirms
 * @returns {Object} Write state + execute function
 */
export function useWriteRecord({ onSuccess } = {}) {
    const {
        writeContract,
        data: txHash,
        isPending: isWriting,
        isError: isWriteError,
        error: writeError,
        reset,
    } = useWriteContract()

    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
    } = useWaitForTransactionReceipt({
        hash: txHash,
        chainId: rootstock.id,
        query: {
            enabled: !!txHash,
            ...(onSuccess ? {
                meta: { onSuccess },
            } : {}),
        },
    })

    /**
     * Execute a write transaction
     * @param {Object} params
     * @param {string} params.address - Contract address
     * @param {Array} params.abi - Contract ABI
     * @param {string} params.functionName - Function to call
     * @param {Array} params.args - Function arguments
     */
    const write = ({ address, abi, functionName, args }) => {
        writeContract({
            address,
            abi,
            functionName,
            args,
            chainId: rootstock.id,
        })
    }

    // Derive a human-readable status string
    let status = 'idle'
    if (isWriting) status = 'signing'
    else if (isConfirming) status = 'confirming'
    else if (isConfirmed) status = 'confirmed'
    else if (isWriteError) status = 'error'

    return {
        write,
        reset,
        txHash,
        status,
        isWriting,
        isConfirming,
        isConfirmed,
        isWriteError,
        writeError,
        errorMessage: writeError?.shortMessage ?? writeError?.message ?? 'Transaction failed',
    }
}
