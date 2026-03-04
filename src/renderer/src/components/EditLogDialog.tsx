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
import type { DailySummary, UpdateWorkSessionRequest } from '../../../shared/attendance'

interface EditSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: DailySummary | null
  onSave: (data: UpdateWorkSessionRequest) => Promise<boolean>
  onDelete?: (id: number) => Promise<boolean>
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

export function EditSessionDialog({
  open,
  onOpenChange,
  summary,
  onSave,
  onDelete
}: EditSessionDialogProps) {
  const [clockInAt, setClockInAt] = useState('')
  const [clockOutAt, setClockOutAt] = useState('')
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && summary) {
      setClockInAt(summary.firstClockIn ? toLocalDateTimeValue(summary.firstClockIn) : '')
      setClockOutAt(summary.lastClockOut ? toLocalDateTimeValue(summary.lastClockOut) : '')
      setNote('')
    }
  }, [open, summary])

  const handleSave = async () => {
    if (!summary) return
    setIsSaving(true)
    try {
      // Note: This simplified edit only works for single-session days
      // For multi-session days, a more sophisticated editor would be needed
      const data: UpdateWorkSessionRequest = {
        id: 0, // Will need session ID from a more detailed query
        clockInAt: clockInAt ? fromLocalDateTimeValue(clockInAt) : undefined,
        clockOutAt: clockOutAt ? fromLocalDateTimeValue(clockOutAt) : undefined,
        note: note.trim() || undefined
      }
      const success = await onSave(data)
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!summary || !onDelete) return
    setIsSaving(true)
    try {
      // Similar limitation as handleSave regarding session ID
      const success = await onDelete(0)
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
          <DialogTitle>セッションを編集</DialogTitle>
          <DialogDescription>
            勤務記録を修正します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>日付</Label>
            <div className="text-sm text-foreground">{summary?.date ?? '-'}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clockInAt">出勤時刻</Label>
            <Input
              id="clockInAt"
              type="datetime-local"
              value={clockInAt}
              onChange={(e) => setClockInAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clockOutAt">退勤時刻</Label>
            <Input
              id="clockOutAt"
              type="datetime-local"
              value={clockOutAt}
              onChange={(e) => setClockOutAt(e.target.value)}
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
              {onDelete && (
                <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
                  削除
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !clockInAt}>
                保存
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
