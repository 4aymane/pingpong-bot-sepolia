import sqlite3 from 'sqlite3'
import { promisify } from 'util'

export class Database {
  private db: sqlite3.Database
  private runAsync: (sql: string, params?: any[]) => Promise<void>
  private getAsync: (sql: string, params?: any[]) => Promise<any>

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to open database:', err.message)
        process.exit(1)
      }
      console.log(`📦 Database connected: ${dbPath}`)
    })

    // Promisify database methods
    this.runAsync = promisify(this.db.run.bind(this.db))
    this.getAsync = promisify(this.db.get.bind(this.db))
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    console.log('Initializing database schema...')

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS ping_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_hash TEXT NOT NULL UNIQUE,
        block_number INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed')),
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS pong_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ping_tx_hash TEXT NOT NULL,
        pong_tx_hash TEXT NOT NULL UNIQUE,
        nonce INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'failed')),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP,
        FOREIGN KEY(ping_tx_hash) REFERENCES ping_events(transaction_hash)
      )
    `)

    console.log('✅ Database schema initialized')
  }

  /**
   * Check if a ping event has been processed
   */
  async hasPing(txHash: string): Promise<boolean> {
    const row = await this.getAsync(
      'SELECT 1 FROM ping_events WHERE transaction_hash = ?',
      [txHash]
    )
    return !!row
  }

  /**
   * Insert a new ping event
   */
  async insertPing(
    txHash: string,
    blockNumber: number,
    status: 'pending' | 'confirmed'
  ): Promise<void> {
    try {
      await this.runAsync(
        'INSERT INTO ping_events (transaction_hash, block_number, status) VALUES (?, ?, ?)',
        [txHash, blockNumber, status]
      )
    } catch (error: any) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        throw error
      }
      // Silently ignore duplicate inserts (race condition protection)
    }
  }

  /**
   * Update ping event status
   */
  async updatePing(txHash: string, status: 'pending' | 'confirmed'): Promise<void> {
    await this.runAsync('UPDATE ping_events SET status = ? WHERE transaction_hash = ?', [
      status,
      txHash,
    ])
  }

  /**
   * Insert a new pong transaction
   */
  async insertPong(
    pingTxHash: string,
    pongTxHash: string,
    nonce: number,
    status: 'pending' | 'confirmed' | 'failed'
  ): Promise<void> {
    try {
      await this.runAsync(
        'INSERT INTO pong_transactions (ping_tx_hash, pong_tx_hash, nonce, status) VALUES (?, ?, ?, ?)',
        [pingTxHash, pongTxHash, nonce, status]
      )
    } catch (error: any) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        throw error
      }
      // Silently ignore duplicate inserts (race condition protection)
    }
  }

  /**
   * Update pong transaction status
   */
  async updatePong(
    pongTxHash: string,
    status: 'pending' | 'confirmed' | 'failed'
  ): Promise<void> {
    const confirmed_at = status === 'confirmed' ? new Date().toISOString() : null
    await this.runAsync(
      'UPDATE pong_transactions SET status = ?, confirmed_at = ? WHERE pong_tx_hash = ?',
      [status, confirmed_at, pongTxHash]
    )
  }

  /**
   * Get last processed block number
   */
  async getLastProcessedBlock(): Promise<number | null> {
    const row = await this.getAsync(
      'SELECT MAX(block_number) as last_block FROM ping_events'
    )
    return row?.last_block || null
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalPings: number
    confirmedPings: number
    pendingPings: number
    totalPongs: number
    confirmedPongs: number
    pendingPongs: number
    successRate: number
  }> {
    const pingStats = await this.getAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM ping_events
    `)

    const pongStats = await this.getAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM pong_transactions
    `)

    const totalPings = pingStats.total || 0
    const confirmedPongs = pongStats.confirmed || 0
    const successRate =
      totalPings > 0 ? Math.round((confirmedPongs / totalPings) * 100) : 0

    return {
      totalPings,
      confirmedPings: pingStats.confirmed || 0,
      pendingPings: pingStats.pending || 0,
      totalPongs: pongStats.total || 0,
      confirmedPongs,
      pendingPongs: pongStats.pending || 0,
      successRate,
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message)
          reject(err)
        } else {
          console.log('📦 Database connection closed')
          resolve()
        }
      })
    })
  }
}

export default Database
