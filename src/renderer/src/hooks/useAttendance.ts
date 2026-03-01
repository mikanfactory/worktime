import { useState, useCallback } from 'react'
import { AttendanceLog } from '../types'

export function useAttendance() {
    const [logs, setLogs] = useState<AttendanceLog[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadLogs = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await window.api.getAttendanceLogs()
            if (result.success && result.logs) {
                setLogs(result.logs)
            } else {
                setError(result.error || 'Failed to load logs')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const logAttendance = async (type: string, note?: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await window.api.logAttendance(type, note)
            if (!result.success) {
                setError(result.error || 'Failed to log attendance')
            } else {
                // Refresh logs if needed, or just let the user go to history tab
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }

    return {
        logs,
        isLoading,
        error,
        loadLogs,
        logAttendance
    }
}
