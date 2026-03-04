export type AttendanceErrorCode = 'VALIDATION_ERROR' | 'DB_ERROR' | 'INTERNAL_ERROR'

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; code: AttendanceErrorCode; message: string }

export interface BreakSession {
  id: number
  workSessionId: number
  startAt: string
  endAt?: string
  note?: string
}

export interface WorkSession {
  id: number
  date: string
  clockInAt: string
  clockOutAt?: string
  note?: string
  breaks: BreakSession[]
  createdAt: string
  updatedAt: string
}

export interface AttendanceSummary {
  firstClockIn?: string
  latestEvent?: string
  workedSeconds: number
  breakSeconds: number
  isWorking: boolean
  isOnBreak: boolean
  currentSession?: WorkSession
}

export interface DailySummary {
  date: string // YYYY-MM-DD
  workedSeconds: number
  breakSeconds: number
  firstClockIn?: string
  lastClockOut?: string
  sessionCount: number
  firstSessionId?: number
  lastSessionId?: number
}

export interface MonthlySummary {
  yearMonth: string // YYYY-MM
  totalWorkedSeconds: number
  totalBreakSeconds: number
  workingDays: number
  dailySummaries: DailySummary[]
}

// Request types

export interface GetTodaySummaryRequest {
  date?: string
}

export interface UpdateWorkSessionRequest {
  id: number
  clockInAt?: string
  clockOutAt?: string
  note?: string
}

export interface DeleteWorkSessionRequest {
  id: number
}

export interface GetDailySummariesRequest {
  yearMonth: string // YYYY-MM
}

export interface GetMonthlySummaryRequest {
  yearMonth: string // YYYY-MM
}

export interface CreateManualWorkSessionRequest {
  date: string // YYYY-MM-DD
  clockInAt: string // ISO8601
  clockOutAt: string // ISO8601
}
