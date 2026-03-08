/**
 * Multi-coin address encoding/decoding utilities for resolver addr() records.
 */
import { getCoderByCoinType } from '@ensdomains/address-encoder'
import { bytesToHex, encodeFunctionData, getAddress, hexToBytes } from 'viem'

import { getSupportedAddressByCoin, isEvmCoinType, supportedAddresses } from './supported-addresses.ts'

const COIN_DISPLAY_META = {
    0: { symbol: 'BTC', icon: '₿' },
    60: { symbol: 'ETH', icon: 'Ξ' },
    137: { symbol: 'RBTC', icon: '◈' },
    501: { symbol: 'SOL', icon: '◎' },
}

const MULTICOIN_SET_ADDR_ABI = [
    {
        name: 'setAddr',
        inputs: [
            { name: 'node', type: 'bytes32' },
            { name: 'coinType', type: 'uint256' },
            { name: 'a', type: 'bytes' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
]

export const SUPPORTED_COINS = supportedAddresses.map((coin) => {
    const display = COIN_DISPLAY_META[coin.coinType] ?? {
        symbol: coin.chainName.toUpperCase(),
        icon: coin.isEvm ? '◈' : '❖',
    }

    return {
        name: coin.label,
        symbol: display.symbol,
        coinType: coin.coinType,
        evmChainId: coin.chainId ?? null,
        icon: display.icon,
    }
})

function getCoinDebugMeta(coinType, value) {
    const normalizedCoinType = Number(coinType)
    const rawValue = typeof value === 'string' ? value : ''

    return {
        coinType: normalizedCoinType,
        coinName: getCoinName(normalizedCoinType),
        isEvm: isEvmCoinType(normalizedCoinType),
        valueLength: rawValue.length,
        valuePreview: rawValue ? `${rawValue.slice(0, 18)}...${rawValue.slice(-10)}` : '',
    }
}

export function decodeAddress(coinType, rawHex) {
    if (!rawHex || rawHex === '0x' || rawHex === '0x0' || rawHex === '0x' + '00'.repeat(20)) {
        return null
    }

    try {
        if (isEvmCoinType(Number(coinType))) {
            const decoded = getAddress(bytesToHex(hexToBytes(rawHex)))

            console.info('[coins.decodeAddress] decoded EVM resolver address', {
                ...getCoinDebugMeta(coinType, rawHex),
                decoded,
            })

            return decoded
        }

        const coder = getCoderByCoinType(coinType)
        const bytes = hexToBytes(rawHex)
        const decoded = coder.encode(bytes)

        console.info('[coins.decodeAddress] decoded resolver address', {
            ...getCoinDebugMeta(coinType, rawHex),
            byteLength: bytes.length,
            decoded,
        })

        return decoded
    } catch (err) {
        console.warn('[coins.decodeAddress] failed to decode resolver address', {
            ...getCoinDebugMeta(coinType, rawHex),
            errorMessage: err?.message ?? String(err),
        })
        return rawHex
    }
}

export function encodeAddress(coinType, address) {
    const normalizedAddress = address.trim()

    if (isEvmCoinType(Number(coinType))) {
        return bytesToHex(hexToBytes(normalizeEvmAddress(normalizedAddress)))
    }

    const coder = getCoderByCoinType(coinType)
    const bytes = coder.decode(normalizedAddress)
    const encoded = bytesToHex(bytes)

    console.info('[coins.encodeAddress] encoded address for resolver write', {
        ...getCoinDebugMeta(coinType, normalizedAddress),
        byteLength: bytes.length,
        encoded,
    })

    return encoded
}

export function validateAddress(coinType, address) {
    if (!address || !address.trim()) {
        return { valid: false, error: 'Address is required' }
    }

    const normalizedCoinType = Number(coinType)
    const normalizedAddress = address.trim()
    const supported = getSupportedAddressByCoin(normalizedCoinType)

    console.info('[coins.validateAddress] validating address input', {
        ...getCoinDebugMeta(normalizedCoinType, normalizedAddress),
    })

    try {
        if (supported?.validate && !supported.validate(normalizedAddress)) {
            throw new Error('Unrecognised address format')
        }

        encodeAddress(normalizedCoinType, normalizedAddress)
        return { valid: true }
    } catch (err) {
        console.warn('[coins.validateAddress] invalid address input', {
            ...getCoinDebugMeta(normalizedCoinType, normalizedAddress),
            errorMessage: err?.message ?? String(err),
        })
        return { valid: false, error: `Invalid address for ${getCoinName(normalizedCoinType)}: ${err.message}` }
    }
}

export function getCoinName(coinType) {
    const supported = getSupportedAddressByCoin(Number(coinType))
    return supported ? supported.label : `Coin ${coinType}`
}

export function buildMulticallSetAddrCalls(node, records) {
    return records.map((record) =>
        encodeFunctionData({
            abi: MULTICOIN_SET_ADDR_ABI,
            functionName: 'setAddr',
            args: [node, BigInt(record.coinType), encodeAddress(record.coinType, record.value)],
        }),
    )
}

function normalizeEvmAddress(value) {
    return getAddress(value)
}
