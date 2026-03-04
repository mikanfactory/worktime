import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus } from 'lucide-react'
import { EditTimeDialog } from './EditTimeDialog'
import { AddSessionDialog } from './AddSessionDialog'
import type {
  CreateManualWorkSessionRequest,
  DailySummary,
  UpdateWorkSessionRequest
} from '../../../shared/attendance'

interface EditTarget {
  sessionId: number
  fieldLabel: string
  fieldName: 'clockInAt' | 'clockOutAt'
  currentValue: string
  date: string
}

interface DailySummaryPanelProps {
  dailySummaries: DailySummary[]
  isLoading: boolean
  onLoadSummaries: (yearMonth: string) => Promise<void>
  onDateClick?: (date: string) => void
  onUpdateWorkSession?: (request: UpdateWorkSessionRequest) => Promise<boolean>
  onCreateWorkSession?: (request: CreateManualWorkSessionRequest) => Promise<boolean>
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

function getTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function generateAllDays(yearMonth: string, dailySummaries: DailySummary[]): DailySummary[] {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const dataMap = new Map<string, DailySummary>()
  for (const summary of dailySummaries) {
    dataMap.set(summary.date, summary)
  }

  const allDays: DailySummary[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`
    const existing = dataMap.get(dateStr)
    if (existing) {
      allDays.push(existing)
    } else {
      allDays.push({
        date: dateStr,
        workedSeconds: 0,
        breakSeconds: 0,
        sessionCount: 0
      })
    }
  }

  return allDays
}

export function DailySummaryPanel({
  dailySummaries,
  isLoading,
  onLoadSummaries,
  onDateClick,
  onUpdateWorkSession,
  onCreateWorkSession
}: DailySummaryPanelProps) {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogDate, setAddDialogDate] = useState('')

  const allDays = useMemo(
    () => generateAllDays(yearMonth, dailySummaries),
    [yearMonth, dailySummaries]
  )

  const todayStr = getTodayDateString()

  const handleEditSave = useCallback(
    async (data: UpdateWorkSessionRequest) => {
      if (!onUpdateWorkSession) return false
      const success = await onUpdateWorkSession(data)
      if (success) {
        void onLoadSummaries(yearMonth)
      }
      return success
    },
    [onUpdateWorkSession, onLoadSummaries, yearMonth]
  )

  const handleCreateSave = useCallback(
    async (data: CreateManualWorkSessionRequest) => {
      if (!onCreateWorkSession) return false
      const success = await onCreateWorkSession(data)
      if (success) {
        void onLoadSummaries(yearMonth)
      }
      return success
    },
    [onCreateWorkSession, onLoadSummaries, yearMonth]
  )

  const openEditDialog = useCallback((target: EditTarget) => {
    setEditTarget(target)
    setEditDialogOpen(true)
  }, [])

  const openAddDialog = useCallback((date: string) => {
    setAddDialogDate(date)
    setAddDialogOpen(true)
  }, [])

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
                {allDays.map((day) => {
                  const holiday = isHoliday(day.date)
                  const hasWork = day.workedSeconds > 0
                  const isEmpty = day.sessionCount === 0
                  const isPast = day.date < todayStr
                  const showAddButton = onCreateWorkSession && isEmpty && isPast
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
                        <div className="flex items-center gap-1.5">
                          <span>{formatDate(day.date)}</span>
                          {showAddButton && (
                            <button
                              aria-label="add session"
                              onClick={(e) => {
                                e.stopPropagation()
                                openAddDialog(day.date)
                              }}
                              className="p-0.5 rounded hover:bg-muted/60 transition-colors"
                            >
                              <Plus
                                className={`h-3.5 w-3.5 ${
                                  holiday ? 'text-[#A3A3A3]' : 'text-muted-foreground'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                      <td
                        className={`text-sm px-4 h-11 ${
                          holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{day.firstClockIn ? formatTime(day.firstClockIn) : '-'}</span>
                          {onUpdateWorkSession &&
                            day.firstClockIn &&
                            day.firstSessionId != null && (
                              <button
                                aria-label="edit clock in"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDialog({
                                    sessionId: day.firstSessionId!,
                                    fieldLabel: 'Clock In',
                                    fieldName: 'clockInAt',
                                    currentValue: day.firstClockIn!,
                                    date: day.date
                                  })
                                }}
                                className="p-0.5 rounded hover:bg-muted/60 transition-colors"
                              >
                                <Pencil
                                  className={`h-3.5 w-3.5 ${
                                    holiday && !hasWork
                                      ? 'text-[#A3A3A3]'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </button>
                            )}
                        </div>
                      </td>
                      <td
                        className={`text-sm px-4 h-11 ${
                          holiday && !hasWork ? 'text-[#A3A3A3]' : 'text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{day.lastClockOut ? formatTime(day.lastClockOut) : '-'}</span>
                          {onUpdateWorkSession &&
                            day.lastClockOut &&
                            day.lastSessionId != null && (
                              <button
                                aria-label="edit clock out"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditDialog({
                                    sessionId: day.lastSessionId!,
                                    fieldLabel: 'Clock Out',
                                    fieldName: 'clockOutAt',
                                    currentValue: day.lastClockOut!,
                                    date: day.date
                                  })
                                }}
                                className="p-0.5 rounded hover:bg-muted/60 transition-colors"
                              >
                                <Pencil
                                  className={`h-3.5 w-3.5 ${
                                    holiday && !hasWork
                                      ? 'text-[#A3A3A3]'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </button>
                            )}
                        </div>
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
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>

      {editTarget && (
        <EditTimeDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          sessionId={editTarget.sessionId}
          fieldLabel={editTarget.fieldLabel}
          fieldName={editTarget.fieldName}
          currentValue={editTarget.currentValue}
          date={editTarget.date}
          onSave={handleEditSave}
        />
      )}

      <AddSessionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        date={addDialogDate}
        onSave={handleCreateSave}
      />
    </div>
  )
}
