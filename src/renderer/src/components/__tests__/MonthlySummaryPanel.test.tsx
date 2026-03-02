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
    expect(screen.getByText('月次集計')).toBeInTheDocument()
  })

  it('shows summary cards with data', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={sampleSummary}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    expect(screen.getByText('合計勤務時間')).toBeInTheDocument()
    expect(screen.getByText('出勤日数')).toBeInTheDocument()
    expect(screen.getByText('2日')).toBeInTheDocument()
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

  it('renders daily bars', () => {
    render(
      <MonthlySummaryPanel
        monthlySummary={sampleSummary}
        isLoading={false}
        onLoadSummary={mockLoadSummary}
      />
    )
    expect(screen.getByText('日別勤務時間')).toBeInTheDocument()
    expect(screen.getByText('8h')).toBeInTheDocument()
    expect(screen.getByText('5h')).toBeInTheDocument()
  })
})
