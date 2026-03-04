import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AttendanceService } from '../AttendanceService'

vi.mock('../../../db/service', () => ({
  createWorkSession: vi.fn(),
  endWorkSession: vi.fn(),
  createBreakSession: vi.fn(),
  endBreakSession: vi.fn(),
  getTodaySummary: vi.fn(),
  updateWorkSession: vi.fn(),
  deleteWorkSession: vi.fn(),
  createManualWorkSession: vi.fn(),
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

describe('clockIn', () => {
  it('should create work session and return ok result', async () => {
    const session = {
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      breaks: [],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T09:00:00.000Z'
    }
    mockedDb.createWorkSession.mockResolvedValue(session)

    const result = await service.clockIn()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(1)
    }
  })

  it('should pass note to createWorkSession', async () => {
    const session = {
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      breaks: [],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T09:00:00.000Z'
    }
    mockedDb.createWorkSession.mockResolvedValue(session)

    await service.clockIn('Remote work')
    expect(mockedDb.createWorkSession).toHaveBeenCalledWith(
      expect.any(String),
      'Remote work'
    )
  })

  it('should return error result when db throws', async () => {
    mockedDb.createWorkSession.mockRejectedValue(
      new Error('An open work session already exists')
    )

    const result = await service.clockIn()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DB_ERROR')
      expect(result.message).toBe('An open work session already exists')
    }
  })

  it('should handle non-Error throws', async () => {
    mockedDb.createWorkSession.mockRejectedValue('string error')

    const result = await service.clockIn()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Unknown error')
    }
  })
})

describe('clockOut', () => {
  it('should end work session and return ok result', async () => {
    const session = {
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      breaks: [],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T17:00:00.000Z'
    }
    mockedDb.endWorkSession.mockResolvedValue(session)

    const result = await service.clockOut()
    expect(result.ok).toBe(true)
  })

  it('should return error when no open session', async () => {
    mockedDb.endWorkSession.mockRejectedValue(new Error('No open work session found'))

    const result = await service.clockOut()
    expect(result.ok).toBe(false)
  })
})

describe('startBreak', () => {
  it('should create break session and return ok result', async () => {
    const breakSession = {
      id: 10,
      workSessionId: 1,
      startAt: '2026-03-01T12:00:00.000Z'
    }
    mockedDb.createBreakSession.mockResolvedValue(breakSession)

    const result = await service.startBreak()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(10)
    }
  })

  it('should return error when no open session', async () => {
    mockedDb.createBreakSession.mockRejectedValue(new Error('No open work session found'))

    const result = await service.startBreak()
    expect(result.ok).toBe(false)
  })
})

describe('endBreak', () => {
  it('should end break session and return ok result', async () => {
    const breakSession = {
      id: 10,
      workSessionId: 1,
      startAt: '2026-03-01T12:00:00.000Z',
      endAt: '2026-03-01T13:00:00.000Z'
    }
    mockedDb.endBreakSession.mockResolvedValue(breakSession)

    const result = await service.endBreak()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.endAt).toBe('2026-03-01T13:00:00.000Z')
    }
  })

  it('should return error when no open break', async () => {
    mockedDb.endBreakSession.mockRejectedValue(new Error('No open break found'))

    const result = await service.endBreak()
    expect(result.ok).toBe(false)
  })
})

describe('getTodaySummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format date from current date and pass to db', async () => {
    vi.setSystemTime(new Date('2026-03-15T14:30:00Z'))
    const summary = {
      workedSeconds: 3600,
      breakSeconds: 0,
      isWorking: false,
      isOnBreak: false
    }
    mockedDb.getTodaySummary.mockResolvedValue(summary)

    const result = await service.getTodaySummary({})

    // The date string should match the local date
    expect(mockedDb.getTodaySummary).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(result).toEqual({ ok: true, data: summary })
  })

  it('should format date from provided date', async () => {
    vi.setSystemTime(new Date('2026-03-15T14:30:00Z'))
    mockedDb.getTodaySummary.mockResolvedValue({
      workedSeconds: 0,
      breakSeconds: 0,
      isWorking: false,
      isOnBreak: false
    })

    await service.getTodaySummary({ date: '2026-01-10T00:00:00Z' })
    expect(mockedDb.getTodaySummary).toHaveBeenCalledWith(expect.stringContaining('01-10'))
  })

  it('should return error result when db throws', async () => {
    mockedDb.getTodaySummary.mockRejectedValue(new Error('fail'))

    const result = await service.getTodaySummary({})
    expect(result).toEqual({
      ok: false,
      code: 'DB_ERROR',
      message: 'fail'
    })
  })
})

describe('updateWorkSession', () => {
  it('returns ok result on successful update', async () => {
    const session = {
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:30:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: 'updated',
      breaks: [],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T17:00:00.000Z'
    }
    mockedDb.updateWorkSession.mockResolvedValue(session)

    const result = await service.updateWorkSession({
      id: 1,
      clockInAt: '2026-03-01T09:30:00.000Z',
      note: 'updated'
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(1)
      expect(result.data.note).toBe('updated')
    }
  })

  it('returns error result on DB failure', async () => {
    mockedDb.updateWorkSession.mockRejectedValue(new Error('Not found'))

    const result = await service.updateWorkSession({ id: 999 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('DB_ERROR')
    }
  })
})

describe('deleteWorkSession', () => {
  it('returns ok result on successful delete', async () => {
    mockedDb.deleteWorkSession.mockResolvedValue(undefined)

    const result = await service.deleteWorkSession({ id: 1 })
    expect(result.ok).toBe(true)
    expect(mockedDb.deleteWorkSession).toHaveBeenCalledWith(1)
  })

  it('returns error result on DB failure', async () => {
    mockedDb.deleteWorkSession.mockRejectedValue(new Error('Not found'))

    const result = await service.deleteWorkSession({ id: 999 })
    expect(result.ok).toBe(false)
  })
})

describe('createManualWorkSession', () => {
  it('returns ok result on success', async () => {
    const session = {
      id: 5,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      breaks: [],
      createdAt: '2026-03-01T09:00:00.000Z',
      updatedAt: '2026-03-01T17:00:00.000Z'
    }
    mockedDb.createManualWorkSession.mockResolvedValue(session)

    const result = await service.createManualWorkSession({
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z'
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe(5)
    }
  })

  it('returns error result on DB failure', async () => {
    mockedDb.createManualWorkSession.mockRejectedValue(
      new Error('clockOutAt must be after clockInAt')
    )

    const result = await service.createManualWorkSession({
      date: '2026-03-01',
      clockInAt: '2026-03-01T17:00:00.000Z',
      clockOutAt: '2026-03-01T09:00:00.000Z'
    })
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
        breakSeconds: 0,
        firstClockIn: '2026-03-01T09:00:00.000Z',
        lastClockOut: '2026-03-01T17:00:00.000Z',
        sessionCount: 1,
        firstSessionId: 1,
        lastSessionId: 1
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
      totalBreakSeconds: 3600,
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
