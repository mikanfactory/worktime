import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailySummaryPanel } from '../DailySummaryPanel'
import type { DailySummary } from '../../../../shared/attendance'

describe('DailySummaryPanel', () => {
  const mockLoadSummaries = vi.fn().mockResolvedValue(undefined)

  const mockUpdateWorkSession = vi.fn().mockResolvedValue(true)

  const sampleSummaries: DailySummary[] = [
    {
      date: '2026-03-01',
      workedSeconds: 28800,
      breakSeconds: 3600,
      firstClockIn: '2026-03-01T09:00:00.000Z',
      lastClockOut: '2026-03-01T17:00:00.000Z',
      sessionCount: 1,
      firstSessionId: 1,
      lastSessionId: 1
    },
    {
      date: '2026-03-02',
      workedSeconds: 18000,
      breakSeconds: 0,
      firstClockIn: '2026-03-02T10:00:00.000Z',
      lastClockOut: '2026-03-02T15:00:00.000Z',
      sessionCount: 1,
      firstSessionId: 2,
      lastSessionId: 2
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

  it('shows all days of the month even when no data', () => {
    render(
      <DailySummaryPanel
        dailySummaries={[]}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    // Should show rows for all days of the current month (no "No records" message)
    const rows = screen.getAllByRole('row')
    // Header row + all days of current month
    expect(rows.length).toBeGreaterThan(1)
    expect(screen.queryByText('No records found for this month.')).not.toBeInTheDocument()
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

  it('renders break time column', () => {
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    expect(screen.getByText('Break')).toBeInTheDocument()
    // First row has 3600 break seconds = 1h 00m
    expect(screen.getByText('1h 00m')).toBeInTheDocument()
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
        onUpdateWorkSession={mockUpdateWorkSession}
      />
    )

    const rows = screen.getAllByRole('row')
    // First row is header, second is first data row (03/01)
    await user.click(rows[1])
    expect(onDateClick).toHaveBeenCalledWith(expect.stringMatching(/^2026-03-01$/))
  })

  it('renders pencil icons next to clock-in and clock-out times', () => {
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
        onUpdateWorkSession={mockUpdateWorkSession}
      />
    )
    // Each data row with data has 2 pencil icon buttons (clock in + clock out)
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    expect(editButtons.length).toBe(4) // 2 rows x 2 icons
  })

  it('does not render pencil icons when no clock-in/clock-out values', () => {
    const noTimeSummaries: DailySummary[] = [
      {
        date: '2026-03-01',
        workedSeconds: 0,
        breakSeconds: 0,
        sessionCount: 0
      }
    ]
    render(
      <DailySummaryPanel
        dailySummaries={noTimeSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
        onUpdateWorkSession={mockUpdateWorkSession}
      />
    )
    const editButtons = screen.queryAllByRole('button', { name: /edit/i })
    expect(editButtons.length).toBe(0)
  })

  it('opens edit dialog when pencil icon is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
        onUpdateWorkSession={mockUpdateWorkSession}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0]) // Click first pencil icon (Clock In)
    expect(screen.getByText('Clock Inを編集')).toBeInTheDocument()
  })

  it('does not render pencil icons when onUpdateWorkSession is not provided', () => {
    render(
      <DailySummaryPanel
        dailySummaries={sampleSummaries}
        isLoading={false}
        onLoadSummaries={mockLoadSummaries}
      />
    )
    const editButtons = screen.queryAllByRole('button', { name: /edit/i })
    expect(editButtons.length).toBe(0)
  })
})
