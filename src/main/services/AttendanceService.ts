import { databaseService, AttendanceLog } from '../database/DatabaseService'

export class AttendanceService {
    async logAttendance(type: string, note?: string): Promise<{ success: boolean; id?: number; error?: string }> {
        try {
            const timestamp = new Date().toISOString()
            const id = await databaseService.saveAttendanceLog(type, timestamp, note)
            return { success: true, id }
        } catch (error) {
            console.error('Error logging attendance:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getLogs(limit = 100, offset = 0): Promise<{ success: boolean; logs?: AttendanceLog[]; error?: string }> {
        try {
            const logs = await databaseService.getAttendanceLogs(limit, offset)
            return { success: true, logs }
        } catch (error) {
            console.error('Error getting attendance logs:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getTodayFirstClockIn(): Promise<{ success: boolean; timestamp?: string; error?: string }> {
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const logs = await databaseService.getAttendanceLogs(1000, 0)
            const todayLogs = logs.filter(log => {
                const logDate = new Date(log.timestamp)
                return logDate >= today
            })

            if (todayLogs.length > 0) {
                // Return the first log's timestamp
                return { success: true, timestamp: todayLogs[0].timestamp }
            }

            return { success: true, timestamp: undefined }
        } catch (error) {
            console.error('Error getting today\'s first clock-in:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async getTodayClockStatus(): Promise<{
        success: boolean
        status?: { isRunning: boolean; accumulatedSeconds: number; lastTimestamp: string | null }
        error?: string
    }> {
        try {
            const logs = await databaseService.getTodayAttendanceLogs()

            let accumulatedSeconds = 0

            // Calculate accumulated time from completed pairs (1-2, 3-4, ...)
            for (let i = 0; i + 1 < logs.length; i += 2) {
                const start = new Date(logs[i].timestamp).getTime()
                const end = new Date(logs[i + 1].timestamp).getTime()
                accumulatedSeconds += (end - start) / 1000
            }

            const isRunning = logs.length % 2 === 1
            const lastTimestamp = logs.length > 0 ? logs[logs.length - 1].timestamp : null

            return {
                success: true,
                status: {
                    isRunning,
                    accumulatedSeconds: Math.floor(accumulatedSeconds),
                    lastTimestamp
                }
            }
        } catch (error) {
            console.error('Error getting today clock status:', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }
}
