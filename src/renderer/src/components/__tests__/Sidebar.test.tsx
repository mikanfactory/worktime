import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

describe('Sidebar', () => {
  it('should render attendance and history tabs', () => {
    render(<Sidebar activeTab="attendance" onTabChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Attendance History' })).toBeInTheDocument()
  })

  it('should call onTabChange with "attendance" when attendance tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="attendance-history" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Attendance' }))
    expect(onTabChange).toHaveBeenCalledWith('attendance')
  })

  it('should call onTabChange with "attendance-history" when history tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<Sidebar activeTab="attendance" onTabChange={onTabChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Attendance History' }))
    expect(onTabChange).toHaveBeenCalledWith('attendance-history')
  })
})
