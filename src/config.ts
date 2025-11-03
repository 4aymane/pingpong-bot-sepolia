import dotenv from 'dotenv'

dotenv.config()

export interface BotConfig {
  rpcWssUrl: string
  privateKey: string
  contractAddress: string
  startingBlock: number | null // null = use current block
  dbPath: string
}

/**
 * Load configuration from environment variables
 * Exits if required variables are missing
 *
 * STARTING_BLOCK is optional - if not provided, bot will use current block
 */
export function loadConfig(): BotConfig {
  const required = ['RPC_WSS_URL', 'PRIVATE_KEY', 'PING_PONG_CONTRACT']
  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`)
    console.error('Check your .env file (see env.example)')
    process.exit(1)
  }

  return {
    rpcWssUrl: process.env.RPC_WSS_URL!,
    privateKey: process.env.PRIVATE_KEY!,
    contractAddress: process.env.PING_PONG_CONTRACT!,
    startingBlock: process.env.STARTING_BLOCK
      ? parseInt(process.env.STARTING_BLOCK)
      : null,
    dbPath: process.env.DB_PATH || '/data/bot.db',
  }
}

export default loadConfig
