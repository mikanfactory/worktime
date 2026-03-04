import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  DeleteWorkSessionRequest,
  GetDailySummariesRequest,
  GetMonthlySummaryRequest,
  GetTodaySummaryRequest,
  UpdateWorkSessionRequest
} from '../shared/attendance'

// Custom APIs for renderer
const api = {
  clockIn: (note?: string) => ipcRenderer.invoke('attendance:clockIn', note ? { note } : undefined),
  clockOut: () => ipcRenderer.invoke('attendance:clockOut'),
  startBreak: (note?: string) =>
    ipcRenderer.invoke('attendance:startBreak', note ? { note } : undefined),
  endBreak: () => ipcRenderer.invoke('attendance:endBreak'),
  getTodaySummary: (request?: GetTodaySummaryRequest) =>
    ipcRenderer.invoke('attendance:getTodaySummary', request),
  updateWorkSession: (request: UpdateWorkSessionRequest) =>
    ipcRenderer.invoke('attendance:updateWorkSession', request),
  deleteWorkSession: (request: DeleteWorkSessionRequest) =>
    ipcRenderer.invoke('attendance:deleteWorkSession', request),
  getDailySummaries: (request: GetDailySummariesRequest) =>
    ipcRenderer.invoke('attendance:getDailySummaries', request),
  getMonthlySummary: (request: GetMonthlySummaryRequest) =>
    ipcRenderer.invoke('attendance:getMonthlySummary', request)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error('Failed to expose `electron` API:', error)
  }

  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose `api` bridge:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
