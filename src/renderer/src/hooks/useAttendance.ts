import { useCallback, useState } from 'react'
import type {
  WorkSession,
  BreakSession,
  AttendanceSummary,
  DailySummary,
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  MonthlySummary,
  Result,
  UpdateWorkSessionRequest
} from '../../../shared/attendance'

type AttendanceStatus = 'idle' | 'loading' | 'success' | 'error'

type AttendanceApi = {
  clockIn: (note?: string) => Promise<Result<WorkSession>>
  clockOut: () => Promise<Result<WorkSession>>
  startBreak: (note?: string) => Promise<Result<BreakSession>>
  endBreak: () => Promise<Result<BreakSession>>
  getTodaySummary: (request?: GetTodaySummaryRequest) => Promise<Result<AttendanceSummary>>
  updateWorkSession: (request: UpdateWorkSessionRequest) => Promise<Result<WorkSession>>
  deleteWorkSession: (request: DeleteWorkSessionRequest) => Promise<Result<void>>
  getDailySummaries: (request: GetDailySummariesRequest) => Promise<Result<DailySummary[]>>
  getMonthlySummary: (request: GetMonthlySummaryRequest) => Promise<Result<MonthlySummary>>
}

interface UseAttendanceResult {
  summary: AttendanceSummary
  dailySummaries: DailySummary[]
  monthlySummary: MonthlySummary | null
  status: AttendanceStatus
  isLoading: boolean
  isLoggingAttendance: boolean
  error: string | null
  loadTodaySummary: () => Promise<void>
  clockIn: (note?: string) => Promise<boolean>
  clockOut: () => Promise<boolean>
  startBreak: (note?: string) => Promise<boolean>
  endBreak: () => Promise<boolean>
  loadDailySummaries: (yearMonth: string) => Promise<void>
  loadMonthlySummary: (yearMonth: string) => Promise<void>
  updateWorkSession: (request: UpdateWorkSessionRequest) => Promise<boolean>
  deleteWorkSession: (id: number) => Promise<boolean>
}

function getAttendanceApi(): AttendanceApi | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  if (window.api) {
    return window.api as AttendanceApi
  }

  const invoke = window.electron?.ipcRenderer?.invoke
  if (!invoke) {
    return undefined
  }

  return {
    clockIn: (note?: string) => invoke('attendance:clockIn', note ? { note } : undefined),
    clockOut: () => invoke('attendance:clockOut'),
    startBreak: (note?: string) =>
      invoke('attendance:startBreak', note ? { note } : undefined),
    endBreak: () => invoke('attendance:endBreak'),
    getTodaySummary: (request?: GetTodaySummaryRequest) =>
      invoke('attendance:getTodaySummary', request),
    updateWorkSession: (request: UpdateWorkSessionRequest) =>
      invoke('attendance:updateWorkSession', request),
    deleteWorkSession: (request: DeleteWorkSessionRequest) =>
      invoke('attendance:deleteWorkSession', request),
    getDailySummaries: (request: GetDailySummariesRequest) =>
      invoke('attendance:getDailySummaries', request),
    getMonthlySummary: (request: GetMonthlySummaryRequest) =>
      invoke('attendance:getMonthlySummary', request)
  }
}

export function useAttendance(): UseAttendanceResult {
  const [summary, setSummary] = useState<AttendanceSummary>({
    workedSeconds: 0,
    breakSeconds: 0,
    isWorking: false,
    isOnBreak: false
  })
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([])
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [isLoggingAttendance, setIsLoggingAttendance] = useState(false)
  const [status, setStatus] = useState<AttendanceStatus>('idle')
  const [error, setError] = useState<string | null>(null)

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

  const clockIn = useCallback(async (note?: string) => {
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
      const result = await attendanceApi.clockIn(note)
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

  const clockOut = useCallback(async () => {
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
      const result = await attendanceApi.clockOut()
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

  const startBreak = useCallback(async (note?: string) => {
    setIsLoggingAttendance(true)
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      setIsLoggingAttendance(false)
      return false
    }

    try {
      const result = await attendanceApi.startBreak(note)
      if (result.ok) {
        return true
      }

      setError(result.message)
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    } finally {
      setIsLoggingAttendance(false)
    }
  }, [])

  const endBreak = useCallback(async () => {
    setIsLoggingAttendance(true)
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      setIsLoggingAttendance(false)
      return false
    }

    try {
      const result = await attendanceApi.endBreak()
      if (result.ok) {
        return true
      }

      setError(result.message)
      return false
    } catch (err) {
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

  const updateWorkSession = useCallback(async (request: UpdateWorkSessionRequest) => {
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      return false
    }

    try {
      const result = await attendanceApi.updateWorkSession(request)
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

  const deleteWorkSession = useCallback(async (id: number) => {
    setError(null)

    const attendanceApi = getAttendanceApi()
    if (!attendanceApi) {
      setError('IPC bridge is not available')
      return false
    }

    try {
      const result = await attendanceApi.deleteWorkSession({ id })
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

  return {
    summary,
    dailySummaries,
    monthlySummary,
    status,
    isLoading: status === 'loading',
    isLoggingAttendance,
    error,
    loadTodaySummary,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    loadDailySummaries,
    loadMonthlySummary,
    updateWorkSession,
    deleteWorkSession
  }
}
