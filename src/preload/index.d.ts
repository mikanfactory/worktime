import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  MonthlySummary,
  Result,
  UpdateWorkSessionRequest
} from '../shared/attendance'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      clockIn: (note?: string) => Promise<Result<WorkSession>>
      clockOut: () => Promise<Result<WorkSession>>
      startBreak: (note?: string) => Promise<Result<BreakSession>>
      endBreak: () => Promise<Result<BreakSession>>
      getTodaySummary: (request?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>
      updateWorkSession: (request: UpdateWorkSessionRequest) => Promise<Result<WorkSession>>
      deleteWorkSession: (request: DeleteWorkSessionRequest) => Promise<Result<void>>
      getDailySummaries: (request: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>
      getMonthlySummary: (request: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>
    }
  }
}
