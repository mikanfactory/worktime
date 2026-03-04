import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditTimeDialog } from '../EditTimeDialog'

describe('EditTimeDialog', () => {
  const mockOnSave = vi.fn().mockResolvedValue(true)
  const mockOnOpenChange = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    sessionId: 42,
    fieldLabel: 'Clock In',
    fieldName: 'clockInAt' as const,
    currentValue: '2026-03-01T09:00:00.000Z',
    date: '2026-03-01',
    onSave: mockOnSave
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title with field label', () => {
    render(<EditTimeDialog {...defaultProps} />)
    expect(screen.getByText('Clock Inを編集')).toBeInTheDocument()
  })

  it('renders title with Clock Out label', () => {
    render(<EditTimeDialog {...defaultProps} fieldLabel="Clock Out" fieldName="clockOutAt" />)
    expect(screen.getByText('Clock Outを編集')).toBeInTheDocument()
  })

  it('renders date display', () => {
    render(<EditTimeDialog {...defaultProps} />)
    expect(screen.getByText('2026-03-01')).toBeInTheDocument()
  })

  it('renders save and cancel buttons', () => {
    render(<EditTimeDialog {...defaultProps} />)
    expect(screen.getByText('保存')).toBeInTheDocument()
    expect(screen.getByText('キャンセル')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<EditTimeDialog {...defaultProps} />)

    await user.click(screen.getByText('キャンセル'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onSave with correct sessionId and fieldName', async () => {
    const user = userEvent.setup()
    render(<EditTimeDialog {...defaultProps} />)

    await user.click(screen.getByText('保存'))
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        clockInAt: expect.any(String)
      })
    )
  })

  it('calls onSave with clockOutAt field when fieldName is clockOutAt', async () => {
    const user = userEvent.setup()
    render(
      <EditTimeDialog
        {...defaultProps}
        fieldLabel="Clock Out"
        fieldName="clockOutAt"
        currentValue="2026-03-01T18:00:00.000Z"
      />
    )

    await user.click(screen.getByText('保存'))
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        clockOutAt: expect.any(String)
      })
    )
  })

  it('closes dialog on successful save', async () => {
    const user = userEvent.setup()
    render(<EditTimeDialog {...defaultProps} />)

    await user.click(screen.getByText('保存'))
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not close dialog on failed save', async () => {
    const failingSave = vi.fn().mockResolvedValue(false)
    const user = userEvent.setup()
    render(<EditTimeDialog {...defaultProps} onSave={failingSave} />)

    await user.click(screen.getByText('保存'))
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('renders time input pre-populated with current value', () => {
    render(<EditTimeDialog {...defaultProps} />)
    const input = screen.getByLabelText('時刻') as HTMLInputElement
    expect(input.value).not.toBe('')
  })

  it('does not render when open is false', () => {
    render(<EditTimeDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Clock Inを編集')).not.toBeInTheDocument()
  })
})
