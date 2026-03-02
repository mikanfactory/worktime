import '@testing-library/jest-dom'

// Mock Electron APIs for testing (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'api', {
    value: {
      logAttendance: vi.fn(),
      getAttendanceLogs: vi.fn(),
      getTodaySummary: vi.fn()
    },
    writable: true,
    configurable: true
  })
}
