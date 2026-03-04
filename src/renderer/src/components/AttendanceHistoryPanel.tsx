import { useCallback, useEffect, useState } from 'react'
import type {
  AttendanceEventType,
  AttendanceLog,
  GetAttendanceLogsRequest,
  UpdateAttendanceLogRequest
} from '../../../shared/attendance'
import { ScrollArea } from './ui/scroll-area'
import { Button } from './ui/button'
import { EditLogDialog } from './EditLogDialog'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'

interface AttendanceHistoryPanelProps {
  logs: AttendanceLog[]
  isLoading: boolean
  onUpdateLog: (request: UpdateAttendanceLogRequest) => Promise<boolean>
  onDeleteLog: (id: number) => Promise<boolean>
  onLogAttendance: (
    eventType: AttendanceEventType,
    timestamp: string,
    note?: string
  ) => Promise<boolean>
  onRefreshLogs: () => Promise<void>
  onLoadLogs?: (request: GetAttendanceLogsRequest) => Promise<void>
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

function getMonthRange(yearMonth: string): { from: string; to: string } {
  const [year, month] = yearMonth.split('-').map(Number)
  const from = new Date(year, month - 1, 1).toISOString()
  const to = new Date(year, month, 0, 23, 59, 59, 999).toISOString()
  return { from, to }
}

export function AttendanceHistoryPanel({
  logs,
  isLoading,
  onUpdateLog,
  onDeleteLog,
  onLogAttendance,
  onRefreshLogs,
  onLoadLogs
}: AttendanceHistoryPanelProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)

  const loadLogsForMonth = useCallback(
    (ym: string) => {
      if (onLoadLogs) {
        const { from, to } = getMonthRange(ym)
        void onLoadLogs({ from, to, limit: 200 })
      } else {
        void onRefreshLogs()
      }
    },
    [onLoadLogs, onRefreshLogs]
  )

  useEffect(() => {
    loadLogsForMonth(yearMonth)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = useCallback(
    (delta: number) => {
      setYearMonth((prev) => {
        const next = shiftMonth(prev, delta)
        loadLogsForMonth(next)
        return next
      })
    },
    [loadLogsForMonth]
  )

  const handleEdit = (log: AttendanceLog) => {
    setSelectedLog(log)
    setEditDialogOpen(true)
  }

  const handleAdd = () => {
    setSelectedLog(null)
    setEditDialogOpen(true)
  }

  const handleSave = async (data: {
    id?: number
    eventType: AttendanceEventType
    timestamp: string
    note?: string
  }) => {
    if (data.id) {
      const success = await onUpdateLog({
        id: data.id,
        eventType: data.eventType,
        timestamp: data.timestamp,
        note: data.note
      })
      if (success) {
        loadLogsForMonth(yearMonth)
      }
      return success
    }

    const success = await onLogAttendance(data.eventType, data.timestamp, data.note)
    if (success) {
      loadLogsForMonth(yearMonth)
    }
    return success
  }

  const handleDelete = async (id: number) => {
    const success = await onDeleteLog(id)
    if (success) {
      loadLogsForMonth(yearMonth)
    }
    return success
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Attendance History</h2>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

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
                    Time
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Type
                  </th>
                  <th className="text-left text-sm font-semibold text-muted-foreground px-4 h-12">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-center text-muted-foreground h-24 px-4"
                    >
                      No attendance logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleEdit(log)}
                    >
                      <td className="text-sm text-foreground px-4 h-12">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="text-sm font-medium text-foreground px-4 h-12">
                        {formatEventType(log.eventType)}
                      </td>
                      <td className="text-sm text-muted-foreground px-4 h-12">
                        {log.note || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </div>

      <EditLogDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        log={selectedLog}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}

function formatEventType(eventType: AttendanceEventType): string {
  switch (eventType) {
    case 'clock_in':
      return 'Clock In'
    case 'clock_out':
      return 'Clock Out'
    case 'break_start':
      return 'Break Start'
    case 'break_end':
      return 'Break End'
    default:
      return eventType
  }
}
