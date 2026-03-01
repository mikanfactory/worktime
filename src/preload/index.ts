import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AttendanceLogRequest,
  GetAttendanceLogsRequest,
  GetTodaySummaryRequest
} from '../shared/attendance'

// Custom APIs for renderer
const api = {
  logAttendance: (request: AttendanceLogRequest) => ipcRenderer.invoke('attendance:log', request),
  getAttendanceLogs: (request?: GetAttendanceLogsRequest) =>
    ipcRenderer.invoke('attendance:getLogs', request),
  getTodaySummary: (request?: GetTodaySummaryRequest) =>
    ipcRenderer.invoke('attendance:getTodaySummary', request)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
