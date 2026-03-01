export interface ApiResult {
  success: boolean
  error?: string
  [key: string]: any
}

export interface AttendanceLog {
  id: number
  type: string
  timestamp: string
  note?: string
  created_at: string
}

export interface AttendanceLogsResult extends ApiResult {
  logs?: AttendanceLog[]
}

export type TabType = 'attendance' | 'attendance-history'
