import * as db from '../../db/service'
import {
  type AttendanceLog,
  type AttendanceLogRequest,
  type AttendanceLogsPage,
  type AttendanceSummary,
  type DailySummary,
  type DeleteAttendanceLogRequest,
  type GetAttendanceLogsRequest,
  type GetDailySummariesRequest,
  type GetMonthlySummaryRequest,
  type GetTodaySummaryRequest,
  type MonthlySummary,
  type Result,
  type UpdateAttendanceLogRequest
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

  async updateLog(request: UpdateAttendanceLogRequest): Promise<Result<AttendanceLog>> {
    try {
      const log = await db.updateAttendanceLog(request.id, {
        eventType: request.eventType,
        timestamp: request.timestamp,
        note: request.note
      })
      return { ok: true, data: log }
    } catch (error) {
      console.error('Error updating attendance log:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async deleteLog(request: DeleteAttendanceLogRequest): Promise<Result<void>> {
    try {
      await db.deleteAttendanceLog(request.id)
      return { ok: true, data: undefined }
    } catch (error) {
      console.error('Error deleting attendance log:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getDailySummaries(request: GetDailySummariesRequest): Promise<Result<DailySummary[]>> {
    try {
      const summaries = await db.getDailySummaries(request.yearMonth)
      return { ok: true, data: summaries }
    } catch (error) {
      console.error('Error getting daily summaries:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getMonthlySummary(request: GetMonthlySummaryRequest): Promise<Result<MonthlySummary>> {
    try {
      const summary = await db.getMonthlySummary(request.yearMonth)
      return { ok: true, data: summary }
    } catch (error) {
      console.error('Error getting monthly summary:', error)
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
