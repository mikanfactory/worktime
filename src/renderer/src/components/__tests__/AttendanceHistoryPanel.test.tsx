import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceHistoryPanel } from '../AttendanceHistoryPanel'
import type { DailySummary } from '../../../../shared/attendance'

const mockProps = {
  onUpdateWorkSession: vi.fn().mockResolvedValue(true),
  onDeleteWorkSession: vi.fn().mockResolvedValue(true),
  onLoadSummaries: vi.fn().mockResolvedValue(undefined)
}

const makeSummaries = (overrides: Partial<DailySummary>[] = []): DailySummary[] =>
  overrides.map((o, i) => ({
    date: '2026-03-01',
    workedSeconds: 28800,
    breakSeconds: 0,
    firstClockIn: '2026-03-01T09:00:00.000Z',
    lastClockOut: '2026-03-01T17:00:00.000Z',
    sessionCount: 1,
    firstSessionId: i + 1,
    lastSessionId: i + 1,
    ...o
  }))

describe('loading state', () => {
  it('should display spinner when loading', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={[]}
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
  it('should show empty message when no summaries', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={[]}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('No records found for this month.')).toBeInTheDocument()
  })
})

describe('summary display', () => {
  it('should display worked time for a day', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={makeSummaries([{ workedSeconds: 28800 }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('8h 00m')).toBeInTheDocument()
  })

  it('should display break time when present', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={makeSummaries([{ breakSeconds: 3600 }])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('1h 00m')).toBeInTheDocument()
  })

  it('should display dash for no break time', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={makeSummaries([{ breakSeconds: 0 }])}
        isLoading={false}
        {...mockProps}
      />
    )
    // There should be a '-' in the break column
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })

  it('should render multiple rows', () => {
    render(
      <AttendanceHistoryPanel
        dailySummaries={makeSummaries([
          { date: '2026-03-01', workedSeconds: 28800 },
          { date: '2026-03-02', workedSeconds: 18000 }
        ])}
        isLoading={false}
        {...mockProps}
      />
    )
    expect(screen.getByText('8h 00m')).toBeInTheDocument()
    expect(screen.getByText('5h 00m')).toBeInTheDocument()
  })
})
