import { useEffect, useState } from 'react'
import { Play, LogOut, Coffee, ArrowRight } from 'lucide-react'
import type { AttendanceSummary } from '../../../shared/attendance'

interface AttendancePanelProps {
  summary: AttendanceSummary
  onClockIn: () => Promise<boolean>
  onClockOut: () => Promise<boolean>
  onStartBreak: () => Promise<boolean>
  onEndBreak: () => Promise<boolean>
  onRefreshSummary: () => Promise<void>
  error?: string | null
}

export function AttendancePanel({
  summary,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
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
      setElapsedSeconds((current) => current + (summary.isOnBreak ? 0 : 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [summary.isWorking, summary.isOnBreak])

  const handleAction = async (action: () => Promise<boolean>) => {
    const success = await action()
    if (!success) {
      return
    }
    await onRefreshSummary()
  }

  const formatClockInTime = (): string => {
    if (!summary.firstClockIn) return '--:--'
    const date = new Date(summary.firstClockIn)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const formatToday = (): string => {
    const now = new Date()
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const weekday = weekdays[now.getDay()]
    return `${year}/${month}/${day} (${weekday})`
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white">
      <div className="flex flex-col items-center gap-8">
        <span className="text-sm font-medium text-muted-foreground">Elapsed Time</span>

        <span
          className="text-[56px] font-bold tracking-wider"
          style={{ color: '#1A1A4D' }}
        >
          {formatElapsedTime(elapsedSeconds)}
        </span>

        <div className="flex items-center gap-6">
          <button
            onClick={summary.isWorking ? undefined : () => handleAction(onClockIn)}
            className="flex flex-col items-center justify-center gap-2 rounded-full transition-opacity"
            style={{
              width: 120,
              height: 120,
              backgroundColor: '#90C695',
              opacity: summary.isWorking ? 0.5 : 1,
              cursor: summary.isWorking ? 'default' : 'pointer'
            }}
          >
            <Play className="h-8 w-8 text-white" />
            <span className="text-sm font-semibold text-white">Clock In</span>
          </button>

          {summary.isWorking && !summary.isOnBreak && (
            <button
              onClick={() => handleAction(onStartBreak)}
              className="flex flex-col items-center justify-center gap-2 rounded-full transition-opacity"
              style={{
                width: 120,
                height: 120,
                backgroundColor: '#F5A623',
                cursor: 'pointer'
              }}
            >
              <Coffee className="h-8 w-8 text-white" />
              <span className="text-sm font-semibold text-white">Break</span>
            </button>
          )}

          {summary.isOnBreak && (
            <button
              onClick={() => handleAction(onEndBreak)}
              className="flex flex-col items-center justify-center gap-2 rounded-full transition-opacity"
              style={{
                width: 120,
                height: 120,
                backgroundColor: '#4A90D9',
                cursor: 'pointer'
              }}
            >
              <ArrowRight className="h-8 w-8 text-white" />
              <span className="text-sm font-semibold text-white">Resume</span>
            </button>
          )}

          <button
            onClick={summary.isWorking && !summary.isOnBreak ? () => handleAction(onClockOut) : undefined}
            className="flex flex-col items-center justify-center gap-2 rounded-full transition-opacity"
            style={{
              width: 120,
              height: 120,
              backgroundColor: '#E57373',
              opacity: summary.isWorking && !summary.isOnBreak ? 1 : 0.5,
              cursor: summary.isWorking && !summary.isOnBreak ? 'pointer' : 'default'
            }}
          >
            <LogOut className="h-8 w-8 text-white" />
            <span className="text-sm font-semibold text-white">Clock Out</span>
          </button>
        </div>

        <div className="flex items-center gap-12 w-full justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <span
              className="text-base font-semibold"
              style={{
                color: summary.isOnBreak
                  ? '#F5A623'
                  : summary.isWorking
                    ? '#90C695'
                    : '#737373'
              }}
            >
              {summary.isOnBreak ? 'On Break' : summary.isWorking ? 'Working' : 'Not Working'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Clock In</span>
            <span className="text-base font-semibold text-foreground">
              {formatClockInTime()}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Today</span>
            <span className="text-base font-semibold text-foreground">
              {formatToday()}
            </span>
          </div>
        </div>

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
