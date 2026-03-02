import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../client', () => ({
  getPrismaClient: vi.fn()
}))

import { saveAttendanceLog, getAttendanceLogs, getTodaySummary } from '../service'
import { getPrismaClient } from '../client'

const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()

const mockPrisma = {
  attendanceLog: {
    create: mockCreate,
    findMany: mockFindMany,
    findFirst: mockFindFirst
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getPrismaClient).mockReturnValue(mockPrisma as ReturnType<typeof getPrismaClient>)
})

describe('saveAttendanceLog', () => {
  it('should save a clock_in event with legacy type "打刻"', async () => {
    mockCreate.mockResolvedValue({ id: 1 })

    const id = await saveAttendanceLog('clock_in', '2024-01-01T09:00:00Z')
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'clock_in',
        type: '打刻',
        timestamp: '2024-01-01T09:00:00Z',
        note: null
      }
    })
    expect(id).toBe(1)
  })

  it('should save a clock_out event with legacy type "退勤"', async () => {
    mockCreate.mockResolvedValue({ id: 2 })

    const id = await saveAttendanceLog('clock_out', '2024-01-01T18:00:00Z')
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'clock_out',
        type: '退勤',
        timestamp: '2024-01-01T18:00:00Z',
        note: null
      }
    })
    expect(id).toBe(2)
  })

  it('should save a break_start event with legacy type "休憩開始"', async () => {
    mockCreate.mockResolvedValue({ id: 3 })

    await saveAttendanceLog('break_start', '2024-01-01T12:00:00Z')
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'break_start',
        type: '休憩開始',
        timestamp: '2024-01-01T12:00:00Z',
        note: null
      }
    })
  })

  it('should save a break_end event with legacy type "休憩終了"', async () => {
    mockCreate.mockResolvedValue({ id: 4 })

    await saveAttendanceLog('break_end', '2024-01-01T13:00:00Z')
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'break_end',
        type: '休憩終了',
        timestamp: '2024-01-01T13:00:00Z',
        note: null
      }
    })
  })

  it('should save with a note when provided', async () => {
    mockCreate.mockResolvedValue({ id: 5 })

    await saveAttendanceLog('clock_in', '2024-01-01T09:00:00Z', 'Remote work')
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        eventType: 'clock_in',
        type: '打刻',
        timestamp: '2024-01-01T09:00:00Z',
        note: 'Remote work'
      }
    })
  })

  it('should save note as null when undefined', async () => {
    mockCreate.mockResolvedValue({ id: 6 })

    await saveAttendanceLog('clock_in', '2024-01-01T09:00:00Z', undefined)
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ note: null })
    })
  })
})

describe('getAttendanceLogs', () => {
  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    eventType: 'clock_in',
    type: '打刻',
    timestamp: '2024-01-01T09:00:00Z',
    note: null,
    createdAt: new Date('2024-01-01T09:00:00Z'),
    ...overrides
  })

  it('should return logs with default limit', async () => {
    mockFindMany.mockResolvedValue([makeRow()])

    const result = await getAttendanceLogs({})
    expect(mockFindMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
      take: 50
    })
    expect(result.logs).toHaveLength(1)
    expect(result.logs[0]).toEqual({
      id: 1,
      eventType: 'clock_in',
      timestamp: '2024-01-01T09:00:00Z',
      createdAt: '2024-01-01T09:00:00.000Z'
    })
  })

  it('should clamp limit to minimum of 1', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({ limit: -5 })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    )
  })

  it('should clamp limit to maximum of 200', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({ limit: 999 })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    )
  })

  it('should filter by from date', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({ from: '2024-01-01T00:00:00Z' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ timestamp: { gte: '2024-01-01T00:00:00Z' } }] }
      })
    )
  })

  it('should filter by to date', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({ to: '2024-01-02T00:00:00Z' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ timestamp: { lt: '2024-01-02T00:00:00Z' } }] }
      })
    )
  })

  it('should filter by both from and to', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-02T00:00:00Z'
    })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { timestamp: { gte: '2024-01-01T00:00:00Z' } },
            { timestamp: { lt: '2024-01-02T00:00:00Z' } }
          ]
        }
      })
    )
  })

  it('should decode cursor and add filter condition', async () => {
    mockFindMany.mockResolvedValue([])
    const cursor = Buffer.from(
      JSON.stringify({ timestamp: '2024-01-01T12:00:00Z', id: 10 })
    ).toString('base64')

    await getAttendanceLogs({ cursor })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { timestamp: { lt: '2024-01-01T12:00:00Z' } },
                {
                  AND: [
                    { timestamp: '2024-01-01T12:00:00Z' },
                    { id: { lt: 10 } }
                  ]
                }
              ]
            }
          ]
        }
      })
    )
  })

  it('should ignore invalid cursor', async () => {
    mockFindMany.mockResolvedValue([])

    await getAttendanceLogs({ cursor: 'invalid-base64' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    )
  })

  it('should return nextCursor when result count equals limit', async () => {
    const rows = Array.from({ length: 3 }, (_, i) =>
      makeRow({ id: 3 - i, timestamp: `2024-01-01T0${9 - i}:00:00Z` })
    )
    mockFindMany.mockResolvedValue(rows)

    const result = await getAttendanceLogs({ limit: 3 })
    expect(result.nextCursor).toBeDefined()

    const decoded = JSON.parse(
      Buffer.from(result.nextCursor!, 'base64').toString('utf8')
    )
    expect(decoded).toEqual({
      timestamp: rows[2].timestamp,
      id: rows[2].id
    })
  })

  it('should not return nextCursor when result count is less than limit', async () => {
    mockFindMany.mockResolvedValue([makeRow()])

    const result = await getAttendanceLogs({ limit: 50 })
    expect(result.nextCursor).toBeUndefined()
  })

  it('should normalize eventType from modern field', async () => {
    mockFindMany.mockResolvedValue([
      makeRow({ eventType: 'clock_out', type: '打刻' })
    ])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].eventType).toBe('clock_out')
  })

  it('should normalize eventType from legacy "退勤" type', async () => {
    mockFindMany.mockResolvedValue([
      makeRow({ eventType: '', type: '退勤' })
    ])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].eventType).toBe('clock_out')
  })

  it('should normalize eventType from legacy "休憩開始" type', async () => {
    mockFindMany.mockResolvedValue([
      makeRow({ eventType: '', type: '休憩開始' })
    ])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].eventType).toBe('break_start')
  })

  it('should normalize eventType from legacy "休憩終了" type', async () => {
    mockFindMany.mockResolvedValue([
      makeRow({ eventType: '', type: '休憩終了' })
    ])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].eventType).toBe('break_end')
  })

  it('should default to clock_in for unknown legacy type', async () => {
    mockFindMany.mockResolvedValue([
      makeRow({ eventType: '', type: 'unknown' })
    ])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].eventType).toBe('clock_in')
  })

  it('should map note to undefined when null', async () => {
    mockFindMany.mockResolvedValue([makeRow({ note: null })])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].note).toBeUndefined()
  })

  it('should preserve note when present', async () => {
    mockFindMany.mockResolvedValue([makeRow({ note: 'Remote' })])

    const result = await getAttendanceLogs({})
    expect(result.logs[0].note).toBe('Remote')
  })
})

describe('getTodaySummary', () => {
  const dayStart = '2024-01-01T00:00:00.000Z'
  const dayEnd = '2024-01-02T00:00:00.000Z'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty summary when no events exist', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockFindMany.mockResolvedValue([])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result).toEqual({
      firstClockIn: undefined,
      latestEvent: undefined,
      workedSeconds: 0,
      isWorking: false
    })
  })

  it('should calculate worked seconds for clock_in/clock_out pair', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ timestamp: '2024-01-01T09:00:00Z' })
      .mockResolvedValueOnce({ timestamp: '2024-01-01T17:00:00Z' })
    mockFindMany.mockResolvedValue([
      { eventType: 'clock_in', timestamp: '2024-01-01T09:00:00Z' },
      { eventType: 'clock_out', timestamp: '2024-01-01T17:00:00Z' }
    ])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result.workedSeconds).toBe(8 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('should set isWorking=true when clocked in without clock_out', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ timestamp: '2024-01-01T09:00:00Z' })
      .mockResolvedValueOnce({ timestamp: '2024-01-01T09:00:00Z' })
    mockFindMany.mockResolvedValue([
      { eventType: 'clock_in', timestamp: '2024-01-01T09:00:00Z' }
    ])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result.isWorking).toBe(true)
    // 09:00 to 15:00 = 6 hours
    expect(result.workedSeconds).toBe(6 * 3600)
  })

  it('should handle multiple clock_in/clock_out sessions', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ timestamp: '2024-01-01T09:00:00Z' })
      .mockResolvedValueOnce({ timestamp: '2024-01-01T17:00:00Z' })
    mockFindMany.mockResolvedValue([
      { eventType: 'clock_in', timestamp: '2024-01-01T09:00:00Z' },
      { eventType: 'clock_out', timestamp: '2024-01-01T12:00:00Z' },
      { eventType: 'clock_in', timestamp: '2024-01-01T13:00:00Z' },
      { eventType: 'clock_out', timestamp: '2024-01-01T17:00:00Z' }
    ])

    const result = await getTodaySummary(dayStart, dayEnd)
    // 3h + 4h = 7h
    expect(result.workedSeconds).toBe(7 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('should return firstClockIn timestamp', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ timestamp: '2024-01-01T08:30:00Z' })
      .mockResolvedValueOnce({ timestamp: '2024-01-01T17:00:00Z' })
    mockFindMany.mockResolvedValue([])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result.firstClockIn).toBe('2024-01-01T08:30:00Z')
  })

  it('should return latestEvent timestamp', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ timestamp: '2024-01-01T17:30:00Z' })
    mockFindMany.mockResolvedValue([])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result.latestEvent).toBe('2024-01-01T17:30:00Z')
  })

  it('should ignore duplicate clock_in events', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ timestamp: '2024-01-01T09:00:00Z' })
      .mockResolvedValueOnce({ timestamp: '2024-01-01T10:00:00Z' })
    mockFindMany.mockResolvedValue([
      { eventType: 'clock_in', timestamp: '2024-01-01T09:00:00Z' },
      { eventType: 'clock_in', timestamp: '2024-01-01T09:30:00Z' },
      { eventType: 'clock_out', timestamp: '2024-01-01T10:00:00Z' }
    ])

    const result = await getTodaySummary(dayStart, dayEnd)
    // Only first clock_in counts: 09:00 to 10:00 = 1h
    expect(result.workedSeconds).toBe(3600)
  })

  it('should ensure workedSeconds is never negative', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    mockFindMany.mockResolvedValue([])

    const result = await getTodaySummary(dayStart, dayEnd)
    expect(result.workedSeconds).toBeGreaterThanOrEqual(0)
  })
})
