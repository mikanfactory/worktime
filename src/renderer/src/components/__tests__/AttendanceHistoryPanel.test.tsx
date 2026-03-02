import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceHistoryPanel } from '../AttendanceHistoryPanel'
import type { AttendanceLog } from '../../../../shared/attendance'

const makeLogs = (overrides: Partial<AttendanceLog>[] = []): AttendanceLog[] =>
  overrides.map((o, i) => ({
    id: i + 1,
    eventType: 'clock_in' as const,
    timestamp: '2024-01-01T09:00:00Z',
    createdAt: '2024-01-01T09:00:00Z',
    ...o
  }))

describe('formatEventType', () => {
  it('should display "打刻" for clock_in', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'clock_in' }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('打刻')).toBeInTheDocument()
  })

  it('should display "退勤" for clock_out', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'clock_out' }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('退勤')).toBeInTheDocument()
  })

  it('should display "休憩開始" for break_start', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'break_start' }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('休憩開始')).toBeInTheDocument()
  })

  it('should display "休憩終了" for break_end', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'break_end' }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('休憩終了')).toBeInTheDocument()
  })
})

describe('loading state', () => {
  it('should display spinner when loading', () => {
    render(<AttendanceHistoryPanel logs={[]} isLoading={true} />)
    expect(screen.getByRole('heading', { name: 'Attendance History' })).toBeInTheDocument()
    // Loader2 has animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

describe('empty state', () => {
  it('should show empty message when no logs', () => {
    render(<AttendanceHistoryPanel logs={[]} isLoading={false} />)
    expect(screen.getByText('No attendance logs found.')).toBeInTheDocument()
  })
})

describe('log display', () => {
  it('should display note when present', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ note: 'Remote work' }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('Remote work')).toBeInTheDocument()
  })

  it('should display "-" when note is absent', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ note: undefined }])}
        isLoading={false}
      />
    )
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('should render multiple log rows', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([
          { eventType: 'clock_in' },
          { eventType: 'clock_out' }
        ])}
        isLoading={false}
      />
    )
    expect(screen.getByText('打刻')).toBeInTheDocument()
    expect(screen.getByText('退勤')).toBeInTheDocument()
  })
})
