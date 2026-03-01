import * as db from '../../db/service'
import {
  type AttendanceLogRequest,
  type AttendanceLogsPage,
  type AttendanceSummary,
  type GetAttendanceLogsRequest,
  type GetTodaySummaryRequest,
  type Result
} from '../../shared/attendance'

export class AttendanceService {
  async logAttendance(request: AttendanceLogRequest): Promise<Result<{ id: number }>> {
    try {
      const timestamp = request.occurredAt ?? new Date().toISOString()
      const normalizedNote = request.note?.trim() || undefined
      const id = await db.saveAttendanceLog(request.eventType, timestamp, normalizedNote)
      return { ok: true, data: { id } }
    } catch (error) {
      console.error('Error logging attendance:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getLogs(request: GetAttendanceLogsRequest = {}): Promise<Result<AttendanceLogsPage>> {
    try {
      const logsPage = await db.getAttendanceLogs(request)
      return { ok: true, data: logsPage }
    } catch (error) {
      console.error('Error getting attendance logs:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getTodaySummary(request: GetTodaySummaryRequest = {}): Promise<Result<AttendanceSummary>> {
    try {
      const baseDate = request.date ? new Date(request.date) : new Date()
      const { startIso, endIso } = this.getDayRange(baseDate)
      const summary = await db.getTodaySummary(startIso, endIso)
      return { ok: true, data: summary }
    } catch (error) {
      console.error("Error getting today's summary:", error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private getDayRange(baseDate: Date): { startIso: string; endIso: string } {
    const start = new Date(baseDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { startIso: start.toISOString(), endIso: end.toISOString() }
  }
}
