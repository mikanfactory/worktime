import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAttendance } from '../useAttendance'

describe('useAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAttendance())
    expect(result.current.logs).toEqual([])
    expect(result.current.summary).toEqual({ workedSeconds: 0, isWorking: false })
    expect(result.current.dailySummaries).toEqual([])
    expect(result.current.monthlySummary).toBeNull()
    expect(result.current.status).toBe('idle')
    expect(result.current.error).toBeNull()
  })

  it('loads daily summaries', async () => {
    const mockSummaries = [
      {
        date: '2026-03-01',
        workedSeconds: 28800,
        firstClockIn: '2026-03-01T09:00:00.000Z',
        lastClockOut: '2026-03-01T17:00:00.000Z',
        logCount: 2
      }
    ]

    vi.mocked(window.api.getDailySummaries).mockResolvedValue({
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

  it('loads monthly summary', async () => {
    const mockSummary = {
      yearMonth: '2026-03',
      totalWorkedSeconds: 57600,
      workingDays: 2,
      dailySummaries: []
    }

    vi.mocked(window.api.getMonthlySummary).mockResolvedValue({
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

  it('updates a log', async () => {
    vi.mocked(window.api.updateAttendanceLog).mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        eventType: 'clock_out',
        timestamp: '2026-03-01T17:00:00.000Z',
        createdAt: '2026-03-01T09:00:00.000Z'
      }
    })

    const { result } = renderHook(() => useAttendance())

    let success: boolean = false
    await act(async () => {
      success = await result.current.updateLog({
        id: 1,
        eventType: 'clock_out'
      })
    })

    expect(success).toBe(true)
  })

  it('deletes a log', async () => {
    vi.mocked(window.api.deleteAttendanceLog).mockResolvedValue({
      ok: true,
      data: undefined
    })

    const { result } = renderHook(() => useAttendance())

    let success: boolean = false
    await act(async () => {
      success = await result.current.deleteLog(1)
    })

    expect(success).toBe(true)
  })

  it('handles error on loadDailySummaries', async () => {
    vi.mocked(window.api.getDailySummaries).mockResolvedValue({
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
