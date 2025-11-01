import { ethers } from 'ethers'
import { Database } from './database'
import { handlePing } from './eventHandler'

/**
 * Scan for missed Ping events since last processed block
 *
 * This function:
 * 1. Gets the last processed block from database
 * 2. Queries all Ping events between last block and current block
 * 3. Processes any missed events that aren't already in the database
 *
 * Called on bot startup to ensure no events are missed during downtime
 */
export async function scanMissedEvents(
  contract: ethers.Contract,
  wallet: ethers.Wallet,
  db: Database,
  startingBlock: number
): Promise<void> {
  try {
    const lastBlock = await db.getLastProcessedBlock()
    const currentBlock = await contract.runner!.provider!.getBlockNumber()

    const fromBlock = lastBlock ? lastBlock + 1 : startingBlock

    if (currentBlock >= fromBlock) {
      console.log(
        `🔍 Scanning for missed Ping events from block ${fromBlock} to ${currentBlock} (${
          currentBlock - fromBlock + 1
        } blocks)`
      )

      // Query all Ping events in the range
      const events = await contract.queryFilter(
        contract.filters.Ping(),
        fromBlock,
        currentBlock
      )

      console.log(`Found ${events.length} Ping event(s) to process`)

      // Process each event
      for (const event of events) {
        const txHash = event.transactionHash
        const blockNumber = event.blockNumber

        // Skip if already processed (idempotency)
        if (await db.hasPing(txHash)) {
          continue
        }

        console.log(`Processing missed Ping event: ${txHash} at block ${blockNumber}`)
        await handlePing(txHash, blockNumber, contract, wallet, db)
      }

      console.log('✅ Gap scanning complete')
    } else {
      console.log(`No gap to scan (last: ${lastBlock}, current: ${currentBlock})`)
    }
  } catch (error: any) {
    console.error('Error scanning missed events:', error.message)
    throw error
  }
}

export default scanMissedEvents
