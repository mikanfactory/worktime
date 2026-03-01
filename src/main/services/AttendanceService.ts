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
}
