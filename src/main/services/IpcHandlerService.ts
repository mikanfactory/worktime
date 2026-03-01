import { ipcMain } from 'electron'
import { AttendanceService } from './AttendanceService'
import {
  ATTENDANCE_EVENT_TYPES,
  type AttendanceLogRequest,
  type GetAttendanceLogsRequest,
  type GetTodaySummaryRequest,
  type Result
} from '../../shared/attendance'

export class IpcHandlerService {
  constructor(private attendanceService: AttendanceService) {}

  registerHandlers(): void {
    ipcMain.handle('attendance:log', async (_, payload: unknown) => {
      const validated = this.validateLogRequest(payload)
      if (!validated.ok) {
        return validated
      }
      return await this.attendanceService.logAttendance(validated.data)
    })

    ipcMain.handle('attendance:getLogs', async (_, payload: unknown) => {
      const validated = this.validateGetLogsRequest(payload)
      if (!validated.ok) {
        return validated
      }
      return await this.attendanceService.getLogs(validated.data)
    })

    ipcMain.handle('attendance:getTodaySummary', async (_, payload: unknown) => {
      const validated = this.validateGetTodaySummaryRequest(payload)
      if (!validated.ok) {
        return validated
      }
      return await this.attendanceService.getTodaySummary(validated.data)
    })
  }

  private validateLogRequest(payload: unknown): Result<AttendanceLogRequest> {
    if (!this.isRecord(payload)) {
      return this.validationError('attendance:log payload must be an object')
    }

    const { eventType, note, occurredAt } = payload
    if (
      typeof eventType !== 'string' ||
      !ATTENDANCE_EVENT_TYPES.includes(eventType as AttendanceLogRequest['eventType'])
    ) {
      return this.validationError(`eventType must be one of: ${ATTENDANCE_EVENT_TYPES.join(', ')}`)
    }

    if (note !== undefined && (typeof note !== 'string' || note.length > 1000)) {
      return this.validationError('note must be a string with max length 1000')
    }

    if (occurredAt !== undefined && !this.isIsoDateString(occurredAt)) {
      return this.validationError('occurredAt must be a valid ISO8601 string')
    }

    return {
      ok: true,
      data: {
        eventType: eventType as AttendanceLogRequest['eventType'],
        note: note as string | undefined,
        occurredAt: occurredAt as string | undefined
      }
    }
  }

  private validateGetLogsRequest(payload: unknown): Result<GetAttendanceLogsRequest> {
    if (payload === undefined || payload === null) {
      return { ok: true, data: { limit: 50 } }
    }

    if (!this.isRecord(payload)) {
      return this.validationError('attendance:getLogs payload must be an object')
    }

    const { from, to, limit, cursor } = payload

    if (from !== undefined && !this.isIsoDateString(from)) {
      return this.validationError('from must be a valid ISO8601 string')
    }

    if (to !== undefined && !this.isIsoDateString(to)) {
      return this.validationError('to must be a valid ISO8601 string')
    }

    if (cursor !== undefined && typeof cursor !== 'string') {
      return this.validationError('cursor must be a string')
    }

    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 200)) {
      return this.validationError('limit must be an integer between 1 and 200')
    }

    return {
      ok: true,
      data: {
        from,
        to,
        cursor: cursor as string | undefined,
        limit: typeof limit === 'number' ? limit : 50
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
