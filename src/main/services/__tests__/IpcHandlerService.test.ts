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
