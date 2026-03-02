import { useCallback, useRef, useState } from 'react'
import type {
  AttendanceLog,
  AttendanceLogRequest,
  AttendanceLogsPage,
  AttendanceEventType,
  AttendanceSummary,
  DailySummary,
  DeleteAttendanceLogRequest,
  GetAttendanceLogsRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  MonthlySummary,
  Result,
  UpdateAttendanceLogRequest
} from '../../../shared/attendance'

type AttendanceStatus = 'idle' | 'loading' | 'success' | 'error'

type AttendanceApi = {
  logAttendance: (request: AttendanceLogRequest) => Promise<Result<{ id: number }>>
  getAttendanceLogs: (request?: GetAttendanceLogsRequest) => Promise<Result<AttendanceLogsPage>>
  getTodaySummary: (request?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>
  updateAttendanceLog: (request: UpdateAttendanceLogRequest) => Promise<Result<AttendanceLog>>
  deleteAttendanceLog: (request: DeleteAttendanceLogRequest) => Promise<Result<void>>
  getDailySummaries: (request: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>
  getMonthlySummary: (request: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>
}

interface UseAttendanceResult {
  logs: AttendanceLog[]
  summary: AttendanceSummary
  dailySummaries: DailySummary[]
  monthlySummary: MonthlySummary | null
  nextCursor: string | undefined
  hasMoreLogs: boolean
  status: AttendanceStatus
  isLoading: boolean
  isLoggingAttendance: boolean
  isLogsLoading: boolean
  isLoadingMore: boolean
  error: string | null
  loadLogs: (request?: GetAttendanceLogsRequest) => Promise<void>
  loadMoreLogs: () => Promise<void>
  loadTodaySummary: () => Promise<void>
  logAttendance: (eventType: AttendanceEventType, note?: string) => Promise<boolean>
  loadDailySummaries: (yearMonth: string) => Promise<void>
  loadMonthlySummary: (yearMonth: string) => Promise<void>
  updateLog: (request: UpdateAttendanceLogRequest) => Promise<boolean>
  deleteLog: (id: number) => Promise<boolean>
}

function getAttendanceApi(): AttendanceApi | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (window.api) {
    return window.api
  }

  const invoke = window.electron?.ipcRenderer?.invoke
  if (!invoke) {
    return undefined
  }

  return {
    logAttendance: (request: AttendanceLogRequest) =>
      invoke('attendance:log', request),
    getAttendanceLogs: (request?: GetAttendanceLogsRequest) =>
      invoke('attendance:getLogs', request),
    getTodaySummary: (request?: GetTodaySummaryRequest) =>
      invoke('attendance:getTodaySummary', request),
    updateAttendanceLog: (request: UpdateAttendanceLogRequest) =>
      invoke('attendance:updateLog', request),
    deleteAttendanceLog: (request: DeleteAttendanceLogRequest) =>
      invoke('attendance:deleteLog', request),
    getDailySummaries: (request: GetDailySummariesRequest) =>
      invoke('attendance:getDailySummaries', request),
    getMonthlySummary: (request: GetMonthlySummaryRequest) =>
      invoke('attendance:getMonthlySummary', request)
  }
}

export function useAttendance(): UseAttendanceResult {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [summary, setSummary] = useState<AttendanceSummary>({
    workedSeconds: 0,
    isWorking: false
  })
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoggingAttendance, setIsLoggingAttendance] = useState(false)
  const [status, setStatus] = useState<AttendanceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const lastLogsRequestRef = useRef<GetAttendanceLogsRequest>({})

  const loadLogs = useCallback(async (request: GetAttendanceLogsRequest = {}) => {
    setIsLogsLoading(true)
    setStatus('loading')
    setError(null)
    lastLogsRequestRef.current = request

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      setIsLogsLoading(false)
      return
    }

    try {
      const result = await attendanceApi.getAttendanceLogs(request)
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
    } finally {
      setIsLogsLoading(false)
    }
  }, [])

  const loadMoreLogs = useCallback(async () => {
    if (!nextCursor) return

    setIsLoadingMore(true)
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      setIsLoadingMore(false)
      return
    }

    const request: GetAttendanceLogsRequest = {
      ...lastLogsRequestRef.current,
      cursor: nextCursor
    }

    try {
      const result = await attendanceApi.getAttendanceLogs(request)
      if (result.ok) {
        setLogs((prevLogs) => {
          const existingIds = new Set(prevLogs.map((log) => log.id))
          const appendedLogs = result.data.logs.filter((log) => !existingIds.has(log.id))
          return [...prevLogs, ...appendedLogs]
        })
        setNextCursor(result.data.nextCursor)
        setStatus('success')
        return
      }

      setStatus('error')
      setError(result.message)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursor])

  const loadTodaySummary = useCallback(async () => {
    setStatus('loading')
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      return
    }

    try {
      const result = await attendanceApi.getTodaySummary()
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
    setIsLoggingAttendance(true)
    setStatus('loading')
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      setIsLoggingAttendance(false)
      return false
    }

    try {
      const result = await attendanceApi.logAttendance({
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
    } finally {
      setIsLoggingAttendance(false)
    }
  }, [])

  const loadDailySummaries = useCallback(async (yearMonth: string) => {
    setStatus('loading')
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      return
    }

    try {
      const result = await attendanceApi.getDailySummaries({ yearMonth })
      if (result.ok) {
        setDailySummaries(result.data)
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

  const loadMonthlySummary = useCallback(async (yearMonth: string) => {
    setStatus('loading')
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setStatus('error')
      setError('IPC bridge is not available')
      return
    }

    try {
      const result = await attendanceApi.getMonthlySummary({ yearMonth })
      if (result.ok) {
        setMonthlySummary(result.data)
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

  const updateLog = useCallback(async (request: UpdateAttendanceLogRequest) => {
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      return false
    }

    try {
      const result = await attendanceApi.updateAttendanceLog(request)
      if (result.ok) {
        return true
      }

      setError(result.message)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [])

  const deleteLog = useCallback(async (id: number) => {
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      return false
    }

    try {
      const result = await attendanceApi.deleteAttendanceLog({ id })
      if (result.ok) {
        setLogs((prevLogs) => prevLogs.filter((log) => log.id !== id))
        return true
      }

      setError(result.message)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [])

  return {
    logs,
    summary,
    dailySummaries,
    monthlySummary,
    nextCursor,
    hasMoreLogs: Boolean(nextCursor),
    status,
    isLoading: status === 'loading' || isLogsLoading || isLoadingMore,
    isLoggingAttendance,
    isLogsLoading,
    isLoadingMore,
    error,
    loadLogs,
    loadMoreLogs,
    loadTodaySummary,
    logAttendance,
    loadDailySummaries,
    loadMonthlySummary,
    updateLog,
    deleteLog
  }
}
