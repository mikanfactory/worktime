import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AttendanceApp from '../TranslationApp'
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  MonthlySummary,
  GetTodaySummaryRequest,
  UpdateWorkSessionRequest,
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  Result
} from '../../../shared/attendance'

type MockApi = {
  clockIn: ReturnType<typeof vi.fn<(note?: string) => Promise<Result<WorkSession>>>>
  clockOut: ReturnType<typeof vi.fn<() => Promise<Result<WorkSession>>>>
  startBreak: ReturnType<typeof vi.fn<(note?: string) => Promise<Result<BreakSession>>>>
  endBreak: ReturnType<typeof vi.fn<() => Promise<Result<BreakSession>>>>
  getTodaySummary: ReturnType<typeof vi.fn<(req?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>>>
  updateWorkSession: ReturnType<typeof vi.fn<(req: UpdateWorkSessionRequest) => Promise<Result<WorkSession>>>>
  deleteWorkSession: ReturnType<typeof vi.fn<(req: DeleteWorkSessionRequest) => Promise<Result<void>>>>
  createManualWorkSession: ReturnType<typeof vi.fn<(req: { date: string; clockInAt: string; clockOutAt: string }) => Promise<Result<WorkSession>>>>
  getDailySummaries: ReturnType<typeof vi.fn<(req: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>>>
  getMonthlySummary: ReturnType<typeof vi.fn<(req: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>>>
}

let mockApi: MockApi

beforeEach(() => {
  vi.clearAllMocks()
  mockApi = {
    clockIn: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00.000Z',
        breaks: [], createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T09:00:00.000Z'
      }
    }),
    clockOut: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: '2026-03-01T17:00:00.000Z',
        breaks: [], createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T17:00:00.000Z'
      }
    }),
    startBreak: vi.fn().mockResolvedValue({
      ok: true,
      data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z' }
    }),
    endBreak: vi.fn().mockResolvedValue({
      ok: true,
      data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T13:00:00.000Z' }
    }),
    getTodaySummary: vi.fn().mockResolvedValue({
      ok: true,
      data: { workedSeconds: 0, breakSeconds: 0, isWorking: false, isOnBreak: false }
    }),
    updateWorkSession: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    deleteWorkSession: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    createManualWorkSession: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    getDailySummaries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getMonthlySummary: vi.fn().mockResolvedValue({
      ok: true,
      data: { yearMonth: '2026-03', totalWorkedSeconds: 0, totalBreakSeconds: 0, workingDays: 0, dailySummaries: [] }
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

  it('should switch between tabs', async () => {
    render(<AttendanceApp />)

    fireEvent.click(screen.getByRole('button', { name: 'Daily Summary' }))
    fireEvent.click(screen.getByRole('button', { name: 'Attendance' }))

    await waitFor(() => {
      expect(screen.getByText('Elapsed Time')).toBeInTheDocument()
      expect(screen.getByText('Clock Out')).toBeInTheDocument()
    })
  })
})
