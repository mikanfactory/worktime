import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditLogDialog } from '../EditLogDialog'
import type { AttendanceLog } from '../../../../shared/attendance'

describe('EditLogDialog', () => {
  const mockOnSave = vi.fn().mockResolvedValue(true)
  const mockOnDelete = vi.fn().mockResolvedValue(true)
  const mockOnOpenChange = vi.fn()

  const sampleLog: AttendanceLog = {
    id: 1,
    eventType: 'clock_in',
    timestamp: '2026-03-01T09:00:00.000Z',
    note: 'test note',
    createdAt: '2026-03-01T09:00:00.000Z'
  }

  it('renders in add mode when log is null', () => {
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={null}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('ログを追加')).toBeInTheDocument()
    expect(screen.getByText('追加')).toBeInTheDocument()
  })

  it('renders in edit mode when log is provided', () => {
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={sampleLog}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.getByText('ログを編集')).toBeInTheDocument()
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('削除')).toBeInTheDocument()
  })

  it('renders cancel button', () => {
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={null}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('キャンセル')).toBeInTheDocument()
  })

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={null}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('キャンセル'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render delete button in add mode', () => {
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={null}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
      />
    )
    expect(screen.queryByText('削除')).not.toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(
      <EditLogDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        log={null}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('種別')).toBeInTheDocument()
    expect(screen.getByText('日時')).toBeInTheDocument()
    expect(screen.getByText('メモ')).toBeInTheDocument()
  })
})
