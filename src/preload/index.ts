import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  logAttendance: (type: string, note?: string) => ipcRenderer.invoke('attendance:log', type, note),
  getAttendanceLogs: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('attendance:getLogs', limit, offset),
  getTodayFirstClockIn: () => ipcRenderer.invoke('attendance:getTodayFirstClockIn')
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
