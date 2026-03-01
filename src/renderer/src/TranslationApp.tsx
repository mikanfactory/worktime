'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { AttendancePanel } from './components/AttendancePanel'
import { AttendanceHistoryPanel } from './components/AttendanceHistoryPanel'
import { useAttendance } from './hooks/useAttendance'
import { TabType } from './types'

export default function AttendanceApp() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const attendance = useAttendance()

  // Load attendance history when attendance history tab is selected
  useEffect(() => {
    if (activeTab === 'attendance-history') {
      attendance.loadLogs()
    }
  }, [activeTab, attendance.loadLogs])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-hidden">
          {activeTab === 'attendance' ? (
            <AttendancePanel
              onLogAttendance={attendance.logAttendance}
              isLoading={attendance.isLoading}
            />
          ) : activeTab === 'attendance-history' ? (
            <AttendanceHistoryPanel
              logs={attendance.logs}
              isLoading={attendance.isLoading}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
