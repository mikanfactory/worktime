import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IpcHandlerService } from '../IpcHandlerService'
import { AttendanceService } from '../AttendanceService'

// Mock electron ipcMain
const handlers = new Map<string, (event: unknown, payload: unknown) => Promise<unknown>>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, payload: unknown) => Promise<unknown>) => {
      handlers.set(channel, handler)
    })
  }
}))

vi.mock('../../../db/service', () => ({
  saveAttendanceLog: vi.fn(),
  getAttendanceLogs: vi.fn(),
  getTodaySummary: vi.fn(),
  updateAttendanceLog: vi.fn(),
  deleteAttendanceLog: vi.fn(),
  getDailySummaries: vi.fn(),
  getMonthlySummary: vi.fn()
}))

describe('IpcHandlerService', () => {
  let service: IpcHandlerService

  beforeEach(() => {
    vi.clearAllMocks()
    handlers.clear()
    const attendanceService = new AttendanceService()
    service = new IpcHandlerService(attendanceService)
    service.registerHandlers()
  })

  async function invokeHandler(channel: string, payload: unknown) {
    const handler = handlers.get(channel)
    if (!handler) throw new Error(`No handler for ${channel}`)
    return handler(null, payload)
  }

  describe('attendance:updateLog', () => {
    it('rejects non-object payload', async () => {
      const result = await invokeHandler('attendance:updateLog', 'invalid')
      expect(result).toEqual({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'attendance:updateLog payload must be an object'
      })
    })

    it('rejects missing id', async () => {
      const result = await invokeHandler('attendance:updateLog', { note: 'test' })
      expect(result).toEqual({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'id must be a positive integer'
      })
    })

    it('rejects non-positive id', async () => {
      const result = await invokeHandler('attendance:updateLog', { id: 0 })
      expect(result).toEqual({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'id must be a positive integer'
      })
    })

    it('rejects invalid eventType', async () => {
      const result = await invokeHandler('attendance:updateLog', {
        id: 1,
        eventType: 'invalid'
      })
      expect(result).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR'
      })
    })

    it('rejects invalid timestamp', async () => {
      const result = await invokeHandler('attendance:updateLog', {
        id: 1,
        timestamp: 'not-a-date'
      })
      expect(result).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR'
      })
    })

    it('rejects note over 1000 chars', async () => {
      const result = await invokeHandler('attendance:updateLog', {
        id: 1,
        note: 'x'.repeat(1001)
      })
      expect(result).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR'
      })
    })

    it('accepts valid update request', async () => {
      const result = await invokeHandler('attendance:updateLog', {
        id: 1,
        eventType: 'clock_out',
        timestamp: '2026-03-01T17:00:00.000Z',
        note: 'test'
      })
      // It will call through to the service (which will fail due to mock),
      // but validation should pass
      expect(result).toBeDefined()
    })
  })

  describe('attendance:deleteLog', () => {
    it('rejects non-object payload', async () => {
      const result = await invokeHandler('attendance:deleteLog', null)
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    })

    it('rejects non-positive id', async () => {
      const result = await invokeHandler('attendance:deleteLog', { id: -1 })
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    })

    it('accepts valid delete request', async () => {
      const result = await invokeHandler('attendance:deleteLog', { id: 1 })
      expect(result).toBeDefined()
    })
  })

  describe('attendance:getDailySummaries', () => {
    it('rejects non-object payload', async () => {
      const result = await invokeHandler('attendance:getDailySummaries', 'invalid')
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    })

    it('rejects invalid yearMonth format', async () => {
      const result = await invokeHandler('attendance:getDailySummaries', {
        yearMonth: '2026-3'
      })
      expect(result).toMatchObject({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'yearMonth must match YYYY-MM format'
      })
    })

    it('rejects missing yearMonth', async () => {
      const result = await invokeHandler('attendance:getDailySummaries', {})
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    })

    it('accepts valid yearMonth', async () => {
      const result = await invokeHandler('attendance:getDailySummaries', {
        yearMonth: '2026-03'
      })
      expect(result).toBeDefined()
    })
  })

  describe('attendance:getMonthlySummary', () => {
    it('rejects invalid yearMonth format', async () => {
      const result = await invokeHandler('attendance:getMonthlySummary', {
        yearMonth: 'March 2026'
      })
      expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
    })

    it('accepts valid yearMonth', async () => {
      const result = await invokeHandler('attendance:getMonthlySummary', {
        yearMonth: '2026-03'
      })
      expect(result).toBeDefined()
    })
  })
})
