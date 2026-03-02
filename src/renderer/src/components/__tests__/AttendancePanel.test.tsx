import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AttendancePanel } from '../AttendancePanel'
import type { AttendanceSummary } from '../../../../shared/attendance'

const defaultSummary: AttendanceSummary = {
  workedSeconds: 0,
  isWorking: false
}

const defaultProps = {
  summary: defaultSummary,
  onLogAttendance: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  onRefreshSummary: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  error: null
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('formatElapsedTime display', () => {
  it('should display 00:00:00 for 0 seconds', () => {
    render(<AttendancePanel {...defaultProps} />)
    expect(screen.getByText('00:00:00')).toBeInTheDocument()
  })

  it('should display 01:23:45 for 5025 seconds', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, workedSeconds: 5025 }}
      />
    )
    expect(screen.getByText('01:23:45')).toBeInTheDocument()
  })

  it('should display 10:00:00 for 36000 seconds', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, workedSeconds: 36000 }}
      />
    )
    expect(screen.getByText('10:00:00')).toBeInTheDocument()
  })
})

describe('button display', () => {
  it('should show "出勤" when not working', () => {
    render(<AttendancePanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: '出勤' })).toBeInTheDocument()
  })

  it('should show "退勤" when working', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, isWorking: true }}
      />
    )
    expect(screen.getByRole('button', { name: '退勤' })).toBeInTheDocument()
  })
})

describe('timer countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should increment elapsed time every second when working', async () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, workedSeconds: 0, isWorking: true }}
      />
    )

    expect(screen.getByText('00:00:00')).toBeInTheDocument()

    await act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('00:00:03')).toBeInTheDocument()
  })

  it('should not increment when not working', async () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, workedSeconds: 100, isWorking: false }}
      />
    )

    await act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('00:01:40')).toBeInTheDocument()
  })
})

describe('interactions', () => {
  it('should call onLogAttendance and onRefreshSummary on click', async () => {
    const onLogAttendance = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
    const onRefreshSummary = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(
      <AttendancePanel
        {...defaultProps}
        onLogAttendance={onLogAttendance}
        onRefreshSummary={onRefreshSummary}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '出勤' }))

    await waitFor(() => {
      expect(onLogAttendance).toHaveBeenCalled()
    })

    await waitFor(() => {
      // onRefreshSummary is called once on mount and once after clock in
      expect(onRefreshSummary.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('should not call onRefreshSummary if onLogAttendance returns false', async () => {
    const onLogAttendance = vi.fn<() => Promise<boolean>>().mockResolvedValue(false)
    const onRefreshSummary = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(
      <AttendancePanel
        {...defaultProps}
        onLogAttendance={onLogAttendance}
        onRefreshSummary={onRefreshSummary}
      />
    )

    // Reset to count only post-click calls
    onRefreshSummary.mockClear()

    fireEvent.click(screen.getByRole('button', { name: '出勤' }))

    await waitFor(() => {
      expect(onLogAttendance).toHaveBeenCalled()
    })

    // onRefreshSummary should not be called after a failed logAttendance
    expect(onRefreshSummary).not.toHaveBeenCalled()
  })
})

describe('error display', () => {
  it('should display error message when error is provided', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        error="Something went wrong"
      />
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should not display error when null', () => {
    render(<AttendancePanel {...defaultProps} error={null} />)
    expect(screen.queryByText(/went wrong/)).not.toBeInTheDocument()
  })
})

describe('onRefreshSummary on mount', () => {
  it('should call onRefreshSummary on mount', () => {
    const onRefreshSummary = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    render(
      <AttendancePanel
        {...defaultProps}
        onRefreshSummary={onRefreshSummary}
      />
    )
    expect(onRefreshSummary).toHaveBeenCalled()
  })
})

// Need to import act for timer tests
import { act } from '@testing-library/react'
