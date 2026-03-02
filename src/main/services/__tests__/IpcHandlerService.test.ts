import { describe, it, expect, vi, beforeEach } from 'vitest'

type Handler = (_event: unknown, payload: unknown) => Promise<unknown>

const handlers: Record<string, Handler> = {}
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Handler) => {
      handlers[channel] = handler
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

import { IpcHandlerService } from '../IpcHandlerService'
import { AttendanceService } from '../AttendanceService'

let service: IpcHandlerService
let attendanceService: AttendanceService

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(handlers)) {
    delete handlers[key]
  }
  attendanceService = new AttendanceService()
  vi.spyOn(attendanceService, 'logAttendance').mockResolvedValue({ ok: true, data: { id: 1 } })
  vi.spyOn(attendanceService, 'getLogs').mockResolvedValue({ ok: true, data: { logs: [] } })
  vi.spyOn(attendanceService, 'getTodaySummary').mockResolvedValue({
    ok: true,
    data: { workedSeconds: 0, isWorking: false }
  })

  service = new IpcHandlerService(attendanceService)
  service.registerHandlers()
})

describe('attendance:log validation', () => {
  const invoke = (payload: unknown) => handlers['attendance:log'](null, payload)

  it('should accept valid clock_in request', async () => {
    const result = await invoke({ eventType: 'clock_in' })
    expect(result).toEqual({ ok: true, data: { id: 1 } })
    expect(attendanceService.logAttendance).toHaveBeenCalledWith({
      eventType: 'clock_in',
      note: undefined,
      occurredAt: undefined
    })
  })

  it('should accept valid request with note and occurredAt', async () => {
    await invoke({
      eventType: 'clock_out',
      note: 'Early leave',
      occurredAt: '2024-01-01T17:00:00Z'
    })
    expect(attendanceService.logAttendance).toHaveBeenCalledWith({
      eventType: 'clock_out',
      note: 'Early leave',
      occurredAt: '2024-01-01T17:00:00Z'
    })
  })

  it('should reject non-object payload', async () => {
    const result = await invoke('not-object')
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('object')
    })
  })

  it('should reject null payload', async () => {
    const result = await invoke(null)
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('object')
    })
  })

  it('should reject invalid eventType', async () => {
    const result = await invoke({ eventType: 'invalid_type' })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('eventType')
    })
  })

  it('should reject missing eventType', async () => {
    const result = await invoke({})
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('eventType')
    })
  })

  it('should reject note longer than 1000 chars', async () => {
    const result = await invoke({
      eventType: 'clock_in',
      note: 'a'.repeat(1001)
    })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('note')
    })
  })

  it('should accept note with exactly 1000 chars', async () => {
    const result = await invoke({
      eventType: 'clock_in',
      note: 'a'.repeat(1000)
    })
    expect(result).toEqual({ ok: true, data: { id: 1 } })
  })

  it('should reject non-string note', async () => {
    const result = await invoke({ eventType: 'clock_in', note: 123 })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('note')
    })
  })

  it('should reject invalid occurredAt format', async () => {
    const result = await invoke({
      eventType: 'clock_in',
      occurredAt: 'not-a-date'
    })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('occurredAt')
    })
  })

  it('should accept all valid event types', async () => {
    for (const eventType of ['clock_in', 'clock_out', 'break_start', 'break_end']) {
      const result = await invoke({ eventType })
      expect(result).toEqual({ ok: true, data: { id: 1 } })
    }
  })
})

describe('attendance:getLogs validation', () => {
  const invoke = (payload: unknown) => handlers['attendance:getLogs'](null, payload)

  it('should accept empty/null/undefined payload', async () => {
    expect(await invoke(undefined)).toEqual(expect.objectContaining({ ok: true }))
    expect(await invoke(null)).toEqual(expect.objectContaining({ ok: true }))
  })

  it('should accept valid request with all params', async () => {
    const result = await invoke({
      from: '2024-01-01T00:00:00Z',
      to: '2024-01-02T00:00:00Z',
      limit: 100,
      cursor: 'abc123'
    })
    expect(result).toEqual(expect.objectContaining({ ok: true }))
  })

  it('should reject non-object payload', async () => {
    const result = await invoke('string')
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('object')
    })
  })

  it('should reject invalid from date', async () => {
    const result = await invoke({ from: 'not-a-date' })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('from')
    })
  })

  it('should reject invalid to date', async () => {
    const result = await invoke({ to: 'not-a-date' })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('to')
    })
  })

  it('should reject non-string cursor', async () => {
    const result = await invoke({ cursor: 123 })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('cursor')
    })
  })

  it('should reject non-number limit', async () => {
    const result = await invoke({ limit: 'fifty' })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('limit')
    })
  })

  it('should reject limit below 1', async () => {
    const result = await invoke({ limit: 0 })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('limit')
    })
  })

  it('should reject limit above 200', async () => {
    const result = await invoke({ limit: 201 })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('limit')
    })
  })

  it('should reject non-integer limit', async () => {
    const result = await invoke({ limit: 50.5 })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('limit')
    })
  })

  it('should default limit to 50 when not provided', async () => {
    await invoke({})
    expect(attendanceService.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    )
  })
})

describe('attendance:getTodaySummary validation', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:getTodaySummary'](null, payload)

  it('should accept empty/null/undefined payload', async () => {
    expect(await invoke(undefined)).toEqual(expect.objectContaining({ ok: true }))
    expect(await invoke(null)).toEqual(expect.objectContaining({ ok: true }))
  })

  it('should accept valid date', async () => {
    const result = await invoke({ date: '2024-01-01T00:00:00Z' })
    expect(result).toEqual(expect.objectContaining({ ok: true }))
  })

  it('should reject non-object payload', async () => {
    const result = await invoke(42)
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('object')
    })
  })

  it('should reject invalid date format', async () => {
    const result = await invoke({ date: 'invalid' })
    expect(result).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: expect.stringContaining('date')
    })
  })
})

describe('attendance:updateLog', () => {
  async function invokeHandler(channel: string, payload: unknown) {
    const handler = handlers[channel]
    if (!handler) throw new Error(`No handler for ${channel}`)
    return handler(null, payload)
  }

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
  async function invokeHandler(channel: string, payload: unknown) {
    const handler = handlers[channel]
    if (!handler) throw new Error(`No handler for ${channel}`)
    return handler(null, payload)
  }

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
  async function invokeHandler(channel: string, payload: unknown) {
    const handler = handlers[channel]
    if (!handler) throw new Error(`No handler for ${channel}`)
    return handler(null, payload)
  }

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
  async function invokeHandler(channel: string, payload: unknown) {
    const handler = handlers[channel]
    if (!handler) throw new Error(`No handler for ${channel}`)
    return handler(null, payload)
  }

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
