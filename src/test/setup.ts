import '@testing-library/jest-dom'

// Mock ResizeObserver for Radix UI components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock Electron APIs for testing
global.window = Object.create(window)

// Mock the API object that would normally be provided by preload
Object.defineProperty(window, 'api', {
  value: {
    logAttendance: vi.fn().mockResolvedValue({ ok: true, data: { id: 1 } }),
    getAttendanceLogs: vi.fn().mockResolvedValue({ ok: true, data: { logs: [], nextCursor: undefined } }),
    getTodaySummary: vi.fn().mockResolvedValue({
      ok: true,
      data: { workedSeconds: 0, isWorking: false }
    }),
    updateAttendanceLog: vi.fn().mockResolvedValue({ ok: true, data: { id: 1 } }),
    deleteAttendanceLog: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getDailySummaries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    getMonthlySummary: vi.fn().mockResolvedValue({
      ok: true,
      data: { yearMonth: '2026-03', totalWorkedSeconds: 0, workingDays: 0, dailySummaries: [] }
    })
  },
  writable: true
})
