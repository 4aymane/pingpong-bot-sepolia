import { ethers } from 'ethers'
import { Database } from './database'
import { handlePing } from './eventHandler'

/**
 * Setup real-time Ping event listener
 *
 * Listens for new Ping events emitted by the contract and processes them immediately
 */
export function setupPingListener(
  contract: ethers.Contract,
  wallet: ethers.Wallet,
  db: Database,
  isShuttingDownRef: { value: boolean }
): void {
  contract.on('Ping', async (event) => {
    // Don't process events during shutdown
    if (isShuttingDownRef.value) return

    try {
      const txHash = event.log.transactionHash
      const blockNumber = event.log.blockNumber

      console.log(`🔔 Ping detected: ${txHash} at block ${blockNumber}`)

      // Check if already processed (idempotency)
      if (await db.hasPing(txHash)) {
        return
      }

      // Handle the ping event
      await handlePing(txHash, blockNumber, contract, wallet, db)
    } catch (error: any) {
      console.error('Error in Ping event handler:', error.message)
    }
  })

  console.log('✅ Event listener active')
}

/**
 * Setup provider error handlers
 *
 * Handles WebSocket disconnections and provider errors by restarting the bot
 * Docker will automatically restart the container
 */
export function setupErrorHandlers(provider: ethers.WebSocketProvider): void {
  // Handle provider errors
  provider.on('error', async (error: Error) => {
    console.error('❌ Provider error:', error.message)
    console.log('Exiting... Docker will restart the bot')
    process.exit(1)
  })

  // Handle WebSocket close events (catches silent disconnections)
  if (provider.websocket) {
    const ws = provider.websocket as any // Type assertion for WebSocket events
    ws.on('close', async (code: number, reason: string) => {
      console.warn(`⚠️  WebSocket closed: code=${code}, reason=${reason || 'none'}`)
      console.log('Exiting... Docker will restart the bot')
      process.exit(1)
    })
  }
}

export default { setupPingListener, setupErrorHandlers }
