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

// Daily summary
export interface DailySummary {
  date: string // YYYY-MM-DD
  workedSeconds: number
  firstClockIn?: string
  lastClockOut?: string
  logCount: number
}

// Monthly summary
export interface MonthlySummary {
  yearMonth: string // YYYY-MM
  totalWorkedSeconds: number
  workingDays: number
  dailySummaries: DailySummary[]
}

// Edit requests
export interface UpdateAttendanceLogRequest {
  id: number
  eventType?: AttendanceEventType
  timestamp?: string
  note?: string
}

export interface DeleteAttendanceLogRequest {
  id: number
}

// Summary requests
export interface GetDailySummariesRequest {
  yearMonth: string // YYYY-MM
}

export interface GetMonthlySummaryRequest {
  yearMonth: string // YYYY-MM
}
