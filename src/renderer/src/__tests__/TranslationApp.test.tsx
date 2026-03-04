import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AttendanceApp from '../TranslationApp'
import type {
  AttendanceLogRequest,
  AttendanceLogsPage,
  AttendanceSummary,
  GetAttendanceLogsRequest,
  GetTodaySummaryRequest,
  Result
} from '../../../shared/attendance'

type MockApi = {
  logAttendance: ReturnType<typeof vi.fn<(req: AttendanceLogRequest) => Promise<Result<{ id: number }>>>>
  getAttendanceLogs: ReturnType<typeof vi.fn<(req?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>>>
  getTodaySummary: ReturnType<typeof vi.fn<(req?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>>>
}

let mockApi: MockApi

beforeEach(() => {
  vi.clearAllMocks()
  mockApi = {
    logAttendance: vi.fn<(req: AttendanceLogRequest) => Promise<Result<{ id: number }>>>().mockResolvedValue({
      ok: true,
      data: { id: 1 }
    }),
    getAttendanceLogs: vi.fn<(req?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>>().mockResolvedValue({
      ok: true,
      data: { logs: [] }
    }),
    getTodaySummary: vi.fn<(req?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>>().mockResolvedValue({
      ok: true,
      data: { workedSeconds: 0, isWorking: false }
    })
  }

  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
    configurable: true
  })
})

describe('AttendanceApp', () => {
  it('should render with attendance panel by default', async () => {
    render(<AttendanceApp />)

    await waitFor(() => {
      expect(screen.getByText('Elapsed Time')).toBeInTheDocument()
      expect(screen.getByText('Clock Out')).toBeInTheDocument()
    })
  })

  it('should load logs when switching to attendance history tab', async () => {
    render(<AttendanceApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Attendance History' }))

    await waitFor(() => {
      expect(mockApi.getAttendanceLogs).toHaveBeenCalled()
    })
  })

  it('should switch back to attendance panel when attendance tab is clicked', async () => {
    render(<AttendanceApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Attendance History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Attendance' }))

    await waitFor(() => {
      expect(screen.getByText('Elapsed Time')).toBeInTheDocument()
      expect(screen.getByText('Clock Out')).toBeInTheDocument()
    })
  })
})
