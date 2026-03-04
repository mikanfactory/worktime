import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from './ui/dialog'
import { Button } from './ui/button'

interface DeleteSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onConfirm: () => Promise<boolean>
}

function formatDateForDialog(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = weekdays[date.getDay()]
  return `${month}/${day} (${weekday})`
}

export function DeleteSessionDialog({
  open,
  onOpenChange,
  date,
  onConfirm
}: DeleteSessionDialogProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      const success = await onConfirm()
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
          <DialogTitle>出勤記録の削除</DialogTitle>
          <DialogDescription>
            {date
              ? `${formatDateForDialog(date)} の出勤記録を削除しますか？この操作は取り消せません。`
              : '出勤記録を削除しますか？'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isSaving}>
              削除
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
