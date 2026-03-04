import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditSessionDialog } from '../EditLogDialog'
import type { DailySummary } from '../../../../shared/attendance'

describe('EditSessionDialog', () => {
  const mockOnSave = vi.fn().mockResolvedValue(true)
  const mockOnDelete = vi.fn().mockResolvedValue(true)
  const mockOnOpenChange = vi.fn()

  const sampleSummary: DailySummary = {
    date: '2026-03-01',
    workedSeconds: 28800,
    breakSeconds: 0,
    firstClockIn: '2026-03-01T09:00:00.000Z',
    lastClockOut: '2026-03-01T17:00:00.000Z',
    sessionCount: 1
  }

  it('renders title and save button when summary is provided', () => {
    render(
      <EditSessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        summary={sampleSummary}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('セッションを編集')).toBeInTheDocument()
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('削除')).toBeInTheDocument()
  })

  it('renders cancel button', () => {
    render(
      <EditSessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        summary={sampleSummary}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('キャンセル')).toBeInTheDocument()
  })

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EditSessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        summary={sampleSummary}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('キャンセル'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render delete button when onDelete is not provided', () => {
    render(
      <EditSessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        summary={sampleSummary}
        onSave={mockOnSave}
      />
    )
    expect(screen.queryByText('削除')).not.toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(
      <EditSessionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        summary={sampleSummary}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('日付')).toBeInTheDocument()
    expect(screen.getByText('出勤時刻')).toBeInTheDocument()
    expect(screen.getByText('退勤時刻')).toBeInTheDocument()
    expect(screen.getByText('メモ')).toBeInTheDocument()
  })
})
