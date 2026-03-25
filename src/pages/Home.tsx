import { format } from 'date-fns'
import TodayAlert from '../components/home/TodayAlert'
import PlannerSnapshot from '../components/home/PlannerSnapshot'
import SchoolWidget from '../components/home/SchoolWidget'
import TasksWidget from '../components/home/TasksWidget'
import SleepWidget from '../components/home/SleepWidget'
import WorkoutWidget from '../components/home/WorkoutWidget'
import FinanceWidget from '../components/home/FinanceWidget'
import CalendarStrip from '../components/home/CalendarStrip'

export default function Home() {
  const today = new Date()

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white mb-0.5">
          {format(today, 'EEEE, dd MMMM yyyy')}
        </h1>
        <p className="text-muted text-sm">Your day at a glance</p>
      </div>

      <div className="mb-4">
        <TodayAlert />
      </div>

      {/* Widget grid
          Desktop (xl, 3 cols):  Planner(2) | School(1) / Tasks(2) | Sleep(1) / Workout(1) | Finance(2) / Calendar(3)
          Tablet  (md, 2 cols):  equal pairs
          Mobile  (1 col):       stacked
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* 1 — Today's Plan (wide) */}
        <div className="md:col-span-2">
          <PlannerSnapshot />
        </div>

        {/* 2 — School Tasks */}
        <SchoolWidget />

        {/* 3 — Tasks & Chores (wide) */}
        <div className="md:col-span-2">
          <TasksWidget />
        </div>

        {/* 4 — Sleep */}
        <SleepWidget />

        {/* 5 — Workout / Bodyweight */}
        <WorkoutWidget />

        {/* 6 — Finance (wide) */}
        <div className="md:col-span-2">
          <FinanceWidget />
        </div>

        {/* 7 — Calendar Strip (full width) */}
        <div className="md:col-span-2 xl:col-span-3">
          <CalendarStrip />
        </div>

      </div>
    </div>
  )
}
