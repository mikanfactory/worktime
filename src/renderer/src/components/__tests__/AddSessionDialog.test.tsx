import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddSessionDialog } from '../AddSessionDialog'

describe('AddSessionDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    date: '2026-03-01',
    onSave: vi.fn().mockResolvedValue(true)
  }

  it('renders dialog with title and description', () => {
    render(<AddSessionDialog {...defaultProps} />)
    expect(screen.getByText('勤務記録を追加')).toBeInTheDocument()
    expect(screen.getByText('2026-03-01 の勤務記録を手動で作成します。')).toBeInTheDocument()
  })

  it('renders Clock In and Clock Out inputs', () => {
    render(<AddSessionDialog {...defaultProps} />)
    expect(screen.getByLabelText('Clock In')).toBeInTheDocument()
    expect(screen.getByLabelText('Clock Out')).toBeInTheDocument()
  })

  it('has default values based on date', () => {
    render(<AddSessionDialog {...defaultProps} />)
    const clockInInput = screen.getByLabelText('Clock In') as HTMLInputElement
    const clockOutInput = screen.getByLabelText('Clock Out') as HTMLInputElement
    expect(clockInInput.value).toBe('2026-03-01T09:00')
    expect(clockOutInput.value).toBe('2026-03-01T18:00')
  })

  it('calls onSave with correct data when save is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    render(<AddSessionDialog {...defaultProps} onSave={onSave} />)

    await user.click(screen.getByText('保存'))

    expect(onSave).toHaveBeenCalledWith({
      date: '2026-03-01',
      clockInAt: expect.any(String),
      clockOutAt: expect.any(String)
    })
  })

  it('closes dialog on successful save', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)
    render(<AddSessionDialog {...defaultProps} onOpenChange={onOpenChange} onSave={onSave} />)

    await user.click(screen.getByText('保存'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not close dialog on failed save', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const onSave = vi.fn().mockResolvedValue(false)
    render(<AddSessionDialog {...defaultProps} onOpenChange={onOpenChange} onSave={onSave} />)

    await user.click(screen.getByText('保存'))

    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<AddSessionDialog {...defaultProps} onOpenChange={onOpenChange} />)

    await user.click(screen.getByText('キャンセル'))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when open is false', () => {
    render(<AddSessionDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('勤務記録を追加')).not.toBeInTheDocument()
  })
})
