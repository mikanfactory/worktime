import { ipcMain } from 'electron'
import { AttendanceService } from './AttendanceService'

export class IpcHandlerService {
  constructor(private attendanceService: AttendanceService) { }

  registerHandlers(): void {
    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    // Attendance handlers
    ipcMain.handle('attendance:log', async (_, type, note) => {
      return await this.attendanceService.logAttendance(type, note)
    })

    ipcMain.handle('attendance:getLogs', async (_, limit, offset) => {
      return await this.attendanceService.getLogs(limit, offset)
    })

    ipcMain.handle('attendance:getTodayFirstClockIn', async () => {
      return await this.attendanceService.getTodayFirstClockIn()
    })
  }
}
