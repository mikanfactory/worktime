import { Timer, BarChart3, TrendingUp } from 'lucide-react'
import iconImage from '../assets/icon.png'
import { Button } from '../components/ui/button'
import { TabType } from '../types'

type SidebarProps = {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-16 border-r bg-muted/30 flex flex-col items-center">
      <div className="p-2 mt-2">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
          <img src={iconImage} alt="BeaverLog" className="w-10 h-10" />
        </div>
      </div>
      <nav className="flex flex-col items-center gap-2 mt-8">
        <Button
          variant={activeTab === 'attendance' ? 'secondary' : 'ghost'}
          size="icon"
          className="w-12 h-12"
          onClick={() => onTabChange('attendance')}
        >
          <Timer className="h-5 w-5" />
          <span className="sr-only">Attendance</span>
        </Button>
        <Button
          variant={activeTab === 'daily-summary' ? 'secondary' : 'ghost'}
          size="icon"
          className="w-12 h-12"
          onClick={() => onTabChange('daily-summary')}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="sr-only">Daily Summary</span>
        </Button>
        <Button
          variant={activeTab === 'monthly-summary' ? 'secondary' : 'ghost'}
          size="icon"
          className="w-12 h-12"
          onClick={() => onTabChange('monthly-summary')}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="sr-only">Monthly Summary</span>
        </Button>
      </nav>
    </div>
  )
}
