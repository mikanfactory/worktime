import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateWorkedSeconds } from '../service'

// Mock Drizzle client
vi.mock('../client', () => ({
  getDb: vi.fn()
}))

import {
  createWorkSession,
  endWorkSession,
  createBreakSession,
  endBreakSession,
  getTodaySummary,
  updateWorkSession,
  deleteWorkSession,
  createManualWorkSession,
  getDailySummaries,
  getMonthlySummary
} from '../service'
import { getDb } from '../client'

// Create mock functions for relational queries
const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()

// Create chain mock helpers
const mockRun = vi.fn()
const mockGet = vi.fn()

// Helper to build a fresh mockDb with independently-chainable insert/update/delete
function createMockDb() {
  return {
    query: {
      workSessions: {
        findFirst: mockFindFirst,
        findMany: mockFindMany
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockReturnValue({
          get: mockGet
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          run: mockRun,
          returning: vi.fn().mockReturnValue({
            get: mockGet
          })
        })
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        run: mockRun
      })
    })
  }
}

type MockDb = ReturnType<typeof createMockDb>
let mockDb: MockDb

beforeEach(() => {
  vi.clearAllMocks()
  mockDb = createMockDb()
  vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>)
})

describe('calculateWorkedSeconds', () => {
  it('returns 0 for zero-length session', () => {
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: '2026-03-01T09:00:00.000Z' },
      []
    )
    expect(result).toEqual({ workedSeconds: 0, breakSeconds: 0 })
  })

  it('calculates a simple session without breaks', () => {
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: '2026-03-01T17:00:00.000Z' },
      []
    )
    expect(result.workedSeconds).toBe(8 * 3600)
    expect(result.breakSeconds).toBe(0)
  })

  it('subtracts break time from worked time', () => {
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: '2026-03-01T17:00:00.000Z' },
      [{ startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T13:00:00.000Z' }]
    )
    expect(result.workedSeconds).toBe(7 * 3600)
    expect(result.breakSeconds).toBe(3600)
  })

  it('handles multiple breaks', () => {
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: '2026-03-01T18:00:00.000Z' },
      [
        { startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T13:00:00.000Z' },
        { startAt: '2026-03-01T15:00:00.000Z', endAt: '2026-03-01T15:30:00.000Z' }
      ]
    )
    // 9h total - 1h break - 0.5h break = 7.5h
    expect(result.workedSeconds).toBe(7.5 * 3600)
    expect(result.breakSeconds).toBe(1.5 * 3600)
  })

  it('handles in-progress session (null clockOutAt) using now', () => {
    const now = new Date('2026-03-01T15:00:00.000Z').getTime()
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: null },
      [],
      now
    )
    expect(result.workedSeconds).toBe(6 * 3600)
  })

  it('handles in-progress break (null endAt) using now', () => {
    const now = new Date('2026-03-01T13:00:00.000Z').getTime()
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: null },
      [{ startAt: '2026-03-01T12:00:00.000Z', endAt: null }],
      now
    )
    // 4h total - 1h break = 3h
    expect(result.workedSeconds).toBe(3 * 3600)
    expect(result.breakSeconds).toBe(3600)
  })

  it('never returns negative workedSeconds', () => {
    const result = calculateWorkedSeconds(
      { clockInAt: '2026-03-01T09:00:00.000Z', clockOutAt: '2026-03-01T09:00:00.000Z' },
      []
    )
    expect(result.workedSeconds).toBeGreaterThanOrEqual(0)
  })
})

describe('createWorkSession', () => {
  it('creates a session and returns it', async () => {
    const nowIso = new Date().toISOString()
    mockFindFirst.mockReturnValue(null)
    mockGet.mockReturnValue({
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso
    })

    const result = await createWorkSession('2026-03-01T09:00:00.000Z')
    expect(result.id).toBe(1)
    expect(result.date).toBe('2026-03-01')
    expect(result.clockOutAt).toBeUndefined()
    expect(mockFindFirst).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('throws if an open session exists', async () => {
    mockFindFirst.mockReturnValue({ id: 1, clockOutAt: null })

    await expect(createWorkSession('2026-03-01T09:00:00.000Z')).rejects.toThrow(
      'An open work session already exists'
    )
  })

  it('saves with note when provided', async () => {
    const nowIso = new Date().toISOString()
    mockFindFirst.mockReturnValue(null)
    mockGet.mockReturnValue({
      id: 2,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      note: 'Remote',
      createdAt: nowIso,
      updatedAt: nowIso
    })

    const result = await createWorkSession('2026-03-01T09:00:00.000Z', 'Remote')
    expect(result.note).toBe('Remote')
  })
})

describe('endWorkSession', () => {
  it('closes the open session', async () => {
    const nowIso = new Date().toISOString()
    // First call: find open session
    mockFindFirst.mockReturnValueOnce({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: []
    })
    // Second call: re-fetch after update
    mockFindFirst.mockReturnValueOnce({
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      breaks: []
    })

    const result = await endWorkSession('2026-03-01T17:00:00.000Z')
    expect(result.clockOutAt).toBe('2026-03-01T17:00:00.000Z')
  })

  it('throws if no open session exists', async () => {
    mockFindFirst.mockReturnValue(null)

    await expect(endWorkSession('2026-03-01T17:00:00.000Z')).rejects.toThrow(
      'No open work session found'
    )
  })

  it('throws if clockOutAt is before clockInAt', async () => {
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T17:00:00.000Z',
      clockOutAt: null,
      breaks: []
    })

    await expect(endWorkSession('2026-03-01T09:00:00.000Z')).rejects.toThrow(
      'clockOutAt must be after clockInAt'
    )
  })

  it('auto-closes open breaks', async () => {
    const nowIso = new Date().toISOString()
    // First call: find open session with open break
    mockFindFirst.mockReturnValueOnce({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: [
        { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z', endAt: null, note: null, createdAt: nowIso, updatedAt: nowIso }
      ]
    })
    // Second call: re-fetch after update
    mockFindFirst.mockReturnValueOnce({
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      breaks: [
        { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T17:00:00.000Z', note: null, createdAt: nowIso, updatedAt: nowIso }
      ]
    })

    await endWorkSession('2026-03-01T17:00:00.000Z')
    // Verify update was called twice: once for break auto-close, once for work session close
    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })
})

describe('createBreakSession', () => {
  it('creates a break in an open session', async () => {
    const nowIso = new Date().toISOString()
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: []
    })
    mockGet.mockReturnValue({
      id: 10,
      workSessionId: 1,
      startAt: '2026-03-01T12:00:00.000Z',
      endAt: null,
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso
    })

    const result = await createBreakSession('2026-03-01T12:00:00.000Z')
    expect(result.id).toBe(10)
    expect(result.endAt).toBeUndefined()
  })

  it('throws if no open session', async () => {
    mockFindFirst.mockReturnValue(null)

    await expect(createBreakSession('2026-03-01T12:00:00.000Z')).rejects.toThrow(
      'No open work session found'
    )
  })

  it('throws if open break already exists', async () => {
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: [{ id: 10, endAt: null }]
    })

    await expect(createBreakSession('2026-03-01T13:00:00.000Z')).rejects.toThrow(
      'An open break already exists'
    )
  })

  it('throws if break start is before clock-in', async () => {
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: []
    })

    await expect(createBreakSession('2026-03-01T08:00:00.000Z')).rejects.toThrow(
      'Break start must be after clock-in time'
    )
  })
})

describe('endBreakSession', () => {
  it('ends an open break', async () => {
    const nowIso = new Date().toISOString()
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: [{ id: 10, startAt: '2026-03-01T12:00:00.000Z', endAt: null }]
    })
    mockGet.mockReturnValue({
      id: 10,
      workSessionId: 1,
      startAt: '2026-03-01T12:00:00.000Z',
      endAt: '2026-03-01T13:00:00.000Z',
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso
    })

    const result = await endBreakSession('2026-03-01T13:00:00.000Z')
    expect(result.endAt).toBe('2026-03-01T13:00:00.000Z')
  })

  it('throws if no open session', async () => {
    mockFindFirst.mockReturnValue(null)

    await expect(endBreakSession('2026-03-01T13:00:00.000Z')).rejects.toThrow(
      'No open work session found'
    )
  })

  it('throws if no open break', async () => {
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: [{ id: 10, startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T13:00:00.000Z' }]
    })

    await expect(endBreakSession('2026-03-01T14:00:00.000Z')).rejects.toThrow(
      'No open break found'
    )
  })

  it('throws if endAt is before startAt', async () => {
    mockFindFirst.mockReturnValue({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: null,
      breaks: [{ id: 10, startAt: '2026-03-01T12:00:00.000Z', endAt: null }]
    })

    await expect(endBreakSession('2026-03-01T11:00:00.000Z')).rejects.toThrow(
      'Break end must be after break start'
    )
  })
})

describe('getTodaySummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty summary when no sessions exist', async () => {
    mockFindMany.mockReturnValue([])

    const result = await getTodaySummary('2026-03-01')
    expect(result).toEqual({
      workedSeconds: 0,
      breakSeconds: 0,
      isWorking: false,
      isOnBreak: false
    })
  })

  it('calculates worked seconds for completed session', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: '2026-03-01T17:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      }
    ])

    const result = await getTodaySummary('2026-03-01')
    expect(result.workedSeconds).toBe(8 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('sets isWorking=true when session is open', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: null,
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      }
    ])

    const result = await getTodaySummary('2026-03-01')
    expect(result.isWorking).toBe(true)
    // 09:00 to 15:00 = 6h
    expect(result.workedSeconds).toBe(6 * 3600)
  })

  it('sets isOnBreak=true when open break exists', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: null,
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: [
          { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z', endAt: null, note: null, createdAt: nowIso, updatedAt: nowIso }
        ]
      }
    ])

    const result = await getTodaySummary('2026-03-01')
    expect(result.isWorking).toBe(true)
    expect(result.isOnBreak).toBe(true)
    // 6h total - 3h break = 3h
    expect(result.workedSeconds).toBe(3 * 3600)
    expect(result.breakSeconds).toBe(3 * 3600)
  })

  it('returns currentSession when working', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: null,
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      }
    ])

    const result = await getTodaySummary('2026-03-01')
    expect(result.currentSession).toBeDefined()
    expect(result.currentSession?.id).toBe(1)
  })
})

describe('updateWorkSession', () => {
  it('updates a session and returns it', async () => {
    const nowIso = new Date().toISOString()
    // After update, findFirst re-fetches the row
    mockFindFirst.mockReturnValue({
      id: 1,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:30:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: 'updated',
      createdAt: nowIso,
      updatedAt: nowIso,
      breaks: []
    })

    const result = await updateWorkSession(1, {
      clockInAt: '2026-03-01T09:30:00.000Z',
      note: 'updated'
    })

    expect(result.id).toBe(1)
    expect(result.note).toBe('updated')
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockRun).toHaveBeenCalled()
  })

  it('updates date when clockInAt changes', async () => {
    const nowIso = new Date().toISOString()
    mockFindFirst.mockReturnValue({
      id: 1,
      date: '2026-03-02',
      clockInAt: '2026-03-02T09:00:00.000Z',
      clockOutAt: null,
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      breaks: []
    })

    const result = await updateWorkSession(1, { clockInAt: '2026-03-02T09:00:00.000Z' })
    expect(result.date).toBe('2026-03-02')
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('throws for non-existent ID', async () => {
    // After update, findFirst returns null for non-existent record
    mockFindFirst.mockReturnValue(null)

    await expect(updateWorkSession(999, { note: 'test' })).rejects.toThrow(
      'Work session with id 999 not found'
    )
  })
})

describe('deleteWorkSession', () => {
  it('deletes a session', async () => {
    await deleteWorkSession(1)
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockRun).toHaveBeenCalled()
  })

  it('completes without error even for non-existent ID', async () => {
    // Drizzle delete does not throw on missing records
    await expect(deleteWorkSession(999)).resolves.toBeUndefined()
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockRun).toHaveBeenCalled()
  })
})

describe('createManualWorkSession', () => {
  it('creates a closed session with both clockIn and clockOut', async () => {
    const nowIso = new Date().toISOString()
    mockGet.mockReturnValue({
      id: 5,
      date: '2026-03-01',
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: null,
      createdAt: nowIso,
      updatedAt: nowIso
    })

    const result = await createManualWorkSession(
      '2026-03-01',
      '2026-03-01T09:00:00.000Z',
      '2026-03-01T17:00:00.000Z'
    )
    expect(result.id).toBe(5)
    expect(result.clockOutAt).toBe('2026-03-01T17:00:00.000Z')
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('throws if clockOutAt is before clockInAt', async () => {
    await expect(
      createManualWorkSession(
        '2026-03-01',
        '2026-03-01T17:00:00.000Z',
        '2026-03-01T09:00:00.000Z'
      )
    ).rejects.toThrow('clockOutAt must be after clockInAt')
  })

  it('throws if clockOutAt equals clockInAt', async () => {
    await expect(
      createManualWorkSession(
        '2026-03-01',
        '2026-03-01T09:00:00.000Z',
        '2026-03-01T09:00:00.000Z'
      )
    ).rejects.toThrow('clockOutAt must be after clockInAt')
  })
})

describe('getDailySummaries', () => {
  it('returns empty array for month with no data', async () => {
    mockFindMany.mockReturnValue([])

    const result = await getDailySummaries('2026-03')
    expect(result).toEqual([])
  })

  it('groups sessions by day and calculates summaries', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: '2026-03-01T17:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      },
      {
        id: 2,
        date: '2026-03-02',
        clockInAt: '2026-03-02T10:00:00.000Z',
        clockOutAt: '2026-03-02T15:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: [
          { id: 10, workSessionId: 2, startAt: '2026-03-02T12:00:00.000Z', endAt: '2026-03-02T13:00:00.000Z', note: null, createdAt: nowIso, updatedAt: nowIso }
        ]
      }
    ])

    const result = await getDailySummaries('2026-03')
    expect(result).toHaveLength(2)
    expect(result[0].date).toBe('2026-03-01')
    expect(result[0].workedSeconds).toBe(8 * 3600)
    expect(result[0].breakSeconds).toBe(0)
    expect(result[0].sessionCount).toBe(1)
    expect(result[0].firstSessionId).toBe(1)
    expect(result[0].lastSessionId).toBe(1)
    expect(result[1].date).toBe('2026-03-02')
    expect(result[1].workedSeconds).toBe(4 * 3600) // 5h - 1h break
    expect(result[1].breakSeconds).toBe(3600)
    expect(result[1].sessionCount).toBe(1)
    expect(result[1].firstSessionId).toBe(2)
    expect(result[1].lastSessionId).toBe(2)
  })

  it('returns different firstSessionId and lastSessionId for multi-session days', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 10,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: '2026-03-01T12:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      },
      {
        id: 20,
        date: '2026-03-01',
        clockInAt: '2026-03-01T13:00:00.000Z',
        clockOutAt: '2026-03-01T17:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      }
    ])

    const result = await getDailySummaries('2026-03')
    expect(result).toHaveLength(1)
    expect(result[0].sessionCount).toBe(2)
    expect(result[0].firstSessionId).toBe(10)
    expect(result[0].lastSessionId).toBe(20)
    expect(result[0].firstClockIn).toBe('2026-03-01T09:00:00.000Z')
    expect(result[0].lastClockOut).toBe('2026-03-01T17:00:00.000Z')
  })
})

describe('getMonthlySummary', () => {
  it('aggregates daily summaries correctly', async () => {
    const nowIso = new Date().toISOString()
    mockFindMany.mockReturnValue([
      {
        id: 1,
        date: '2026-03-01',
        clockInAt: '2026-03-01T09:00:00.000Z',
        clockOutAt: '2026-03-01T17:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      },
      {
        id: 2,
        date: '2026-03-02',
        clockInAt: '2026-03-02T10:00:00.000Z',
        clockOutAt: '2026-03-02T15:00:00.000Z',
        note: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        breaks: []
      }
    ])

    const result = await getMonthlySummary('2026-03')
    expect(result.yearMonth).toBe('2026-03')
    expect(result.totalWorkedSeconds).toBe(13 * 3600)
    expect(result.workingDays).toBe(2)
    expect(result.dailySummaries).toHaveLength(2)
  })
})
