import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AttendanceLog,
  AttendanceLogRequest,
  AttendanceLogsPage,
  AttendanceSummary,
  DailySummary,
  DeleteAttendanceLogRequest,
  GetAttendanceLogsRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  MonthlySummary,
  Result,
  UpdateAttendanceLogRequest
} from '../shared/attendance'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      logAttendance: (request: AttendanceLogRequest) => Promise<Result<{ id: number }>>
      getAttendanceLogs: (request?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>
      getTodaySummary: (request?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>
      updateAttendanceLog: (request: UpdateAttendanceLogRequest) => Promise<Result<AttendanceLog>>
      deleteAttendanceLog: (request: DeleteAttendanceLogRequest) => Promise<Result<void>>
      getDailySummaries: (request: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>
      getMonthlySummary: (request: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>
    }
  }
}
