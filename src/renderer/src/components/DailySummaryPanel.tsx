import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
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
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const day = date.getDate()
  const weekday = weekdays[date.getDay()]
  return `${day}日 (${weekday})`
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
    <div className="h-full flex flex-col p-6 space-y-6">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>日次集計</CardTitle>
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
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>出勤時刻</TableHead>
                    <TableHead>退勤時刻</TableHead>
                    <TableHead className="text-right">勤務時間</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        この月の勤務記録はありません。
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailySummaries.map((day) => (
                      <TableRow
                        key={day.date}
                        className={onDateClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={() => onDateClick?.(day.date)}
                      >
                        <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                        <TableCell>
                          {day.firstClockIn ? formatTime(day.firstClockIn) : '-'}
                        </TableCell>
                        <TableCell>
                          {day.lastClockOut ? formatTime(day.lastClockOut) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatWorkedTime(day.workedSeconds)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
