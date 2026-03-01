import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { initializeDatabase, databaseService } from './database/db'
import { AttendanceService } from './services/AttendanceService'
import { IpcHandlerService } from './services/IpcHandlerService'
import { WindowManagerService } from './services/WindowManagerService'

// Initialize services
const attendanceService = new AttendanceService()
const ipcHandlerService = new IpcHandlerService(attendanceService)
const windowManagerService = new WindowManagerService()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize the database
  try {
    await initializeDatabase()
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  ipcHandlerService.registerHandlers()

  // Create main window
  windowManagerService.createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManagerService.createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup resources on app quit
app.on('before-quit', async () => {
  try {
    await databaseService.close()
    console.log('Database connections closed successfully')
  } catch (error) {
    console.error('Error closing database connections:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
