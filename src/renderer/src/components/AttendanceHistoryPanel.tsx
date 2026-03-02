import { useState } from 'react'
import type {
  AttendanceEventType,
  AttendanceLog,
  UpdateAttendanceLogRequest
} from '../../../shared/attendance'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Button } from './ui/button'
import { EditLogDialog } from './EditLogDialog'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

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
}

export function AttendanceHistoryPanel({
  logs,
  isLoading,
  onUpdateLog,
  onDeleteLog,
  onLogAttendance,
  onRefreshLogs
}: AttendanceHistoryPanelProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AttendanceLog | null>(null)

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
        await onRefreshLogs()
      }
      return success
    }

    const success = await onLogAttendance(data.eventType, data.timestamp, data.note)
    return success
  }

  const handleDelete = async (id: number) => {
    const success = await onDeleteLog(id)
    if (success) {
      await onRefreshLogs()
    }
    return success
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance History</CardTitle>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              手動追加
            </Button>
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
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground h-24"
                      >
                        No attendance logs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">
                          {formatEventType(log.eventType)}
                        </TableCell>
                        <TableCell>{log.note || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(log)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
    case 'clock_out':
      return '退勤'
    case 'break_start':
      return '休憩開始'
    case 'break_end':
      return '休憩終了'
    case 'clock_in':
    default:
      return '打刻'
  }
}
