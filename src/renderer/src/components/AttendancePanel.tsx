import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import type { AttendanceSummary } from '../../../shared/attendance'

interface AttendancePanelProps {
  summary: AttendanceSummary
  onLogAttendance: () => Promise<boolean>
  onRefreshSummary: () => Promise<void>
  error?: string | null
}

export function AttendancePanel({
  summary,
  onLogAttendance,
  onRefreshSummary,
  error
}: AttendancePanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(summary.workedSeconds)

  useEffect(() => {
    void onRefreshSummary()
  }, [onRefreshSummary])

  useEffect(() => {
    setElapsedSeconds(summary.workedSeconds)
  }, [summary.workedSeconds])

  useEffect(() => {
    if (!summary.isWorking) {
      return
    }

    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [summary.isWorking])

  const buttonStyle = useMemo(
    () => ({
      backgroundColor: summary.isWorking ? '#e57373' : '#90c695',
      color: 'white',
      fontSize: '1.5rem',
      fontWeight: '500'
    }),
    [summary.isWorking]
  )

  const handleClockIn = async () => {
    const success = await onLogAttendance()
    if (!success) {
      return
    }
    await onRefreshSummary()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-white">
      <div className="text-center space-y-8">
        <div className="text-8xl font-bold text-navy-900" style={{ color: '#1a1a4d' }}>
          {formatElapsedTime(elapsedSeconds)}
        </div>
        <Button
          size="lg"
          className="h-20 px-16 text-2xl rounded-3xl"
          style={buttonStyle}
          onClick={handleClockIn}
          disabled={false}
        >
          {summary.isWorking ? '退勤' : '出勤'}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  )
}

function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
