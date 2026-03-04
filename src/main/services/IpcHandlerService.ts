import { ipcMain } from 'electron'
import { AttendanceService } from './AttendanceService'
import type {
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  Result,
  UpdateWorkSessionRequest
} from '../../shared/attendance'

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/

export class IpcHandlerService {
  constructor(private attendanceService: AttendanceService) {}

  registerHandlers(): void {
    ipcMain.handle('attendance:clockIn', async (_, payload: unknown) => {
      const validated = this.validateOptionalNoteRequest(payload, 'attendance:clockIn')
      if (!validated.ok) return validated
      return await this.attendanceService.clockIn(validated.data.note)
    })

    ipcMain.handle('attendance:clockOut', async () => {
      return await this.attendanceService.clockOut()
    })

    ipcMain.handle('attendance:startBreak', async (_, payload: unknown) => {
      const validated = this.validateOptionalNoteRequest(payload, 'attendance:startBreak')
      if (!validated.ok) return validated
      return await this.attendanceService.startBreak(validated.data.note)
    })

    ipcMain.handle('attendance:endBreak', async () => {
      return await this.attendanceService.endBreak()
    })

    ipcMain.handle('attendance:getTodaySummary', async (_, payload: unknown) => {
      const validated = this.validateGetTodaySummaryRequest(payload)
      if (!validated.ok) return validated
      return await this.attendanceService.getTodaySummary(validated.data)
    })

    ipcMain.handle('attendance:updateWorkSession', async (_, payload: unknown) => {
      const validated = this.validateUpdateWorkSessionRequest(payload)
      if (!validated.ok) return validated
      return await this.attendanceService.updateWorkSession(validated.data)
    })

    ipcMain.handle('attendance:deleteWorkSession', async (_, payload: unknown) => {
      const validated = this.validateDeleteWorkSessionRequest(payload)
      if (!validated.ok) return validated
      return await this.attendanceService.deleteWorkSession(validated.data)
    })

    ipcMain.handle('attendance:getDailySummaries', async (_, payload: unknown) => {
      const validated = this.validateYearMonthRequest(payload, 'attendance:getDailySummaries')
      if (!validated.ok) return validated
      return await this.attendanceService.getDailySummaries(validated.data)
    })

    ipcMain.handle('attendance:getMonthlySummary', async (_, payload: unknown) => {
      const validated = this.validateYearMonthRequest(payload, 'attendance:getMonthlySummary')
      if (!validated.ok) return validated
      return await this.attendanceService.getMonthlySummary(validated.data)
    })
  }

  private validateOptionalNoteRequest(
    payload: unknown,
    channel: string
  ): Result<{ note?: string }> {
    if (payload === undefined || payload === null) {
      return { ok: true, data: {} }
    }

    if (!this.isRecord(payload)) {
      return this.validationError(`${channel} payload must be an object`)
    }

    const { note } = payload

    if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) {
      return this.validationError('note must be a string with max length 1000')
    }

    return {
      ok: true,
      data: {
        note: typeof note === 'string' ? note.trim() || undefined : undefined
      }
    }
  }

  private validateGetTodaySummaryRequest(payload: unknown): Result<GetTodaySummaryRequest> {
    if (payload === undefined || payload === null) {
      return { ok: true, data: {} }
    }

    if (!this.isRecord(payload)) {
      return this.validationError('attendance:getTodaySummary payload must be an object')
    }

    const { date } = payload
    if (date !== undefined && !this.isIsoDateString(date)) {
      return this.validationError('date must be a valid ISO8601 string')
    }

    return { ok: true, data: { date: date as string | undefined } }
  }

  private validateUpdateWorkSessionRequest(payload: unknown): Result<UpdateWorkSessionRequest> {
    if (!this.isRecord(payload)) {
      return this.validationError('attendance:updateWorkSession payload must be an object')
    }

    const { id, clockInAt, clockOutAt, note } = payload

    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      return this.validationError('id must be a positive integer')
    }

    if (clockInAt !== undefined && !this.isIsoDateString(clockInAt)) {
      return this.validationError('clockInAt must be a valid ISO8601 string')
    }

    if (clockOutAt !== undefined && !this.isIsoDateString(clockOutAt)) {
      return this.validationError('clockOutAt must be a valid ISO8601 string')
    }

    if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) {
      return this.validationError('note must be a string with max length 1000')
    }

    return {
      ok: true,
      data: {
        id: id as number,
        clockInAt: clockInAt as string | undefined,
        clockOutAt: clockOutAt as string | undefined,
        note: note as string | undefined
      }
    }
  }

  private validateDeleteWorkSessionRequest(payload: unknown): Result<DeleteWorkSessionRequest> {
    if (!this.isRecord(payload)) {
      return this.validationError('attendance:deleteWorkSession payload must be an object')
    }

    const { id } = payload

    if (typeof id !== 'number' || !Number.isInteger(id) || id < 1) {
      return this.validationError('id must be a positive integer')
    }

    return { ok: true, data: { id: id as number } }
  }

  private validateYearMonthRequest(
    payload: unknown,
    channel: string
  ): Result<GetDailySummariesRequest & GetMonthlySummaryRequest> {
    if (!this.isRecord(payload)) {
      return this.validationError(`${channel} payload must be an object`)
    }

    const { yearMonth } = payload

    if (typeof yearMonth !== 'string' || !YEAR_MONTH_PATTERN.test(yearMonth)) {
      return this.validationError('yearMonth must match YYYY-MM format')
    }

    return { ok: true, data: { yearMonth } }
  }

  private validationError(message: string): Result<never> {
    return { ok: false, code: 'VALIDATION_ERROR', message }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  private isIsoDateString(value: unknown): value is string {
    if (typeof value !== 'string') return false
    const parsed = new Date(value)
    return !Number.isNaN(parsed.getTime())
  }
}
