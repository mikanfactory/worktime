import { useState, useEffect } from 'react'
import { Button } from './ui/button'

interface AttendancePanelProps {
    onLogAttendance: (type: string, note?: string) => Promise<void>
    isLoading: boolean
}

export function AttendancePanel({ onLogAttendance, isLoading }: AttendancePanelProps) {
    const [elapsedTime, setElapsedTime] = useState(0)
    const [firstClockInTime, setFirstClockInTime] = useState<Date | null>(null)
    const [hasClocked, setHasClocked] = useState(false)

    useEffect(() => {
        // Load today's first clock-in time
        const loadFirstClockIn = async () => {
            const result = await window.api.getTodayFirstClockIn()
            if (result.success && result.timestamp) {
                setFirstClockInTime(new Date(result.timestamp))
                setHasClocked(true)
            }
        }
        loadFirstClockIn()
    }, [])

    useEffect(() => {
        const timer = setInterval(() => {
            if (firstClockInTime) {
                const now = new Date()
                const diff = Math.floor((now.getTime() - firstClockInTime.getTime()) / 1000)
                setElapsedTime(diff)
            }
        }, 1000)

        return () => clearInterval(timer)
    }, [firstClockInTime])

    const handleClockInOut = async () => {
        await onLogAttendance('打刻')

        // If this is the first clock-in of the day, set the start time
        if (!firstClockInTime) {
            const now = new Date()
            setFirstClockInTime(now)
        }
        setHasClocked(true)
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
                    {formatElapsedTime(elapsedTime)}
                </div>
                <Button
                    size="lg"
                    className="h-20 px-16 text-2xl rounded-3xl"
                    style={{
                        backgroundColor: hasClocked ? '#e57373' : '#90c695',
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
