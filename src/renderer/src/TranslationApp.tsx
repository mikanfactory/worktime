'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { AttendancePanel } from './components/AttendancePanel'
import { AttendanceHistoryPanel } from './components/AttendanceHistoryPanel'
import { DailySummaryPanel } from './components/DailySummaryPanel'
import { MonthlySummaryPanel } from './components/MonthlySummaryPanel'
import { useAttendance } from './hooks/useAttendance'
import { TabType } from './types'

export default function AttendanceApp() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const attendance = useAttendance()

  useEffect(() => {
    if (activeTab === 'attendance-history') {
      void attendance.loadLogs({ limit: 50 })
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
              summary={attendance.summary}
              onLogAttendance={() => attendance.logAttendance(attendance.summary.isWorking ? 'clock_out' : 'clock_in')}
              onRefreshSummary={attendance.loadTodaySummary}
              error={attendance.error}
            />
          ) : activeTab === 'attendance-history' ? (
            <AttendanceHistoryPanel
              logs={attendance.logs}
              isLoading={attendance.isLoading}
              onUpdateLog={attendance.updateLog}
              onDeleteLog={attendance.deleteLog}
              onLogAttendance={async (eventType, occurredAt, note) => {
                const api = window.api
                if (!api) return false
                const result = await api.logAttendance({ eventType, occurredAt, note })
                if (result.ok) {
                  await attendance.loadLogs({ limit: 50 })
                  return true
                }
                return false
              }}
              onRefreshLogs={() => attendance.loadLogs({ limit: 50 })}
              onLoadLogs={attendance.loadLogs}
            />
          ) : activeTab === 'daily-summary' ? (
            <DailySummaryPanel
              dailySummaries={attendance.dailySummaries}
              isLoading={attendance.isLoading}
              onLoadSummaries={attendance.loadDailySummaries}
            />
          ) : activeTab === 'monthly-summary' ? (
            <MonthlySummaryPanel
              monthlySummary={attendance.monthlySummary}
              isLoading={attendance.isLoading}
              onLoadSummary={attendance.loadMonthlySummary}
            />
          ) : null}
        </main>
      </div>
    </div>
  )
}
