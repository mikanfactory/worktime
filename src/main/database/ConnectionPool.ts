import { app } from 'electron'
import * as sqlite3 from 'sqlite3'
import * as path from 'path'

export interface DatabaseConnection {
  db: sqlite3.Database
  inUse: boolean
  lastUsed: number
}

export class ConnectionPool {
  private connections: DatabaseConnection[] = []
  private readonly dbPath: string
  private readonly maxConnections: number
  private readonly connectionTimeout: number
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(maxConnections = 5, connectionTimeout = 30000) {
    this.dbPath = path.join(app.getPath('userData'), 'beaver_log.db')
    this.maxConnections = maxConnections
    this.connectionTimeout = connectionTimeout
    this.startCleanupInterval()
  }

  private createConnection(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
          return
        }

        // Enable WAL mode for better concurrent access
        db.run('PRAGMA journal_mode=WAL', (walErr) => {
          if (walErr) {
            console.warn('Failed to enable WAL mode:', walErr)
          }
        })

        // Set busy timeout
        db.run('PRAGMA busy_timeout=5000', (timeoutErr) => {
          if (timeoutErr) {
            console.warn('Failed to set busy timeout:', timeoutErr)
          }
        })

        resolve(db)
      })
    })
  }

  async getConnection(): Promise<DatabaseConnection> {
    // Try to find an available connection
    const availableConnection = this.connections.find((conn) => !conn.inUse)

    if (availableConnection) {
      availableConnection.inUse = true
      availableConnection.lastUsed = Date.now()
      return availableConnection
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      try {
        const db = await this.createConnection()
        const connection: DatabaseConnection = {
          db,
          inUse: true,
          lastUsed: Date.now()
        }
        this.connections.push(connection)
        return connection
      } catch (error) {
        throw new Error(`Failed to create database connection: ${error}`)
      }
    }

    // Wait for an available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection pool timeout: no available connections'))
      }, 10000) // 10 second timeout

      const checkForConnection = () => {
        const availableConn = this.connections.find((conn) => !conn.inUse)
        if (availableConn) {
          clearTimeout(timeout)
          availableConn.inUse = true
          availableConn.lastUsed = Date.now()
          resolve(availableConn)
        } else {
          setTimeout(checkForConnection, 100) // Check every 100ms
        }
      }

      checkForConnection()
    })
  }

  releaseConnection(connection: DatabaseConnection): void {
    connection.inUse = false
    connection.lastUsed = Date.now()
  }

  async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    console.log('ConnectionPool: executeQuery called with query:', query, 'params:', params)
    const connection = await this.getConnection()
    console.log('ConnectionPool: Got connection, executing query...')

    try {
      return new Promise((resolve, reject) => {
        connection.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('ConnectionPool: Query error:', err)
            reject(err)
            return
          }
          console.log('ConnectionPool: Query successful, rows:', rows?.length || 0)
          resolve(rows as T[])
        })
      })
    } finally {
      this.releaseConnection(connection)
      console.log('ConnectionPool: Connection released')
    }
  }

  async executeRun(
    query: string,
    params: any[] = []
  ): Promise<{ lastID: number; changes: number }> {
    const connection = await this.getConnection()

    try {
      return new Promise((resolve, reject) => {
        connection.db.run(query, params, function (err) {
          if (err) {
            reject(err)
            return
          }
          resolve({ lastID: this.lastID, changes: this.changes })
        })
      })
    } finally {
      this.releaseConnection(connection)
    }
  }

  async executeTransaction<T>(operations: (db: sqlite3.Database) => Promise<T>): Promise<T> {
    const connection = await this.getConnection()

    try {
      return new Promise((resolve, reject) => {
        connection.db.serialize(() => {
          connection.db.run('BEGIN TRANSACTION')

          operations(connection.db)
            .then((result) => {
              connection.db.run('COMMIT', (err) => {
                if (err) {
                  reject(err)
                } else {
                  resolve(result)
                }
              })
            })
            .catch((error) => {
              connection.db.run('ROLLBACK', () => {
                reject(error)
              })
            })
        })
      })
    } finally {
      this.releaseConnection(connection)
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      this.connections = this.connections.filter((connection) => {
        if (!connection.inUse && now - connection.lastUsed > this.connectionTimeout) {
          connection.db.close((err) => {
            if (err) {
              console.error('Error closing idle database connection:', err)
            }
          })
          return false
        }
        return true
      })
    }, 60000) // Check every minute
  }

  async closeAll(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    const closePromises = this.connections.map(
      (connection) =>
        new Promise<void>((resolve) => {
          connection.db.close((err) => {
            if (err) {
              console.error('Error closing database connection:', err)
            }
            resolve()
          })
        })
    )

    await Promise.all(closePromises)
    this.connections = []
  }

  getPoolStatus(): {
    totalConnections: number
    activeConnections: number
    availableConnections: number
  } {
    const active = this.connections.filter((conn) => conn.inUse).length
    return {
      totalConnections: this.connections.length,
      activeConnections: active,
      availableConnections: this.connections.length - active
    }
  }
}
