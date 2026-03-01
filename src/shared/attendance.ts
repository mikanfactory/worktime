export const ATTENDANCE_EVENT_TYPES = [
  'clock_in',
  'clock_out',
  'break_start',
  'break_end'
] as const

export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number]

export type AttendanceErrorCode = 'VALIDATION_ERROR' | 'DB_ERROR' | 'INTERNAL_ERROR'

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: AttendanceErrorCode; message: string }

export interface AttendanceLog {
  id: number
  eventType: AttendanceEventType
  timestamp: string
  note?: string
  createdAt: string
}

export interface AttendanceLogsPage {
  logs: AttendanceLog[]
  nextCursor?: string
}

export interface AttendanceSummary {
  firstClockIn?: string
  latestEvent?: string
  workedSeconds: number
  isWorking: boolean
}

export interface AttendanceLogRequest {
  eventType: AttendanceEventType
  note?: string
  occurredAt?: string
}

export interface GetAttendanceLogsRequest {
  from?: string
  to?: string
  limit?: number
  cursor?: string
}

export interface GetTodaySummaryRequest {
  date?: string
}
