'use client'

import { useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { AttendancePanel } from './components/AttendancePanel'
import { DailySummaryPanel } from './components/DailySummaryPanel'
import { MonthlySummaryPanel } from './components/MonthlySummaryPanel'
import { useAttendance } from './hooks/useAttendance'
import { TabType } from './types'

export default function AttendanceApp() {
  const [activeTab, setActiveTab] = useState<TabType>('attendance')
  const attendance = useAttendance()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-hidden">
          {activeTab === 'attendance' ? (
            <AttendancePanel
              summary={attendance.summary}
              onClockIn={() => attendance.clockIn()}
              onClockOut={() => attendance.clockOut()}
              onStartBreak={() => attendance.startBreak()}
              onEndBreak={() => attendance.endBreak()}
              onRefreshSummary={attendance.loadTodaySummary}
              error={attendance.error}
            />
          ) : activeTab === 'daily-summary' ? (
            <DailySummaryPanel
              dailySummaries={attendance.dailySummaries}
              isLoading={attendance.isLoading}
              onLoadSummaries={attendance.loadDailySummaries}
              onUpdateWorkSession={attendance.updateWorkSession}
              onCreateWorkSession={attendance.createManualWorkSession}
              onDeleteWorkSession={attendance.deleteWorkSession}
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
