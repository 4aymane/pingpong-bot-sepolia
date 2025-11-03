import { loadConfig } from './config'
import { Database } from './database'
import { scanMissedEvents } from './gapScanner'
import { setupPingListener, setupErrorHandlers } from './eventListener'
import { setupProvider, setupWallet, setupContract } from './setup'

// Global state
const state = {
  isShuttingDown: false,
  db: null as Database | null,
}

/**
 * Main bot function
 * Orchestrates the bot startup and initialization
 */
async function main(): Promise<void> {
  console.log('🤖 Starting Kleros Ping-Pong Bot...')

  // 1. Load configuration
  const config = loadConfig()

  // 2. Initialize database
  state.db = new Database(config.dbPath)
  await state.db.initialize()

  // 3. Setup Ethereum provider
  const provider = await setupProvider(config.rpcWssUrl)

  // 4. Setup wallet
  const wallet = await setupWallet(config.privateKey, provider)

  // 5. Setup contract
  const contract = setupContract(config.contractAddress, wallet)

  // 6. Determine starting block fallback (if DB is empty on first run)
  let startingBlock = config.startingBlock
  if (startingBlock === null) {
    startingBlock = await provider.getBlockNumber()
    console.log(`📍 Fallback starting block: ${startingBlock} (current)`)
  } else {
    console.log(`📍 Fallback starting block: ${startingBlock} (from config)`)
  }

  // 7. Scan for missed events (catch up from last run)
  await scanMissedEvents(contract, wallet, state.db, startingBlock)

  // 8. Setup real-time event listener
  setupPingListener(contract, wallet, state.db, { value: state.isShuttingDown })

  // 9. Setup error handlers
  setupErrorHandlers(provider)

  console.log('🚀 Bot is now running and listening for Ping events!')
  console.log('Press Ctrl+C to stop the bot gracefully')
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (state.isShuttingDown) return
  state.isShuttingDown = true

  console.log(`\n${signal} received. Shutting down gracefully...`)

  try {
    if (state.db) {
      await state.db.close()
    }
    console.log('✅ Graceful shutdown complete')
    process.exit(0)
  } catch (error: any) {
    console.error('Error during shutdown:', error.message)
    process.exit(1)
  }
}

// Error handlers
process.on('uncaughtException', (error: Error) => {
  console.error('UNCAUGHT EXCEPTION:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason: any) => {
  console.error('UNHANDLED REJECTION:', reason)
  process.exit(1)
})

// Signal handlers
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

// Start the bot
main().catch((error: Error) => {
  console.error('Fatal error in main function:', error)
  process.exit(1)
})
