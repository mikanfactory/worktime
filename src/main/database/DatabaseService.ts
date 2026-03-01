import { ConnectionPool } from './ConnectionPool'
import { up as createAttendanceLogsTable } from './migrations/003_create_attendance_logs'

export interface AttendanceLog {
  id: number
  type: string
  timestamp: string
  note?: string
  created_at: string
}

export class DatabaseService {
  private connectionPool: ConnectionPool
  private initialized = false

  constructor() {
    this.connectionPool = new ConnectionPool()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Check if the attendance_logs table exists
      const attendanceTables = await this.connectionPool.executeQuery<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='attendance_logs'"
      )

      // If the table doesn't exist, run the migration
      if (attendanceTables.length === 0) {
        console.log('attendance_logs table does not exist. Running migrations...')
        await this.connectionPool.executeRun(createAttendanceLogsTable)
        console.log('Attendance logs migration completed successfully')
      } else {
        console.log('attendance_logs table already exists.')
      }

      this.initialized = true
    } catch (error) {
      console.error('Error initializing database:', error)
      throw error
    }
  }

  async saveAttendanceLog(type: string, timestamp: string, note?: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const result = await this.connectionPool.executeRun(
        'INSERT INTO attendance_logs (type, timestamp, note) VALUES (?, ?, ?)',
        [type, timestamp, note || null]
      )

      return result.lastID
    } catch (error) {
      console.error('Error saving attendance log:', error)
      throw error
    }
  }

  async getTodayAttendanceLogs(): Promise<AttendanceLog[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return await this.connectionPool.executeQuery<AttendanceLog>(
        "SELECT * FROM attendance_logs WHERE type = '打刻' AND timestamp >= ? ORDER BY timestamp ASC",
        [today.toISOString()]
      )
    } catch (error) {
      console.error('Error getting today attendance logs:', error)
      throw error
    }
  }

  async getAttendanceLogs(limit = 100, offset = 0): Promise<AttendanceLog[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const logs = await this.connectionPool.executeQuery<AttendanceLog>(
        'SELECT * FROM attendance_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      )

      return logs
    } catch (error) {
      console.error('Error getting attendance logs:', error)
      throw error
    }
  }

  getPoolStatus() {
    return this.connectionPool.getPoolStatus()
  }

  async close(): Promise<void> {
    await this.connectionPool.closeAll()
    this.initialized = false
  }
}

// Export singleton instance
export const databaseService = new DatabaseService()
