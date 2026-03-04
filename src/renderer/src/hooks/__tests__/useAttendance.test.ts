import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAttendance } from '../useAttendance'
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  MonthlySummary,
  GetTodaySummaryRequest,
  Result,
  UpdateWorkSessionRequest,
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest
} from '../../../../shared/attendance'

type MockApi = {
  clockIn: ReturnType<typeof vi.fn<(note?: string) => Promise<Result<WorkSession>>>>
  clockOut: ReturnType<typeof vi.fn<() => Promise<Result<WorkSession>>>>
  startBreak: ReturnType<typeof vi.fn<(note?: string) => Promise<Result<BreakSession>>>>
  endBreak: ReturnType<typeof vi.fn<() => Promise<Result<BreakSession>>>>
  getTodaySummary: ReturnType<typeof vi.fn<(req?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>>>
  updateWorkSession: ReturnType<typeof vi.fn<(req: UpdateWorkSessionRequest) => Promise<Result<WorkSession>>>>
  deleteWorkSession: ReturnType<typeof vi.fn<(req: DeleteWorkSessionRequest) => Promise<Result<void>>>>
  getDailySummaries: ReturnType<typeof vi.fn<(req: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>>>
  getMonthlySummary: ReturnType<typeof vi.fn<(req: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>>>
}

let mockApi: MockApi

beforeEach(() => {
  mockApi = {
    clockIn: vi.fn(),
    clockOut: vi.fn(),
    startBreak: vi.fn(),
    endBreak: vi.fn(),
    getTodaySummary: vi.fn(),
    updateWorkSession: vi.fn(),
    deleteWorkSession: vi.fn(),
    getDailySummaries: vi.fn(),
    getMonthlySummary: vi.fn()
  }

  Object.defineProperty(window, 'api', {
    value: mockApi,
    writable: true,
    configurable: true
  })
})

describe('initial state', () => {
  it('should start with idle status and empty data', () => {
    mockApi.getTodaySummary.mockResolvedValue({
      ok: true,
      data: { workedSeconds: 0, breakSeconds: 0, isWorking: false, isOnBreak: false }
    })

    const { result } = renderHook(() => useAttendance())

    expect(result.current.summary).toEqual({
      workedSeconds: 0,
      breakSeconds: 0,
      isWorking: false,
      isOnBreak: false
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isLoggingAttendance).toBe(false)
  })
})

describe('loadTodaySummary', () => {
  it('should update summary on success', async () => {
    const summary: AttendanceSummary = {
      firstClockIn: '2026-03-01T09:00:00Z',
      workedSeconds: 3600,
      breakSeconds: 0,
      isWorking: true,
      isOnBreak: false
    }
    mockApi.getTodaySummary.mockResolvedValue({ ok: true, data: summary })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.summary).toEqual(summary)
    expect(result.current.status).toBe('success')
  })

  it('should set error on failure result', async () => {
    mockApi.getTodaySummary.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'Summary failed'
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Summary failed')
  })

  it('should set error on exception', async () => {
    mockApi.getTodaySummary.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.error).toBe('Network error')
  })
})

describe('clockIn', () => {
  it('should return true on success', async () => {
    mockApi.clockIn.mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00Z',
        breaks: [], createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-01T09:00:00Z'
      }
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.clockIn()
    })

    expect(success).toBe(true)
    expect(result.current.status).toBe('success')
    expect(result.current.isLoggingAttendance).toBe(false)
  })

  it('should return false on failure result', async () => {
    mockApi.clockIn.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'Already clocked in'
    })

    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.clockIn()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Already clocked in')
  })

  it('should return false on exception', async () => {
    mockApi.clockIn.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.clockIn()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Network error')
  })

  it('should pass note to API', async () => {
    mockApi.clockIn.mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00Z',
        breaks: [], createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-01T09:00:00Z'
      }
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.clockIn('Remote')
    })

    expect(mockApi.clockIn).toHaveBeenCalledWith('Remote')
  })
})

describe('clockOut', () => {
  it('should return true on success', async () => {
    mockApi.clockOut.mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00Z',
        clockOutAt: '2026-03-01T17:00:00Z',
        breaks: [], createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-01T17:00:00Z'
      }
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.clockOut()
    })

    expect(success).toBe(true)
  })
})

describe('startBreak', () => {
  it('should return true on success', async () => {
    mockApi.startBreak.mockResolvedValue({
      ok: true,
      data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00Z' }
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.startBreak()
    })

    expect(success).toBe(true)
  })

  it('should return false on failure', async () => {
    mockApi.startBreak.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'No open session'
    })

    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.startBreak()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('No open session')
  })
})

describe('endBreak', () => {
  it('should return true on success', async () => {
    mockApi.endBreak.mockResolvedValue({
      ok: true,
      data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00Z', endAt: '2026-03-01T13:00:00Z' }
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.endBreak()
    })

    expect(success).toBe(true)
  })
})

describe('loadDailySummaries', () => {
  it('loads daily summaries', async () => {
    const mockSummaries: DailySummary[] = [
      {
        date: '2026-03-01',
        workedSeconds: 28800,
        breakSeconds: 3600,
        firstClockIn: '2026-03-01T09:00:00.000Z',
        lastClockOut: '2026-03-01T17:00:00.000Z',
        sessionCount: 1
      }
    ]

    mockApi.getDailySummaries.mockResolvedValue({
      ok: true,
      data: mockSummaries
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadDailySummaries('2026-03')
    })

    expect(result.current.dailySummaries).toEqual(mockSummaries)
    expect(result.current.status).toBe('success')
  })

  it('handles error on loadDailySummaries', async () => {
    mockApi.getDailySummaries.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'Database error'
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadDailySummaries('2026-03')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Database error')
  })
})

describe('loadMonthlySummary', () => {
  it('loads monthly summary', async () => {
    const mockSummary: MonthlySummary = {
      yearMonth: '2026-03',
      totalWorkedSeconds: 57600,
      totalBreakSeconds: 3600,
      workingDays: 2,
      dailySummaries: []
    }

    mockApi.getMonthlySummary.mockResolvedValue({
      ok: true,
      data: mockSummary
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadMonthlySummary('2026-03')
    })

    expect(result.current.monthlySummary).toEqual(mockSummary)
    expect(result.current.status).toBe('success')
  })
})

describe('updateWorkSession', () => {
  it('updates a work session', async () => {
    mockApi.updateWorkSession.mockResolvedValue({
      ok: true,
      data: {
        id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:30:00Z',
        clockOutAt: '2026-03-01T17:00:00Z',
        breaks: [], createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-01T17:00:00Z'
      }
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.updateWorkSession({
        id: 1,
        clockInAt: '2026-03-01T09:30:00Z'
      })
    })

    expect(success).toBe(true)
  })
})

describe('deleteWorkSession', () => {
  it('deletes a work session', async () => {
    mockApi.deleteWorkSession.mockResolvedValue({
      ok: true,
      data: undefined
    })

    const { result } = renderHook(() => useAttendance())
    let success = false

    await act(async () => {
      success = await result.current.deleteWorkSession(1)
    })

    expect(success).toBe(true)
  })
})

describe('getAttendanceApi fallback', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      value: undefined,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window, 'electron', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  it('should set error on loadTodaySummary when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.error).toBe('IPC bridge is not available')
    expect(result.current.status).toBe('error')
  })

  it('should return false on clockIn when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.clockIn()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('IPC bridge is not available')
    expect(result.current.isLoggingAttendance).toBe(false)
  })

  it('should return false on clockOut when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.clockOut()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('IPC bridge is not available')
  })

  it('should return false on startBreak when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.startBreak()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('IPC bridge is not available')
  })

  it('should return false on endBreak when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.endBreak()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('IPC bridge is not available')
  })

  it('should handle non-Error exception on clockIn', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        ...mockApi,
        clockIn: vi.fn().mockRejectedValue('string error')
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.clockIn()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Unknown error')
  })

  it('should handle non-Error exception on loadTodaySummary', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        ...mockApi,
        getTodaySummary: vi.fn().mockRejectedValue('summary error')
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.error).toBe('Unknown error')
  })
})
