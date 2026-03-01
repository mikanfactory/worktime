import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from './ui/button'

interface AttendancePanelProps {
    onLogAttendance: (type: string, note?: string) => Promise<void>
    isLoading: boolean
}

export function AttendancePanel({ onLogAttendance, isLoading }: AttendancePanelProps) {
    const [isRunning, setIsRunning] = useState(false)
    const [accumulatedSeconds, setAccumulatedSeconds] = useState(0)
    const [lastStartTime, setLastStartTime] = useState<Date | null>(null)
    const [displayTime, setDisplayTime] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const loadStatus = useCallback(async () => {
        const result = await window.api.getTodayClockStatus()
        if (result.success && result.status) {
            const { isRunning: running, accumulatedSeconds: accumulated, lastTimestamp } = result.status
            setIsRunning(running)
            setAccumulatedSeconds(accumulated)

            if (running && lastTimestamp) {
                const start = new Date(lastTimestamp)
                setLastStartTime(start)
                // Calculate display time immediately
                const currentElapsed = Math.floor((Date.now() - start.getTime()) / 1000)
                setDisplayTime(accumulated + currentElapsed)
            } else {
                setLastStartTime(null)
                setDisplayTime(accumulated)
            }
        }
    }, [])

    // Load status on mount
    useEffect(() => {
        loadStatus()
    }, [loadStatus])

    // Timer effect
    useEffect(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        if (isRunning && lastStartTime) {
            timerRef.current = setInterval(() => {
                const currentElapsed = Math.floor((Date.now() - lastStartTime.getTime()) / 1000)
                setDisplayTime(accumulatedSeconds + currentElapsed)
            }, 1000)
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [isRunning, lastStartTime, accumulatedSeconds])

    const handleClockInOut = async () => {
        await onLogAttendance('打刻')
        await loadStatus()
    }

    const formatElapsedTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen bg-white">
            <div className="text-center space-y-12">
                <div className="text-8xl font-bold text-navy-900" style={{ color: '#1a1a4d' }}>
                    {formatElapsedTime(displayTime)}
                </div>
                <Button
                    size="lg"
                    className="h-20 px-16 text-2xl rounded-3xl"
                    style={{
                        backgroundColor: isRunning ? '#e57373' : '#90c695',
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: '500'
                    }}
                    onClick={handleClockInOut}
                    disabled={isLoading}
                >
                    打刻
                </Button>
            </div>
        </div>
    )
}
