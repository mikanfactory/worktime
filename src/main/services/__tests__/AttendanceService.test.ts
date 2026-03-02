import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('AttendanceService', () => {
  let service: AttendanceService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AttendanceService()
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
})
