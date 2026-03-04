import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { MonthlySummary } from '../../../shared/attendance'

interface MonthlySummaryPanelProps {
  monthlySummary: MonthlySummary | null
  isLoading: boolean
  onLoadSummary: (yearMonth: string) => Promise<void>
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

function formatHoursMinutesShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MonthlySummaryPanel({
  monthlySummary,
  isLoading,
  onLoadSummary
}: MonthlySummaryPanelProps) {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)

  const handleMonthChange = useCallback(
    (delta: number) => {
      setYearMonth((prev) => {
        const next = shiftMonth(prev, delta)
        void onLoadSummary(next)
        return next
      })
    },
    [onLoadSummary]
  )

  useEffect(() => {
    void onLoadSummary(yearMonth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const avgSecondsPerDay = useMemo(() => {
    if (!monthlySummary || monthlySummary.workingDays === 0) return 0
    return Math.round(monthlySummary.totalWorkedSeconds / monthlySummary.workingDays)
  }, [monthlySummary])

  const weekdayData = useMemo(() => {
    if (!monthlySummary) return DAY_LABELS.map((label) => ({ label, seconds: 0 }))

    const totals = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]

    for (const day of monthlySummary.dailySummaries) {
      const date = new Date(day.date + 'T00:00:00')
      const dow = date.getDay()
      if (day.workedSeconds > 0) {
        totals[dow] += day.workedSeconds
        counts[dow] += 1
      }
    }

    return DAY_LABELS.map((label, i) => ({
      label,
      seconds: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0
    }))
  }, [monthlySummary])

  const maxBarSeconds = useMemo(() => {
    return Math.max(...weekdayData.map((d) => d.seconds), 1)
  }, [weekdayData])

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <h2 className="text-xl font-semibold text-foreground">Monthly Summary</h2>

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

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-5 flex flex-col gap-2">
              <span className="text-[13px] text-muted-foreground">Total Working Hours</span>
              <span className="text-[32px] font-bold text-foreground leading-tight">
                {monthlySummary ? formatHoursMinutesShort(monthlySummary.totalWorkedSeconds) : '-'}
              </span>
            </div>
            <div className="rounded-lg border p-5 flex flex-col gap-2">
              <span className="text-[13px] text-muted-foreground">Working Days</span>
              <span className="text-[32px] font-bold text-foreground leading-tight">
                {monthlySummary ? `${monthlySummary.workingDays} days` : '-'}
              </span>
            </div>
            <div className="rounded-lg border p-5 flex flex-col gap-2">
              <span className="text-[13px] text-muted-foreground">Avg Hours/Day</span>
              <span className="text-[32px] font-bold text-foreground leading-tight">
                {monthlySummary && monthlySummary.workingDays > 0
                  ? formatHoursMinutesShort(avgSecondsPerDay)
                  : '-'}
              </span>
            </div>
          </div>

          <div className="flex-1 rounded-lg border p-5 flex flex-col gap-4 overflow-hidden">
            <span className="text-base font-semibold text-foreground">Daily Working Hours</span>
            <ScrollArea className="flex-1">
              <div className="flex items-end gap-2 h-full min-h-[200px]" style={{ paddingBottom: 24 }}>
                {weekdayData.map((item) => {
                  const barHeight =
                    item.seconds > 0
                      ? Math.max(Math.round((item.seconds / maxBarSeconds) * 280), 4)
                      : 4
                  return (
                    <div
                      key={item.label}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                      style={{ height: '100%' }}
                    >
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: barHeight,
                          backgroundColor: item.seconds > 0 ? '#4A90D9' : '#E8EDF2'
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}
