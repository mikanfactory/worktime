import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import type { AttendanceEventType, AttendanceLog } from '../../../shared/attendance'

interface EditLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: AttendanceLog | null // null = add mode
  onSave: (data: {
    id?: number
    eventType: AttendanceEventType
    timestamp: string
    note?: string
  }) => Promise<boolean>
  onDelete?: (id: number) => Promise<boolean>
}

const EVENT_TYPE_LABELS: Record<AttendanceEventType, string> = {
  clock_in: '出勤',
  clock_out: '退勤',
  break_start: '休憩開始',
  break_end: '休憩終了'
}

function toLocalDateTimeValue(isoString: string): string {
  const date = new Date(isoString)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function fromLocalDateTimeValue(localValue: string): string {
  return new Date(localValue).toISOString()
}

export function EditLogDialog({ open, onOpenChange, log, onSave, onDelete }: EditLogDialogProps) {
  const isEditMode = log !== null

  const [eventType, setEventType] = useState<AttendanceEventType>('clock_in')
  const [timestamp, setTimestamp] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (log) {
        setEventType(log.eventType)
        setTimestamp(toLocalDateTimeValue(log.timestamp))
        setNote(log.note ?? '')
      } else {
        setEventType('clock_in')
        setTimestamp(toLocalDateTimeValue(new Date().toISOString()))
        setNote('')
      }
    }
  }, [open, log])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const success = await onSave({
        id: log?.id,
        eventType,
        timestamp: fromLocalDateTimeValue(timestamp),
        note: note.trim() || undefined
      })
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!log || !onDelete) return
    setIsSaving(true)
    try {
      const success = await onDelete(log.id)
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'ログを編集' : 'ログを追加'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? '打刻記録を修正します。' : '過去の打刻記録を追加します。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">種別</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as AttendanceEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_TYPE_LABELS) as AttendanceEventType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {EVENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timestamp">日時</Label>
            <Input
              id="timestamp"
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">メモ</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="任意のメモ"
              maxLength={1000}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full justify-between">
            <div>
              {isEditMode && onDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                  削除
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !timestamp}>
                {isEditMode ? '保存' : '追加'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
