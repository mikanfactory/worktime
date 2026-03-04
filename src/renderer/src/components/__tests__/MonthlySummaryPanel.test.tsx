import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthlySummaryPanel } from '../MonthlySummaryPanel'
import type { MonthlySummary } from '../../../../shared/attendance'

describe('MonthlySummaryPanel', () => {
  const mockLoadSummary = vi.fn().mockResolvedValue(undefined)

  const sampleSummary: MonthlySummary = {
    yearMonth: '2026-03',
    totalWorkedSeconds: 46800,
    workingDays: 2,
    dailySummaries: [
      {
        date: '2026-03-01',
        workedSeconds: 28800,
        firstClockIn: '2026-03-01T09:00:00.000Z',
        lastClockOut: '2026-03-01T17:00:00.000Z',
        logCount: 2
      },
      {
        date: '2026-03-02',
        workedSeconds: 18000,
        firstClockIn: '2026-03-02T10:00:00.000Z',
        lastClockOut: '2026-03-02T15:00:00.000Z',
        logCount: 2
      }
    ]
  }

  it('renders the title', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={null}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    expect(screen.getByText('Monthly Summary')).toBeInTheDocument()
  })

  it('shows summary cards with data', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={sampleSummary}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    expect(screen.getByText('Total Working Hours')).toBeInTheDocument()
    expect(screen.getByText('Working Days')).toBeInTheDocument()
    expect(screen.getByText('Avg Hours/Day')).toBeInTheDocument()
    expect(screen.getByText('2 days')).toBeInTheDocument()
  })

  it('shows dashes when no summary', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={null}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('navigates months', async () => {
    const user = userEvent.setup()
    render(
      <MonthlySummaryPanel
        monthlySummary={null}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0]) // prev month
    expect(mockLoadSummary).toHaveBeenCalled()
  })

  it('renders daily working hours chart', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={sampleSummary}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    expect(screen.getByText('Daily Working Hours')).toBeInTheDocument()
    // Day of week labels
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
  })
})
