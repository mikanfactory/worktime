import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateWorkedSeconds } from '../service'

// Mock Prisma client
const mockPrisma = {
  attendanceLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}

vi.mock('../client', () => ({
  getPrismaClient: () => mockPrisma
}))

describe('calculateWorkedSeconds', () => {
  it('returns 0 for empty events', () => {
    const result = calculateWorkedSeconds([], false)
    expect(result).toEqual({ workedSeconds: 0, isWorking: false })
  })

  it('calculates a single clock_in/clock_out pair', () => {
    const events = [
      { eventType: 'clock_in', timestamp: '2026-03-01T09:00:00.000Z' },
      { eventType: 'clock_out', timestamp: '2026-03-01T17:00:00.000Z' }
    ]
    const result = calculateWorkedSeconds(events, false)
    expect(result.workedSeconds).toBe(8 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('calculates multiple clock_in/clock_out pairs', () => {
    const events = [
      { eventType: 'clock_in', timestamp: '2026-03-01T09:00:00.000Z' },
      { eventType: 'clock_out', timestamp: '2026-03-01T12:00:00.000Z' },
      { eventType: 'clock_in', timestamp: '2026-03-01T13:00:00.000Z' },
      { eventType: 'clock_out', timestamp: '2026-03-01T17:00:00.000Z' }
    ]
    const result = calculateWorkedSeconds(events, false)
    expect(result.workedSeconds).toBe(7 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('handles in-progress session without counting current time', () => {
    const events = [
      { eventType: 'clock_in', timestamp: '2026-03-01T09:00:00.000Z' }
    ]
    const result = calculateWorkedSeconds(events, false)
    expect(result.workedSeconds).toBe(0)
    expect(result.isWorking).toBe(true)
  })

  it('handles in-progress session counting current time', () => {
    const now = Date.now()
    const clockInTime = new Date(now - 3600 * 1000).toISOString()
    const events = [{ eventType: 'clock_in', timestamp: clockInTime }]
    const result = calculateWorkedSeconds(events, true)
    expect(result.workedSeconds).toBeGreaterThanOrEqual(3599)
    expect(result.workedSeconds).toBeLessThanOrEqual(3601)
    expect(result.isWorking).toBe(true)
  })

  it('ignores duplicate clock_in events', () => {
    const events = [
      { eventType: 'clock_in', timestamp: '2026-03-01T09:00:00.000Z' },
      { eventType: 'clock_in', timestamp: '2026-03-01T10:00:00.000Z' },
      { eventType: 'clock_out', timestamp: '2026-03-01T12:00:00.000Z' }
    ]
    const result = calculateWorkedSeconds(events, false)
    expect(result.workedSeconds).toBe(3 * 3600)
    expect(result.isWorking).toBe(false)
  })

  it('ignores orphan clock_out events', () => {
    const events = [
      { eventType: 'clock_out', timestamp: '2026-03-01T08:00:00.000Z' },
      { eventType: 'clock_in', timestamp: '2026-03-01T09:00:00.000Z' },
      { eventType: 'clock_out', timestamp: '2026-03-01T12:00:00.000Z' }
    ]
    const result = calculateWorkedSeconds(events, false)
    expect(result.workedSeconds).toBe(3 * 3600)
    expect(result.isWorking).toBe(false)
  })
})

describe('DB service functions with mocked Prisma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveAttendanceLog', () => {
    it('creates a record and returns the id', async () => {
      const { saveAttendanceLog } = await import('../service')
      mockPrisma.attendanceLog.create.mockResolvedValue({
        id: 42,
        eventType: 'clock_in',
        timestamp: '2026-03-01T09:00:00.000Z',
        note: null,
        createdAt: new Date()
      })

      const id = await saveAttendanceLog(
        'clock_in',
        '2026-03-01T09:00:00.000Z'
      )
      expect(id).toBe(42)
      expect(mockPrisma.attendanceLog.create).toHaveBeenCalledWith({
        data: {
          eventType: 'clock_in',
          timestamp: '2026-03-01T09:00:00.000Z',
          note: null
        }
      })
    })
  })

  describe('updateAttendanceLog', () => {
    it('updates a record and returns the updated log', async () => {
      const { updateAttendanceLog } = await import('../service')
      const createdAt = new Date('2026-03-01T09:00:00.000Z')
      mockPrisma.attendanceLog.update.mockResolvedValue({
        id: 1,
        eventType: 'clock_out',
        timestamp: '2026-03-01T17:00:00.000Z',
        note: 'updated',
        createdAt
      })

      const result = await updateAttendanceLog(1, {
        eventType: 'clock_out',
        note: 'updated'
      })

      expect(result.id).toBe(1)
      expect(result.eventType).toBe('clock_out')
      expect(result.note).toBe('updated')
      expect(mockPrisma.attendanceLog.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { eventType: 'clock_out', note: 'updated' }
      })
    })

    it('throws for non-existent ID', async () => {
      const { updateAttendanceLog } = await import('../service')
      mockPrisma.attendanceLog.update.mockRejectedValue(
        new Error('Record to update not found')
      )

      await expect(updateAttendanceLog(999, { note: 'test' })).rejects.toThrow(
        'Record to update not found'
      )
    })
  })

  describe('deleteAttendanceLog', () => {
    it('deletes a record', async () => {
      const { deleteAttendanceLog } = await import('../service')
      mockPrisma.attendanceLog.delete.mockResolvedValue({
        id: 1,
        eventType: 'clock_in',
        timestamp: '2026-03-01T09:00:00.000Z',
        note: null,
        createdAt: new Date()
      })

      await deleteAttendanceLog(1)
      expect(mockPrisma.attendanceLog.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      })
    })

    it('throws for non-existent ID', async () => {
      const { deleteAttendanceLog } = await import('../service')
      mockPrisma.attendanceLog.delete.mockRejectedValue(
        new Error('Record to delete does not exist')
      )

      await expect(deleteAttendanceLog(999)).rejects.toThrow(
        'Record to delete does not exist'
      )
    })
  })

  describe('getDailySummaries', () => {
    it('returns empty array for month with no data', async () => {
      const { getDailySummaries } = await import('../service')
      mockPrisma.attendanceLog.findMany.mockResolvedValue([])

      const result = await getDailySummaries('2026-03')
      expect(result).toEqual([])
    })

    it('groups events by day and calculates summaries', async () => {
      const { getDailySummaries } = await import('../service')
      mockPrisma.attendanceLog.findMany.mockResolvedValue([
        {
          eventType: 'clock_in',
          timestamp: '2026-03-01T09:00:00.000Z'
        },
        {
          eventType: 'clock_out',
          timestamp: '2026-03-01T17:00:00.000Z'
        },
        {
          eventType: 'clock_in',
          timestamp: '2026-03-02T10:00:00.000Z'
        },
        {
          eventType: 'clock_out',
          timestamp: '2026-03-02T15:00:00.000Z'
        }
      ])

      const result = await getDailySummaries('2026-03')
      expect(result).toHaveLength(2)
      expect(result[0].date).toBe('2026-03-01')
      expect(result[0].workedSeconds).toBe(8 * 3600)
      expect(result[0].firstClockIn).toBe('2026-03-01T09:00:00.000Z')
      expect(result[0].lastClockOut).toBe('2026-03-01T17:00:00.000Z')
      expect(result[0].logCount).toBe(2)
      expect(result[1].date).toBe('2026-03-02')
      expect(result[1].workedSeconds).toBe(5 * 3600)
    })
  })

  describe('getMonthlySummary', () => {
    it('aggregates daily summaries correctly', async () => {
      const { getMonthlySummary } = await import('../service')
      mockPrisma.attendanceLog.findMany.mockResolvedValue([
        {
          eventType: 'clock_in',
          timestamp: '2026-03-01T09:00:00.000Z'
        },
        {
          eventType: 'clock_out',
          timestamp: '2026-03-01T17:00:00.000Z'
        },
        {
          eventType: 'clock_in',
          timestamp: '2026-03-02T10:00:00.000Z'
        },
        {
          eventType: 'clock_out',
          timestamp: '2026-03-02T15:00:00.000Z'
        }
      ])

      const result = await getMonthlySummary('2026-03')
      expect(result.yearMonth).toBe('2026-03')
      expect(result.totalWorkedSeconds).toBe(13 * 3600)
      expect(result.workingDays).toBe(2)
      expect(result.dailySummaries).toHaveLength(2)
    })
  })
})
