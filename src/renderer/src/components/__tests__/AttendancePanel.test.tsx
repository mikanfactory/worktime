import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AttendancePanel } from '../AttendancePanel'
import type { AttendanceSummary } from '../../../../shared/attendance'

const defaultSummary: AttendanceSummary = {
  workedSeconds: 0,
  breakSeconds: 0,
  isWorking: false,
  isOnBreak: false
}

const defaultProps = {
  summary: defaultSummary,
  onClockIn: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  onClockOut: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  onStartBreak: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  onEndBreak: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
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
  it('should show Clock In and Clock Out buttons', () => {
    render(<AttendancePanel {...defaultProps} />)
    expect(screen.getAllByText('Clock In').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Clock Out')).toBeInTheDocument()
  })

  it('should show Elapsed Time label', () => {
    render(<AttendancePanel {...defaultProps} />)
    expect(screen.getByText('Elapsed Time')).toBeInTheDocument()
  })

  it('should show status info row', () => {
    render(<AttendancePanel {...defaultProps} />)
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('should show Break button when working and not on break', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, isWorking: true, isOnBreak: false }}
      />
    )
    expect(screen.getByText('Break')).toBeInTheDocument()
  })

  it('should show Resume button when on break', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, isWorking: true, isOnBreak: true }}
      />
    )
    expect(screen.getByText('Resume')).toBeInTheDocument()
  })

  it('should show On Break status when on break', () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, isWorking: true, isOnBreak: true }}
      />
    )
    expect(screen.getByText('On Break')).toBeInTheDocument()
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

  it('should not increment when on break', async () => {
    render(
      <AttendancePanel
        {...defaultProps}
        summary={{ ...defaultSummary, workedSeconds: 100, isWorking: true, isOnBreak: true }}
      />
    )

    await act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('00:01:40')).toBeInTheDocument()
  })
})

describe('interactions', () => {
  it('should call onClockIn and onRefreshSummary on Clock In click', async () => {
    const onClockIn = vi.fn<() => Promise<boolean>>().mockResolvedValue(true)
    const onRefreshSummary = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(
      <AttendancePanel
        {...defaultProps}
        onClockIn={onClockIn}
        onRefreshSummary={onRefreshSummary}
      />
    )

    const clockInButtons = screen.getAllByText('Clock In')
    const clockInBtn = clockInButtons.find(el => el.closest('button'))?.closest('button')
    fireEvent.click(clockInBtn!)

    await waitFor(() => {
      expect(onClockIn).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(onRefreshSummary.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('should not call onRefreshSummary if onClockIn returns false', async () => {
    const onClockIn = vi.fn<() => Promise<boolean>>().mockResolvedValue(false)
    const onRefreshSummary = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

    render(
      <AttendancePanel
        {...defaultProps}
        onClockIn={onClockIn}
        onRefreshSummary={onRefreshSummary}
      />
    )

    onRefreshSummary.mockClear()

    const clockInButtons = screen.getAllByText('Clock In')
    const clockInBtn = clockInButtons.find(el => el.closest('button'))?.closest('button')
    fireEvent.click(clockInBtn!)

    await waitFor(() => {
      expect(onClockIn).toHaveBeenCalled()
    })

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
