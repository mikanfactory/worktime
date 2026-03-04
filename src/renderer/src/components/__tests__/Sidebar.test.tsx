import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  it('should render tab buttons', () => {
    render(<Sidebar activeTab="attendance" onTabChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Daily Summary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monthly Summary' })).toBeInTheDocument()
  })

  it('should call onTabChange with "attendance" when attendance tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="daily-summary" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Attendance' }))
    expect(onTabChange).toHaveBeenCalledWith('attendance')
  })

  it('should call onTabChange with "daily-summary" when daily summary tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="attendance" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Daily Summary' }))
    expect(onTabChange).toHaveBeenCalledWith('daily-summary')
  })
})
