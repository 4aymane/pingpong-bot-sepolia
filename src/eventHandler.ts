import { ethers } from 'ethers'
import { Database } from './database'

/**
 * Handle a Ping event by submitting a Pong transaction
 */
export async function handlePing(
  txHash: string,
  blockNumber: number,
  contract: ethers.Contract,
  wallet: ethers.Wallet,
  db: Database
): Promise<void> {
  try {
    // Check if already processed (idempotency)
    if (await db.hasPing(txHash)) {
      return
    }

    console.log(`🔔 Processing Ping: ${txHash} (block ${blockNumber})`)

    // Insert ping event as pending
    await db.insertPing(txHash, blockNumber, 'pending')

    // Get next nonce (includes pending transactions)
    const nonce = await wallet.getNonce('pending')

    // Submit pong transaction
    console.log(`📤 Submitting Pong (nonce: ${nonce})...`)
    const tx = await contract.pong(txHash, { nonce })

    console.log(`✅ Pong submitted: ${tx.hash}`)

    // Save pong transaction to database
    await db.insertPong(txHash, tx.hash, nonce, 'pending')

    // Wait for confirmation with 5-minute timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise<null>(
        (_, reject) => setTimeout(() => reject(new Error('TX_TIMEOUT')), 300000) // 5 minutes
      ),
    ]).catch((error: Error) => {
      if (error.message === 'TX_TIMEOUT') {
        console.warn(`⏱️  Transaction timeout (5 minutes): ${tx.hash}`)
        return null
      }
      throw error
    })

    if (receipt) {
      console.log(
        `✅ Pong confirmed: ${tx.hash} (block ${receipt.blockNumber}, gas: ${receipt.gasUsed})`
      )

      // Update database
      await db.updatePing(txHash, 'confirmed')
      await db.updatePong(tx.hash, 'confirmed')
    }
  } catch (error: any) {
    console.error(`❌ Error handling Ping ${txHash}:`, error.message)

    // On error, the ping remains in 'pending' state
    // It will be retried on next bot restart via gap scanning
    throw error
  }
}

export default handlePing
