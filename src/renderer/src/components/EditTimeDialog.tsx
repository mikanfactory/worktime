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
import type { UpdateWorkSessionRequest } from '../../../shared/attendance'

interface EditTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: number
  fieldLabel: string
  fieldName: 'clockInAt' | 'clockOutAt'
  currentValue: string
  date: string
  onSave: (data: UpdateWorkSessionRequest) => Promise<boolean>
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

export function EditTimeDialog({
  open,
  onOpenChange,
  sessionId,
  fieldLabel,
  fieldName,
  currentValue,
  date,
  onSave
}: EditTimeDialogProps) {
  const [timeValue, setTimeValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && currentValue) {
      setTimeValue(toLocalDateTimeValue(currentValue))
    }
  }, [open, currentValue])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data: UpdateWorkSessionRequest = {
        id: sessionId,
        [fieldName]: fromLocalDateTimeValue(timeValue)
      }
      const success = await onSave(data)
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
          <DialogTitle>{fieldLabel}を編集</DialogTitle>
          <DialogDescription>勤務記録の時刻を修正します。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>日付</Label>
            <div className="text-sm text-foreground">{date}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeValue">時刻</Label>
            <Input
              id="timeValue"
              type="datetime-local"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !timeValue}>
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
