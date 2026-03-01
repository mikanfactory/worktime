import { useCallback, useState } from 'react'
import type {
  AttendanceEventType,
  AttendanceLog,
  AttendanceSummary,
  GetAttendanceLogsRequest
} from '../../../shared/attendance'

type AttendanceStatus = 'idle' | 'loading' | 'success' | 'error'

export function useAttendance() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>({
    workedSeconds: 0
  })
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<AttendanceStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const loadLogs = useCallback(async (request: GetAttendanceLogsRequest = {}) => {
    setStatus('loading')
    setError(null)

    try {
      const result = await window.api.getAttendanceLogs(request)
      if (result.ok) {
        setLogs(result.data.logs)
        setNextCursor(result.data.nextCursor)
        setStatus('success')
        return
      }

      setStatus('error')
      setError(result.message)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const loadTodaySummary = useCallback(async () => {
    setStatus('loading')
    setError(null)

    try {
      const result = await window.api.getTodaySummary()
      if (result.ok) {
        setSummary(result.data)
        setStatus('success')
        return
      }

      setStatus('error')
      setError(result.message)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  const logAttendance = useCallback(async (eventType: AttendanceEventType, note?: string) => {
    setStatus('loading')
    setError(null)

    try {
      const result = await window.api.logAttendance({
        eventType,
        note
      })
      if (result.ok) {
        setStatus('success')
        return true
      }

      setStatus('error')
      setError(result.message)
      return false
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [])

  return {
    logs,
    summary,
    nextCursor,
    status,
    isLoading: status === 'loading',
    error,
    loadLogs,
    loadTodaySummary,
    logAttendance
  }
}
