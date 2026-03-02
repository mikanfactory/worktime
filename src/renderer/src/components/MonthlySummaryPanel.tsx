import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
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

function formatHoursMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}時間${minutes}分`
}

function formatWorkedTimeShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`
}

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

  const maxSeconds =
    monthlySummary?.dailySummaries.reduce(
      (max, d) => Math.max(max, d.workedSeconds),
      0
    ) ?? 0

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">月次集計</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleMonthChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {formatYearMonth(yearMonth)}
          </span>
          <Button variant="outline" size="icon" onClick={() => handleMonthChange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">合計勤務時間</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {monthlySummary
                    ? formatHoursMinutes(monthlySummary.totalWorkedSeconds)
                    : '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">出勤日数</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {monthlySummary ? `${monthlySummary.workingDays}日` : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily bar chart */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm">日別勤務時間</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 px-6 pb-6">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {monthlySummary?.dailySummaries.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      この月の勤務記録はありません。
                    </p>
                  )}
                  {monthlySummary?.dailySummaries.map((day) => {
                    const percent =
                      maxSeconds > 0
                        ? Math.round((day.workedSeconds / maxSeconds) * 100)
                        : 0
                    const dayNum = parseInt(day.date.split('-')[2], 10)
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">
                          {dayNum}
                        </span>
                        <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-sm transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-16 text-right">
                          {formatWorkedTimeShort(day.workedSeconds)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
