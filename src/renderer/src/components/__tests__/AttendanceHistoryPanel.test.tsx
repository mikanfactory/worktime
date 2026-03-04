import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceHistoryPanel } from '../AttendanceHistoryPanel'
import type { AttendanceLog } from '../../../../shared/attendance'

const mockProps = {
  onUpdateLog: vi.fn().mockResolvedValue(true),
  onDeleteLog: vi.fn().mockResolvedValue(true),
  onLogAttendance: vi.fn().mockResolvedValue(true),
  onRefreshLogs: vi.fn().mockResolvedValue(undefined)
}

const makeLogs = (overrides: Partial<AttendanceLog>[] = []): AttendanceLog[] =>
  overrides.map((o, i) => ({
    id: i + 1,
    eventType: 'clock_in' as const,
    timestamp: '2024-01-01T09:00:00Z',
    createdAt: '2024-01-01T09:00:00Z',
    ...o
  }))

describe('formatEventType', () => {
  it('should display "Clock In" for clock_in', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'clock_in' }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getAllByText('Clock In').length).toBeGreaterThanOrEqual(1)
  })

  it('should display "Clock Out" for clock_out', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'clock_out' }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('Clock Out')).toBeInTheDocument()
  })

  it('should display "Break Start" for break_start', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'break_start' }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('Break Start')).toBeInTheDocument()
  })

  it('should display "Break End" for break_end', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ eventType: 'break_end' }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('Break End')).toBeInTheDocument()
  })
})

describe('loading state', () => {
  it('should display spinner when loading', () => {
    render(
      <AttendanceHistoryPanel
        logs={[]}
        isLoading={true}
        {...mockProps}
      />
    )
    expect(screen.getByText('Attendance History')).toBeInTheDocument()
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})

describe('empty state', () => {
  it('should show empty message when no logs', () => {
    render(
      <AttendanceHistoryPanel
        logs={[]}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('No attendance logs found.')).toBeInTheDocument()
  })
})

describe('log display', () => {
  it('should display note when present', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ note: 'Remote work' }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('Remote work')).toBeInTheDocument()
  })

  it('should display "-" when note is absent', () => {
    render(
      <AttendanceHistoryPanel
        logs={makeLogs([{ note: undefined }])}
        isLoading={false}
        {...mockProps}
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
        {...mockProps}
      />
    )
    expect(screen.getAllByText('Clock In').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Clock Out')).toBeInTheDocument()
  })
})
