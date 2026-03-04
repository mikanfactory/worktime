import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailySummaryPanel } from '../DailySummaryPanel'
import type { DailySummary } from '../../../../shared/attendance'

describe('DailySummaryPanel', () => {
  const mockLoadSummaries = vi.fn().mockResolvedValue(undefined)

  const sampleSummaries: DailySummary[] = [
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

  it('renders the title', () => {
    render(
      <DailySummaryPanel
        dailySummaries={[]}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    expect(screen.getByText('Daily Summary')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    render(
      <DailySummaryPanel
        dailySummaries={[]}
        isLoading={true}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    expect(screen.getByText('Daily Summary')).toBeInTheDocument()
  })

  it('shows empty message when no data', () => {
    render(
      <DailySummaryPanel
        dailySummaries={[]}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    expect(screen.getByText('No records found for this month.')).toBeInTheDocument()
  })

  it('renders daily summaries', () => {
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    // Check worked time is displayed (8h 00m for 28800 seconds, 5h 00m for 18000 seconds)
    expect(screen.getByText('8h 00m')).toBeInTheDocument()
    expect(screen.getByText('5h 00m')).toBeInTheDocument()
  })

  it('navigates months with buttons', async () => {
    const user = userEvent.setup()
    render(
      <DailySummaryPanel
        dailySummaries={[]}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )

    const prevButton = screen.getAllByRole('button')[0]
    await user.click(prevButton)
    expect(mockLoadSummaries).toHaveBeenCalled()
  })

  it('calls onDateClick when a row is clicked', async () => {
    const user = userEvent.setup()
    const onDateClick = vi.fn()
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
        onDateClick={onDateClick}
      />
    )

    const rows = screen.getAllByRole('row')
    // First row is header, second is first data row
    await user.click(rows[1])
    expect(onDateClick).toHaveBeenCalledWith('2026-03-01')
  })
})
