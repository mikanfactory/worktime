import { app } from 'electron'
import * as sqlite3 from 'sqlite3'
import * as path from 'path'

export interface DatabaseConnection {
  db: sqlite3.Database
  inUse: boolean
  lastUsed: number
}

interface PendingRequest {
  resolve: (connection: DatabaseConnection) => void
  reject: (error: Error) => void
  timeoutHandle: NodeJS.Timeout
}

export class ConnectionPool {
  private connections: DatabaseConnection[] = []
  private waitQueue: PendingRequest[] = []
  private readonly dbPath: string
  private readonly maxConnections: number
  private readonly connectionTimeout: number
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly waitTimeout = 10000

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
    const availableConnection = this.connections.find((conn) => !conn.inUse)
    if (availableConnection) {
      availableConnection.inUse = true
      availableConnection.lastUsed = Date.now()
      return availableConnection
    }

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

    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        resolve: (connection) => {
          clearTimeout(request.timeoutHandle)
          resolve(connection)
        },
        reject: (error) => {
          clearTimeout(request.timeoutHandle)
          reject(error)
        },
        timeoutHandle: setTimeout(() => {
          this.waitQueue = this.waitQueue.filter((queuedRequest) => queuedRequest !== request)
          reject(new Error('Connection pool timeout: no available connections'))
        }, this.waitTimeout)
      }

      this.waitQueue.push(request)
    })
  }

  releaseConnection(connection: DatabaseConnection): void {
    const nextRequest = this.waitQueue.shift()
    if (nextRequest) {
      connection.inUse = true
      connection.lastUsed = Date.now()
      nextRequest.resolve(connection)
      return
    }

    connection.inUse = false
    connection.lastUsed = Date.now()
  }

  async executeQuery<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
    const connection = await this.getConnection()

    try {
      return new Promise((resolve, reject) => {
        connection.db.all(query, params, (err, rows) => {
          if (err) {
            reject(err)
            return
          }
          resolve(rows as T[])
        })
      })
    } finally {
      this.releaseConnection(connection)
    }
  }

  async executeGet<T = unknown>(query: string, params: unknown[] = []): Promise<T | undefined> {
    const connection = await this.getConnection()

    try {
      return new Promise((resolve, reject) => {
        connection.db.get(query, params, (err, row) => {
          if (err) {
            reject(err)
            return
          }
          resolve(row as T | undefined)
        })
      })
    } finally {
      this.releaseConnection(connection)
    }
  }

  async executeRun(
    query: string,
    params: unknown[] = []
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

    const remainingRequests = [...this.waitQueue]
    this.waitQueue = []
    for (const request of remainingRequests) {
      request.reject(new Error('Connection pool closed'))
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
