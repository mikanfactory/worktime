import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      logAttendance: (
        type: string,
        note?: string
      ) => Promise<{ success: boolean; id?: number; error?: string }>
      getAttendanceLogs: (
        limit?: number,
        offset?: number
      ) => Promise<{
        success: boolean
        logs?: Array<{
          id: number
          type: string
          timestamp: string
          note?: string
          created_at: string
        }>
        error?: string
      }>
      getTodayFirstClockIn: () => Promise<{
        success: boolean
        timestamp?: string
        error?: string
      }>
    }
  }
}
