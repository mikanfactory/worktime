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
import type { CreateManualWorkSessionRequest } from '../../../shared/attendance'

interface AddSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onSave: (data: CreateManualWorkSessionRequest) => Promise<boolean>
}

function toDefaultClockIn(date: string): string {
  return `${date}T09:00`
}

function toDefaultClockOut(date: string): string {
  return `${date}T18:00`
}

function fromLocalDateTimeValue(localValue: string): string {
  return new Date(localValue).toISOString()
}

export function AddSessionDialog({ open, onOpenChange, date, onSave }: AddSessionDialogProps) {
  const [clockInValue, setClockInValue] = useState('')
  const [clockOutValue, setClockOutValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setClockInValue(toDefaultClockIn(date))
      setClockOutValue(toDefaultClockOut(date))
    }
  }, [open, date])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data: CreateManualWorkSessionRequest = {
        date,
        clockInAt: fromLocalDateTimeValue(clockInValue),
        clockOutAt: fromLocalDateTimeValue(clockOutValue)
      }
      const success = await onSave(data)
      if (success) {
        onOpenChange(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = clockInValue && clockOutValue && clockOutValue > clockInValue

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>勤務記録を追加</DialogTitle>
          <DialogDescription>{date} の勤務記録を手動で作成します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addClockIn">Clock In</Label>
            <Input
              id="addClockIn"
              type="datetime-local"
              value={clockInValue}
              onChange={(e) => setClockInValue(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addClockOut">Clock Out</Label>
            <Input
              id="addClockOut"
              type="datetime-local"
              value={clockOutValue}
              onChange={(e) => setClockOutValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isValid}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
