import { useState, useRef } from 'react'
import HeroBar from '../components/home/HeroBar'
import DayTimeline from '../components/home/DayTimeline'
import FocusColumn from '../components/home/FocusColumn'
import VitalsColumn from '../components/home/VitalsColumn'
import WeekStrip from '../components/home/WeekStrip'
import QuickSleepModal from '../components/home/QuickSleepModal'

export default function Home() {
  const [sleepModalOpen, setSleepModalOpen] = useState(false)
  const taskInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-5">
      <HeroBar
        onLogSleep={() => setSleepModalOpen(true)}
        onAddTask={() => taskInputRef.current?.focus()}
      />
      <DayTimeline />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FocusColumn taskInputRef={taskInputRef} />
        <VitalsColumn />
      </div>
      <WeekStrip />
      <QuickSleepModal isOpen={sleepModalOpen} onClose={() => setSleepModalOpen(false)} />
    </div>
  )
}
