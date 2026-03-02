import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AttendanceService } from '../AttendanceService'

vi.mock('../../../db/service', () => ({
  saveAttendanceLog: vi.fn(),
  getAttendanceLogs: vi.fn(),
  getTodaySummary: vi.fn(),
  updateAttendanceLog: vi.fn(),
  deleteAttendanceLog: vi.fn(),
  getDailySummaries: vi.fn(),
  getMonthlySummary: vi.fn()
}))

import * as db from '../../../db/service'

const mockedDb = vi.mocked(db)

let service: AttendanceService

beforeEach(() => {
  vi.clearAllMocks()
  service = new AttendanceService()
})

describe('logAttendance', () => {
  it('should save attendance and return ok result with id', async () => {
    vi.mocked(db.saveAttendanceLog).mockResolvedValue(42)

    const result = await service.logAttendance({
      eventType: 'clock_in',
      occurredAt: '2024-01-01T09:00:00Z'
    })
    expect(result).toEqual({ ok: true, data: { id: 42 } })
    expect(db.saveAttendanceLog).toHaveBeenCalledWith(
      'clock_in',
      '2024-01-01T09:00:00Z',
      undefined
    )
  })

  it('should use current timestamp when occurredAt is not provided', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:30:00Z'))
    vi.mocked(db.saveAttendanceLog).mockResolvedValue(1)

    await service.logAttendance({ eventType: 'clock_in' })
    const calledTimestamp = vi.mocked(db.saveAttendanceLog).mock.calls[0][1]
    expect(calledTimestamp).toBe('2024-06-15T10:30:00.000Z')

    vi.useRealTimers()
  })

  it('should trim note whitespace', async () => {
    vi.mocked(db.saveAttendanceLog).mockResolvedValue(1)

    await service.logAttendance({
      eventType: 'clock_in',
      note: '  Remote work  '
    })
    expect(db.saveAttendanceLog).toHaveBeenCalledWith(
      'clock_in',
      expect.any(String),
      'Remote work'
    )
  })

  it('should set note to undefined when empty after trim', async () => {
    vi.mocked(db.saveAttendanceLog).mockResolvedValue(1)

    await service.logAttendance({
      eventType: 'clock_in',
      note: '   '
    })
    expect(db.saveAttendanceLog).toHaveBeenCalledWith(
      'clock_in',
      expect.any(String),
      undefined
    )
  })

  it('should return error result when db throws', async () => {
    vi.mocked(db.saveAttendanceLog).mockRejectedValue(new Error('DB connection failed'))

    const result = await service.logAttendance({ eventType: 'clock_in' })
    expect(result).toEqual({
      ok: false,
      code: 'DB_ERROR',
      message: 'DB connection failed'
    })
  })

  it('should handle non-Error throws', async () => {
    vi.mocked(db.saveAttendanceLog).mockRejectedValue('string error')

    const result = await service.logAttendance({ eventType: 'clock_in' })
    expect(result).toEqual({
      ok: false,
      code: 'DB_ERROR',
      message: 'Unknown error'
    })
  })
})

describe('getLogs', () => {
  it('should delegate parameters to db.getAttendanceLogs', async () => {
    const logsPage = { logs: [], nextCursor: undefined }
    vi.mocked(db.getAttendanceLogs).mockResolvedValue(logsPage)

    const params = { from: '2024-01-01', to: '2024-01-02', limit: 10 }
    const result = await service.getLogs(params)

    expect(db.getAttendanceLogs).toHaveBeenCalledWith(params)
    expect(result).toEqual({ ok: true, data: logsPage })
  })

  it('should use empty object as default request', async () => {
    vi.mocked(db.getAttendanceLogs).mockResolvedValue({ logs: [] })

    await service.getLogs()
    expect(db.getAttendanceLogs).toHaveBeenCalledWith({})
  })

  it('should return error result when db throws', async () => {
    vi.mocked(db.getAttendanceLogs).mockRejectedValue(new Error('Query failed'))

    const result = await service.getLogs()
    expect(result).toEqual({
      ok: false,
      code: 'DB_ERROR',
      message: 'Query failed'
    })
  })
})

describe('getTodaySummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should compute day range from current date and pass to db', async () => {
    vi.setSystemTime(new Date('2024-03-15T14:30:00Z'))
    const summary = { workedSeconds: 3600, isWorking: false }
    vi.mocked(db.getTodaySummary).mockResolvedValue(summary)

    const result = await service.getTodaySummary({})

    const [startIso, endIso] = vi.mocked(db.getTodaySummary).mock.calls[0]
    const start = new Date(startIso)
    const end = new Date(endIso)

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
    expect(result).toEqual({ ok: true, data: summary })
  })

  it('should compute day range from provided date', async () => {
    vi.setSystemTime(new Date('2024-03-15T14:30:00Z'))
    vi.mocked(db.getTodaySummary).mockResolvedValue({
      workedSeconds: 0,
      isWorking: false
    })

    await service.getTodaySummary({ date: '2024-01-10T00:00:00Z' })

    const [startIso, endIso] = vi.mocked(db.getTodaySummary).mock.calls[0]
    const start = new Date(startIso)
    const end = new Date(endIso)

    expect(start.getDate()).toBe(10)
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('should return error result when db throws', async () => {
    vi.mocked(db.getTodaySummary).mockRejectedValue(new Error('fail'))

    const result = await service.getTodaySummary({})
    expect(result).toEqual({
      ok: false,
      code: 'DB_ERROR',
      message: 'fail'
    })
  })
})

describe('updateLog', () => {
  it('returns ok result on successful update', async () => {
    const updatedLog = {
      id: 1,
      eventType: 'clock_out' as const,
      timestamp: '2026-03-01T17:00:00.000Z',
      note: 'updated',
      createdAt: '2026-03-01T09:00:00.000Z'
    }
    mockedDb.updateAttendanceLog.mockResolvedValue(updatedLog)

    const result = await service.updateLog({
      id: 1,
      eventType: 'clock_out',
      note: 'updated'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(1)
      expect(result.data.eventType).toBe('clock_out')
    }
  })

  it('returns error result on DB failure', async () => {
    mockedDb.updateAttendanceLog.mockRejectedValue(new Error('Not found'))

    const result = await service.updateLog({ id: 999 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DB_ERROR')
      expect(result.message).toBe('Not found')
    }
  })
})

describe('deleteLog', () => {
  it('returns ok result on successful delete', async () => {
    mockedDb.deleteAttendanceLog.mockResolvedValue(undefined)

    const result = await service.deleteLog({ id: 1 })

    expect(result.ok).toBe(true)
    expect(mockedDb.deleteAttendanceLog).toHaveBeenCalledWith(1)
  })

  it('returns error result on DB failure', async () => {
    mockedDb.deleteAttendanceLog.mockRejectedValue(new Error('Not found'))

    const result = await service.deleteLog({ id: 999 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DB_ERROR')
    }
  })
})

describe('getDailySummaries', () => {
  it('returns daily summaries', async () => {
    const summaries = [
      {
        date: '2026-03-01',
        workedSeconds: 28800,
        firstClockIn: '2026-03-01T09:00:00.000Z',
        lastClockOut: '2026-03-01T17:00:00.000Z',
        logCount: 2
      }
    ]
    mockedDb.getDailySummaries.mockResolvedValue(summaries)

    const result = await service.getDailySummaries({ yearMonth: '2026-03' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(summaries)
    }
  })

  it('returns error on failure', async () => {
    mockedDb.getDailySummaries.mockRejectedValue(new Error('DB error'))

    const result = await service.getDailySummaries({ yearMonth: '2026-03' })

    expect(result.ok).toBe(false)
  })
})

describe('getMonthlySummary', () => {
  it('returns monthly summary', async () => {
    const summary = {
      yearMonth: '2026-03',
      totalWorkedSeconds: 57600,
      workingDays: 2,
      dailySummaries: []
    }
    mockedDb.getMonthlySummary.mockResolvedValue(summary)

    const result = await service.getMonthlySummary({ yearMonth: '2026-03' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual(summary)
    }
  })

  it('returns error on failure', async () => {
    mockedDb.getMonthlySummary.mockRejectedValue(new Error('DB error'))

    const result = await service.getMonthlySummary({ yearMonth: '2026-03' })

    expect(result.ok).toBe(false)
  })
})
