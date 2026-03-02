import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAttendance } from '../useAttendance'
import type {
  AttendanceLogRequest,
  AttendanceLogsPage,
  AttendanceSummary,
  GetAttendanceLogsRequest,
  GetTodaySummaryRequest,
  Result
} from '../../../../shared/attendance'

type MockApi = {
  logAttendance: ReturnType<typeof vi.fn<(req: AttendanceLogRequest) => Promise<Result<{ id: number }>>>>
  getAttendanceLogs: ReturnType<typeof vi.fn<(req?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>>>
  getTodaySummary: ReturnType<typeof vi.fn<(req?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>>>
}

let mockApi: MockApi

beforeEach(() => {
  mockApi = {
    logAttendance: vi.fn(),
    getAttendanceLogs: vi.fn(),
    getTodaySummary: vi.fn()
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
      data: { workedSeconds: 0, isWorking: false }
    })

    const { result } = renderHook(() => useAttendance())

    expect(result.current.logs).toEqual([])
    expect(result.current.summary).toEqual({ workedSeconds: 0, isWorking: false })
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(result.current.hasMoreLogs).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isLoggingAttendance).toBe(false)
  })
})

describe('loadLogs', () => {
  it('should transition to loading then success', async () => {
    const logs = [
      { id: 1, eventType: 'clock_in' as const, timestamp: '2024-01-01T09:00:00Z', createdAt: '2024-01-01T09:00:00Z' }
    ]
    mockApi.getAttendanceLogs.mockResolvedValue({
      ok: true,
      data: { logs, nextCursor: undefined }
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.logs).toEqual(logs)
    expect(result.current.status).toBe('success')
    expect(result.current.isLogsLoading).toBe(false)
  })

  it('should set error on API failure result', async () => {
    mockApi.getAttendanceLogs.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'Database error'
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Database error')
  })

  it('should set error on exception', async () => {
    mockApi.getAttendanceLogs.mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Network failure')
  })

  it('should handle non-Error exceptions', async () => {
    mockApi.getAttendanceLogs.mockRejectedValue('string error')

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.error).toBe('Unknown error')
  })

  it('should pass request parameters to API', async () => {
    mockApi.getAttendanceLogs.mockResolvedValue({
      ok: true,
      data: { logs: [] }
    })

    const { result } = renderHook(() => useAttendance())
    const request = { from: '2024-01-01', limit: 10 }

    await act(async () => {
      await result.current.loadLogs(request)
    })

    expect(mockApi.getAttendanceLogs).toHaveBeenCalledWith(request)
  })

  it('should set hasMoreLogs when nextCursor exists', async () => {
    mockApi.getAttendanceLogs.mockResolvedValue({
      ok: true,
      data: { logs: [], nextCursor: 'abc123' }
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.hasMoreLogs).toBe(true)
    expect(result.current.nextCursor).toBe('abc123')
  })
})

describe('loadMoreLogs', () => {
  it('should do nothing if no nextCursor', async () => {
    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadMoreLogs()
    })

    expect(mockApi.getAttendanceLogs).not.toHaveBeenCalled()
  })

  it('should append new logs and deduplicate by id', async () => {
    mockApi.getAttendanceLogs
      .mockResolvedValueOnce({
        ok: true,
        data: {
          logs: [
            { id: 1, eventType: 'clock_in' as const, timestamp: '2024-01-01T09:00:00Z', createdAt: '2024-01-01T09:00:00Z' }
          ],
          nextCursor: 'cursor1'
        }
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          logs: [
            { id: 1, eventType: 'clock_in' as const, timestamp: '2024-01-01T09:00:00Z', createdAt: '2024-01-01T09:00:00Z' },
            { id: 2, eventType: 'clock_out' as const, timestamp: '2024-01-01T17:00:00Z', createdAt: '2024-01-01T17:00:00Z' }
          ],
          nextCursor: undefined
        }
      })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })
    expect(result.current.logs).toHaveLength(1)

    await act(async () => {
      await result.current.loadMoreLogs()
    })
    expect(result.current.logs).toHaveLength(2)
    expect(result.current.logs[1].id).toBe(2)
  })

  it('should set error on loadMore failure', async () => {
    mockApi.getAttendanceLogs
      .mockResolvedValueOnce({
        ok: true,
        data: { logs: [{ id: 1, eventType: 'clock_in' as const, timestamp: 't', createdAt: 't' }], nextCursor: 'c' }
      })
      .mockResolvedValueOnce({
        ok: false,
        code: 'DB_ERROR',
        message: 'Failed'
      })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    await act(async () => {
      await result.current.loadMoreLogs()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toBe('Failed')
  })
})

describe('loadTodaySummary', () => {
  it('should update summary on success', async () => {
    const summary = {
      firstClockIn: '2024-01-01T09:00:00Z',
      workedSeconds: 3600,
      isWorking: true
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

describe('logAttendance', () => {
  it('should return true on success', async () => {
    mockApi.logAttendance.mockResolvedValue({ ok: true, data: { id: 1 } })

    const { result } = renderHook(() => useAttendance())
    let success: boolean = false

    await act(async () => {
      success = await result.current.logAttendance('clock_in')
    })

    expect(success).toBe(true)
    expect(result.current.status).toBe('success')
    expect(result.current.isLoggingAttendance).toBe(false)
  })

  it('should return false on failure result', async () => {
    mockApi.logAttendance.mockResolvedValue({
      ok: false,
      code: 'DB_ERROR',
      message: 'Log failed'
    })

    const { result } = renderHook(() => useAttendance())
    let success: boolean = true

    await act(async () => {
      success = await result.current.logAttendance('clock_in')
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Log failed')
  })

  it('should return false on exception', async () => {
    mockApi.logAttendance.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAttendance())
    let success: boolean = true

    await act(async () => {
      success = await result.current.logAttendance('clock_in')
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Network error')
  })

  it('should pass eventType and note to API', async () => {
    mockApi.logAttendance.mockResolvedValue({ ok: true, data: { id: 1 } })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.logAttendance('clock_out', 'Early leave')
    })

    expect(mockApi.logAttendance).toHaveBeenCalledWith({
      eventType: 'clock_out',
      note: 'Early leave'
    })
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

  it('should set error on loadLogs when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    expect(result.current.error).toBe('IPC bridge is not available')
    expect(result.current.status).toBe('error')
  })

  it('should set error on loadTodaySummary when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadTodaySummary()
    })

    expect(result.current.error).toBe('IPC bridge is not available')
    expect(result.current.status).toBe('error')
  })

  it('should return false on logAttendance when no API is available', async () => {
    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.logAttendance('clock_in')
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('IPC bridge is not available')
    expect(result.current.isLoggingAttendance).toBe(false)
  })

  it('should set error on loadMoreLogs when no API is available', async () => {
    // First set up with a valid API to get a cursor
    Object.defineProperty(window, 'api', {
      value: {
        logAttendance: vi.fn(),
        getAttendanceLogs: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            logs: [{ id: 1, eventType: 'clock_in', timestamp: 't', createdAt: 't' }],
            nextCursor: 'cursor1'
          }
        }),
        getTodaySummary: vi.fn()
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    // Now remove API
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

    await act(async () => {
      await result.current.loadMoreLogs()
    })

    expect(result.current.error).toBe('IPC bridge is not available')
  })

  it('should handle non-Error exception on logAttendance', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        logAttendance: vi.fn().mockRejectedValue('string error'),
        getAttendanceLogs: vi.fn(),
        getTodaySummary: vi.fn()
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useAttendance())
    let success = true

    await act(async () => {
      success = await result.current.logAttendance('clock_in')
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Unknown error')
  })

  it('should handle non-Error exception on loadTodaySummary', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        logAttendance: vi.fn(),
        getAttendanceLogs: vi.fn(),
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

  it('should handle non-Error exception on loadMoreLogs', async () => {
    Object.defineProperty(window, 'api', {
      value: {
        logAttendance: vi.fn(),
        getAttendanceLogs: vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: {
              logs: [{ id: 1, eventType: 'clock_in', timestamp: 't', createdAt: 't' }],
              nextCursor: 'c'
            }
          })
          .mockRejectedValueOnce('load more error'),
        getTodaySummary: vi.fn()
      },
      writable: true,
      configurable: true
    })

    const { result } = renderHook(() => useAttendance())

    await act(async () => {
      await result.current.loadLogs()
    })

    await act(async () => {
      await result.current.loadMoreLogs()
    })

    expect(result.current.error).toBe('Unknown error')
  })
})
