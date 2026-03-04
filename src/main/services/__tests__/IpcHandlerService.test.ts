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
  createWorkSession: vi.fn(),
  endWorkSession: vi.fn(),
  createBreakSession: vi.fn(),
  endBreakSession: vi.fn(),
  getTodaySummary: vi.fn(),
  updateWorkSession: vi.fn(),
  deleteWorkSession: vi.fn(),
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
  vi.spyOn(attendanceService, 'clockIn').mockResolvedValue({
    ok: true,
    data: {
      id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00.000Z',
      breaks: [], createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T09:00:00.000Z'
    }
  })
  vi.spyOn(attendanceService, 'clockOut').mockResolvedValue({
    ok: true,
    data: {
      id: 1, date: '2026-03-01', clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      breaks: [], createdAt: '2026-03-01T09:00:00.000Z', updatedAt: '2026-03-01T17:00:00.000Z'
    }
  })
  vi.spyOn(attendanceService, 'startBreak').mockResolvedValue({
    ok: true,
    data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z' }
  })
  vi.spyOn(attendanceService, 'endBreak').mockResolvedValue({
    ok: true,
    data: { id: 10, workSessionId: 1, startAt: '2026-03-01T12:00:00.000Z', endAt: '2026-03-01T13:00:00.000Z' }
  })
  vi.spyOn(attendanceService, 'getTodaySummary').mockResolvedValue({
    ok: true,
    data: { workedSeconds: 0, breakSeconds: 0, isWorking: false, isOnBreak: false }
  })

  service = new IpcHandlerService(attendanceService)
  service.registerHandlers()
})

describe('attendance:clockIn validation', () => {
  const invoke = (payload: unknown) => handlers['attendance:clockIn'](null, payload)

  it('should accept undefined payload', async () => {
    const result = await invoke(undefined)
    expect(result).toMatchObject({ ok: true })
  })

  it('should accept payload with note', async () => {
    const result = await invoke({ note: 'Remote' })
    expect(result).toMatchObject({ ok: true })
    expect(attendanceService.clockIn).toHaveBeenCalledWith('Remote')
  })

  it('should reject non-object payload', async () => {
    const result = await invoke('not-object')
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('should reject note longer than 1000 chars', async () => {
    const result = await invoke({ note: 'a'.repeat(1001) })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('should accept note with exactly 1000 chars', async () => {
    const result = await invoke({ note: 'a'.repeat(1000) })
    expect(result).toMatchObject({ ok: true })
  })

  it('should reject non-string note', async () => {
    const result = await invoke({ note: 123 })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('should trim whitespace-only note to undefined', async () => {
    await invoke({ note: '   ' })
    expect(attendanceService.clockIn).toHaveBeenCalledWith(undefined)
  })
})

describe('attendance:clockOut', () => {
  it('should call clockOut with no arguments', async () => {
    const result = await handlers['attendance:clockOut'](null, undefined)
    expect(result).toMatchObject({ ok: true })
    expect(attendanceService.clockOut).toHaveBeenCalled()
  })
})

describe('attendance:startBreak validation', () => {
  const invoke = (payload: unknown) => handlers['attendance:startBreak'](null, payload)

  it('should accept undefined payload', async () => {
    const result = await invoke(undefined)
    expect(result).toMatchObject({ ok: true })
  })

  it('should accept payload with note', async () => {
    const result = await invoke({ note: 'Lunch' })
    expect(result).toMatchObject({ ok: true })
    expect(attendanceService.startBreak).toHaveBeenCalledWith('Lunch')
  })
})

describe('attendance:endBreak', () => {
  it('should call endBreak with no arguments', async () => {
    const result = await handlers['attendance:endBreak'](null, undefined)
    expect(result).toMatchObject({ ok: true })
    expect(attendanceService.endBreak).toHaveBeenCalled()
  })
})

describe('attendance:getTodaySummary validation', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:getTodaySummary'](null, payload)

  it('should accept empty/null/undefined payload', async () => {
    expect(await invoke(undefined)).toMatchObject({ ok: true })
    expect(await invoke(null)).toMatchObject({ ok: true })
  })

  it('should accept valid date', async () => {
    const result = await invoke({ date: '2026-01-01T00:00:00Z' })
    expect(result).toMatchObject({ ok: true })
  })

  it('should reject non-object payload', async () => {
    const result = await invoke(42)
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('should reject invalid date format', async () => {
    const result = await invoke({ date: 'invalid' })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })
})

describe('attendance:updateWorkSession', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:updateWorkSession'](null, payload)

  it('rejects non-object payload', async () => {
    const result = await invoke('invalid')
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects missing id', async () => {
    const result = await invoke({ note: 'test' })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects non-positive id', async () => {
    const result = await invoke({ id: 0 })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects invalid clockInAt', async () => {
    const result = await invoke({ id: 1, clockInAt: 'not-a-date' })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects invalid clockOutAt', async () => {
    const result = await invoke({ id: 1, clockOutAt: 'not-a-date' })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects note over 1000 chars', async () => {
    const result = await invoke({ id: 1, note: 'x'.repeat(1001) })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('accepts valid update request', async () => {
    const result = await invoke({
      id: 1,
      clockInAt: '2026-03-01T09:00:00.000Z',
      clockOutAt: '2026-03-01T17:00:00.000Z',
      note: 'test'
    })
    expect(result).toBeDefined()
  })
})

describe('attendance:deleteWorkSession', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:deleteWorkSession'](null, payload)

  it('rejects non-object payload', async () => {
    const result = await invoke(null)
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects non-positive id', async () => {
    const result = await invoke({ id: -1 })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('accepts valid delete request', async () => {
    const result = await invoke({ id: 1 })
    expect(result).toBeDefined()
  })
})

describe('attendance:getDailySummaries', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:getDailySummaries'](null, payload)

  it('rejects non-object payload', async () => {
    const result = await invoke('invalid')
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('rejects invalid yearMonth format', async () => {
    const result = await invoke({ yearMonth: '2026-3' })
    expect(result).toMatchObject({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'yearMonth must match YYYY-MM format'
    })
  })

  it('rejects missing yearMonth', async () => {
    const result = await invoke({})
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('accepts valid yearMonth', async () => {
    const result = await invoke({ yearMonth: '2026-03' })
    expect(result).toBeDefined()
  })
})

describe('attendance:getMonthlySummary', () => {
  const invoke = (payload: unknown) =>
    handlers['attendance:getMonthlySummary'](null, payload)

  it('rejects invalid yearMonth format', async () => {
    const result = await invoke({ yearMonth: 'March 2026' })
    expect(result).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' })
  })

  it('accepts valid yearMonth', async () => {
    const result = await invoke({ yearMonth: '2026-03' })
    expect(result).toBeDefined()
  })
})
