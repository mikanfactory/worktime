import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AttendanceLogRequest,
  AttendanceLogsPage,
  AttendanceSummary,
  GetAttendanceLogsRequest,
  GetTodaySummaryRequest,
  Result
} from '../shared/attendance'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      logAttendance: (request: AttendanceLogRequest) => Promise<Result<{ id: number }>>
      getAttendanceLogs: (request?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>
      getTodaySummary: (request?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>
    }
  }
}
