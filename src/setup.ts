import { ethers } from 'ethers'
import { PING_PONG_ABI } from './constants'

/**
 * Setup Ethereum WebSocket provider
 * Connects to Sepolia network via Infura
 */
export async function setupProvider(
  rpcWssUrl: string
): Promise<ethers.WebSocketProvider> {
  console.log('🌐 Connecting to Sepolia network via Infura WebSocket...')

  const provider = new ethers.WebSocketProvider(rpcWssUrl)
  await provider.ready

  const network = await provider.getNetwork()
  console.log(`✅ Connected to ${network.name} (Chain ID: ${network.chainId})`)

  return provider
}

/**
 * Setup wallet and check balance
 * Warns if wallet has insufficient funds
 */
export async function setupWallet(
  privateKey: string,
  provider: ethers.WebSocketProvider
): Promise<ethers.Wallet> {
  const wallet = new ethers.Wallet(privateKey, provider)
  console.log(`👛 Bot wallet: ${wallet.address}`)

  // Check wallet balance
  const balance = await provider.getBalance(wallet.address)
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`)

  if (balance === 0n) {
    console.warn(
      '⚠️  WARNING: Bot wallet has zero balance. Get Sepolia ETH from faucet: https://sepoliafaucet.com/'
    )
  }

  return wallet
}

/**
 * Setup contract instance with ABI and signer
 */
export function setupContract(
  contractAddress: string,
  wallet: ethers.Wallet
): ethers.Contract {
  const contract = new ethers.Contract(contractAddress, PING_PONG_ABI, wallet)
  console.log(`📜 Contract: ${contractAddress}`)
  return contract
}

export default { setupProvider, setupWallet, setupContract }
