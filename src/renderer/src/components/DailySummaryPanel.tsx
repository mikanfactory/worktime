import { useEffect, useState, useCallback } from 'react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { DailySummary } from '../../../shared/attendance'

interface DailySummaryPanelProps {
  dailySummaries: DailySummary[]
  isLoading: boolean
  onLoadSummaries: (yearMonth: string) => Promise<void>
  onDateClick?: (date: string) => void
}

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-')
  return `${year}年${parseInt(month, 10)}月`
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatWorkedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = weekdays[date.getDay()]
  return `${month}/${day} (${weekday})`
}

function isHoliday(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6
}

export function DailySummaryPanel({
  dailySummaries,
  isLoading,
  onLoadSummaries,
  onDateClick
}: DailySummaryPanelProps) {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)

  const handleMonthChange = useCallback(
    (delta: number) => {
      setYearMonth((prev) => {
        const next = shiftMonth(prev, delta)
        void onLoadSummaries(next)
        return next
      })
    },
    [onLoadSummaries]
  )

  useEffect(() => {
    void onLoadSummaries(yearMonth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <h2 className="text-xl font-semibold text-foreground">Daily Summary</h2>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => handleMonthChange(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[120px] text-center">
          {formatYearMonth(yearMonth)}
        </span>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => handleMonthChange(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Date
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Clock In
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Clock Out
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Break
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Working Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground h-24 px-4">
                      No records found for this month.
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((day) => {
                    const holiday = isHoliday(day.date)
                    const hasWork = day.workedSeconds > 0
                    return (
                      <tr
                        key={day.date}
                        className={`border-b last:border-b-0 ${
                          holiday ? 'bg-[#FAFAFA]' : ''
                        } ${onDateClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                        onClick={() => onDateClick?.(day.date)}
                      >
                        <td
                          className={`text-sm px-4 h-11 ${
                            holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                          }`}
                        >
                          {formatDate(day.date)}
                        </td>
                        <td
                          className={`text-sm px-4 h-11 ${
                            holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                          }`}
                        >
                          {day.firstClockIn ? formatTime(day.firstClockIn) : '-'}
                        </td>
                        <td
                          className={`text-sm px-4 h-11 ${
                            holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                          }`}
                        >
                          {day.lastClockOut ? formatTime(day.lastClockOut) : '-'}
                        </td>
                        <td
                          className={`text-sm px-4 h-11 ${
                            holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                          }`}
                        >
                          {day.breakSeconds > 0 ? formatWorkedTime(day.breakSeconds) : '-'}
                        </td>
                        <td
                          className={`text-sm font-medium px-4 h-11 ${
                            holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                          }`}
                        >
                          {holiday && !hasWork
                            ? 'Holiday'
                            : hasWork
                              ? formatWorkedTime(day.workedSeconds)
                              : '-'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
