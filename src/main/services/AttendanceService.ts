import * as db from '../../db/service'
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  MonthlySummary,
  Result,
  UpdateWorkSessionRequest,
  DeleteWorkSessionRequest
} from '../../shared/attendance'

export class AttendanceService {
  async clockIn(note?: string): Promise<Result<WorkSession>> {
    try {
      const clockInAt = new Date().toISOString()
      const session = await db.createWorkSession(clockInAt, note)
      return { ok: true, data: session }
    } catch (error) {
      console.error('Error clocking in:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async clockOut(): Promise<Result<WorkSession>> {
    try {
      const clockOutAt = new Date().toISOString()
      const session = await db.endWorkSession(clockOutAt)
      return { ok: true, data: session }
    } catch (error) {
      console.error('Error clocking out:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async startBreak(note?: string): Promise<Result<BreakSession>> {
    try {
      const startAt = new Date().toISOString()
      const breakSession = await db.createBreakSession(startAt, note)
      return { ok: true, data: breakSession }
    } catch (error) {
      console.error('Error starting break:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async endBreak(): Promise<Result<BreakSession>> {
    try {
      const endAt = new Date().toISOString()
      const breakSession = await db.endBreakSession(endAt)
      return { ok: true, data: breakSession }
    } catch (error) {
      console.error('Error ending break:', error)
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
      const dateStr = this.formatDate(baseDate)
      const summary = await db.getTodaySummary(dateStr)
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

  async updateWorkSession(request: UpdateWorkSessionRequest): Promise<Result<WorkSession>> {
    try {
      const session = await db.updateWorkSession(request.id, {
        clockInAt: request.clockInAt,
        clockOutAt: request.clockOutAt,
        note: request.note
      })
      return { ok: true, data: session }
    } catch (error) {
      console.error('Error updating work session:', error)
      return {
        ok: false,
        code: 'DB_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async deleteWorkSession(request: DeleteWorkSessionRequest): Promise<Result<void>> {
    try {
      await db.deleteWorkSession(request.id)
      return { ok: true, data: undefined }
    } catch (error) {
      console.error('Error deleting work session:', error)
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

  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}
