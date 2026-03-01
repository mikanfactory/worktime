import { ConnectionPool } from './ConnectionPool'
import * as sqlite3 from 'sqlite3'
import {
  ATTENDANCE_EVENT_TYPES,
  type AttendanceEventType,
  type AttendanceLog,
  type AttendanceLogsPage,
  type AttendanceSummary
} from '../../shared/attendance'

interface Migration {
  id: string
  statements: string[]
}

interface AttendanceLogRow {
  id: number
  event_type?: string
  type?: string
  timestamp: string
  note?: string | null
  created_at: string
}

interface CursorPayload {
  timestamp: string
  id: number
}

const ATTENDANCE_EVENT_TYPES_SQL = ATTENDANCE_EVENT_TYPES.map((eventType) => `'${eventType}'`).join(', ')

const MIGRATIONS: Migration[] = [
  {
    id: '001_create_attendance_logs',
    statements: [
      `CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL DEFAULT 'clock_in' CHECK(event_type IN (${ATTENDANCE_EVENT_TYPES_SQL})),
        type TEXT,
        timestamp TEXT NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    ]
  },
  {
    id: '002_add_event_type_to_legacy_logs',
    statements: [
      'ALTER TABLE attendance_logs ADD COLUMN event_type TEXT;',
      `UPDATE attendance_logs
         SET event_type = CASE
           WHEN type IN ('退勤', 'clock_out') THEN 'clock_out'
           WHEN type IN ('休憩開始', 'break_start') THEN 'break_start'
           WHEN type IN ('休憩終了', 'break_end') THEN 'break_end'
           ELSE 'clock_in'
         END
       WHERE event_type IS NULL OR event_type = '';`
    ]
  },
  {
    id: '003_add_indexes',
    statements: [
      'CREATE INDEX IF NOT EXISTS idx_attendance_logs_timestamp ON attendance_logs(timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_type_timestamp ON attendance_logs(event_type, timestamp DESC);'
    ]
  },
  {
    id: '004_add_event_type_triggers',
    statements: [
      `CREATE TRIGGER IF NOT EXISTS trg_attendance_event_type_insert
        BEFORE INSERT ON attendance_logs
        FOR EACH ROW
        WHEN NEW.event_type NOT IN (${ATTENDANCE_EVENT_TYPES_SQL})
      BEGIN
        SELECT RAISE(ABORT, 'Invalid event_type');
      END;`,
      `CREATE TRIGGER IF NOT EXISTS trg_attendance_event_type_update
        BEFORE UPDATE OF event_type ON attendance_logs
        FOR EACH ROW
        WHEN NEW.event_type NOT IN (${ATTENDANCE_EVENT_TYPES_SQL})
      BEGIN
        SELECT RAISE(ABORT, 'Invalid event_type');
      END;`
    ]
  }
]

export class DatabaseService {
  private connectionPool: ConnectionPool
  private initialized = false
  private initializationPromise: Promise<void> | null = null

  constructor() {
    this.connectionPool = new ConnectionPool()
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initializationPromise) {
      await this.initializationPromise
      return
    }

    this.initializationPromise = this.initializeInternal()
    try {
      await this.initializationPromise
    } finally {
      this.initializationPromise = null
    }
  }

  private async initializeInternal(): Promise<void> {
    try {
      await this.connectionPool.executeRun(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.runMigrations()
      this.initialized = true
    } catch (error) {
      this.initialized = false
      throw error
    }
  }

  private async runMigrations(): Promise<void> {
    const appliedRows = await this.connectionPool.executeQuery<{ id: string }>(
      'SELECT id FROM schema_migrations'
    )
    const appliedMigrationIds = new Set(appliedRows.map((row) => row.id))

    for (const migration of MIGRATIONS) {
      if (appliedMigrationIds.has(migration.id)) {
        continue
      }

      await this.connectionPool.executeTransaction(async (db) => {
        for (const statement of migration.statements) {
          try {
            await this.runStatement(db, statement)
          } catch (error) {
            if (this.isIgnorableMigrationError(error)) {
              continue
            }
            throw error
          }
        }

        await this.runStatement(db, 'INSERT INTO schema_migrations (id) VALUES (?)', [migration.id])
      })
    }
  }

  private runStatement(db: sqlite3.Database, query: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(query, params, (err: Error | null) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  private isIgnorableMigrationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return (
      message.includes('duplicate column name: event_type') ||
      message.includes('no such column: type')
    )
  }

  async saveAttendanceLog(
    eventType: AttendanceEventType,
    timestamp: string,
    note?: string
  ): Promise<number> {
    if (!this.initialized) {
      await this.initialize()
    }

    const result = await this.connectionPool.executeRun(
      'INSERT INTO attendance_logs (event_type, type, timestamp, note) VALUES (?, ?, ?, ?)',
      [eventType, this.toLegacyType(eventType), timestamp, note ?? null]
    )
    return result.lastID
  }

  async getAttendanceLogs({
    from,
    to,
    limit = 50,
    cursor
  }: {
    from?: string
    to?: string
    limit?: number
    cursor?: string
  }): Promise<AttendanceLogsPage> {
    if (!this.initialized) {
      await this.initialize()
    }

    const safeLimit = Math.max(1, Math.min(limit, 200))
    const whereClauses: string[] = []
    const params: unknown[] = []

    if (from) {
      whereClauses.push('timestamp >= ?')
      params.push(from)
    }

    if (to) {
      whereClauses.push('timestamp < ?')
      params.push(to)
    }

    const decodedCursor = cursor ? this.decodeCursor(cursor) : null
    if (decodedCursor) {
      whereClauses.push('(timestamp < ? OR (timestamp = ? AND id < ?))')
      params.push(decodedCursor.timestamp, decodedCursor.timestamp, decodedCursor.id)
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    params.push(safeLimit)

    const rows = await this.connectionPool.executeQuery<AttendanceLogRow>(
      `SELECT id, event_type, type, timestamp, note, created_at
         FROM attendance_logs
         ${whereClause}
         ORDER BY timestamp DESC, id DESC
         LIMIT ?`,
      params
    )

    const logs: AttendanceLog[] = rows.map((row) => ({
      id: row.id,
      eventType: this.normalizeEventType(row.event_type, row.type),
      timestamp: row.timestamp,
      note: row.note ?? undefined,
      createdAt: row.created_at
    }))

    const nextCursor =
      logs.length === safeLimit ? this.encodeCursor(logs[logs.length - 1].timestamp, logs[logs.length - 1].id) : undefined

    return { logs, nextCursor }
  }

  async getTodaySummary(dayStartIso: string, dayEndIso: string): Promise<AttendanceSummary> {
    if (!this.initialized) {
      await this.initialize()
    }

    const firstClockIn = await this.connectionPool.executeGet<{ first_clock_in?: string }>(
      `SELECT MIN(timestamp) AS first_clock_in
         FROM attendance_logs
        WHERE timestamp >= ?
          AND timestamp < ?
          AND (
            event_type = 'clock_in'
            OR (event_type IS NULL AND type IN ('打刻', '出勤', 'clock_in'))
          )`,
      [dayStartIso, dayEndIso]
    )

    const latestEvent = await this.connectionPool.executeGet<{ latest_event?: string }>(
      `SELECT MAX(timestamp) AS latest_event
         FROM attendance_logs
        WHERE timestamp >= ?
          AND timestamp < ?`,
      [dayStartIso, dayEndIso]
    )

    const events = await this.connectionPool.executeQuery<{ event_type: string; timestamp: string }>(
      `SELECT event_type, timestamp
         FROM attendance_logs
        WHERE timestamp >= ?
          AND timestamp < ?
          AND event_type IN ('clock_in', 'clock_out')
        ORDER BY timestamp ASC, id ASC`,
      [dayStartIso, dayEndIso]
    )

    let workedSeconds = 0
    let currentClockInTime: number | null = null

    for (const event of events) {
      if (event.event_type === 'clock_in' && currentClockInTime === null) {
        currentClockInTime = new Date(event.timestamp).getTime()
      } else if (event.event_type === 'clock_out' && currentClockInTime !== null) {
        workedSeconds += Math.floor((new Date(event.timestamp).getTime() - currentClockInTime) / 1000)
        currentClockInTime = null
      }
    }

    const isWorking = currentClockInTime !== null
    if (currentClockInTime !== null) {
      workedSeconds += Math.floor((Date.now() - currentClockInTime) / 1000)
    }

    const firstClockInIso = firstClockIn?.first_clock_in
    return {
      firstClockIn: firstClockInIso || undefined,
      latestEvent: latestEvent?.latest_event || undefined,
      workedSeconds: Math.max(0, workedSeconds),
      isWorking
    }
  }

  private encodeCursor(timestamp: string, id: number): string {
    const payload: CursorPayload = { timestamp, id }
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
  }

  private decodeCursor(cursor: string): CursorPayload | null {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.timestamp === 'string' &&
        Number.isInteger(parsed.id)
      ) {
        return { timestamp: parsed.timestamp, id: parsed.id }
      }
      return null
    } catch {
      return null
    }
  }

  private normalizeEventType(eventType?: string, legacyType?: string): AttendanceEventType {
    if (eventType && ATTENDANCE_EVENT_TYPES.includes(eventType as AttendanceEventType)) {
      return eventType as AttendanceEventType
    }

    switch (legacyType) {
      case '退勤':
      case 'clock_out':
        return 'clock_out'
      case '休憩開始':
      case 'break_start':
        return 'break_start'
      case '休憩終了':
      case 'break_end':
        return 'break_end'
      default:
        return 'clock_in'
    }
  }

  private toLegacyType(eventType: AttendanceEventType): string {
    switch (eventType) {
      case 'clock_out':
        return '退勤'
      case 'break_start':
        return '休憩開始'
      case 'break_end':
        return '休憩終了'
      case 'clock_in':
      default:
        return '打刻'
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
