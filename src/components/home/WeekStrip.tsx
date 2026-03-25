import { Link } from 'react-router-dom'
import { CalendarDays, ArrowRight } from 'lucide-react'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import type { DayOfWeek, ChoreSchedule } from '../../types'

function nextDue(c: ChoreSchedule, refDate: string): string {
  if (c.lastDone) {
    const base = new Date(c.lastDone + 'T12:00:00')
    base.setDate(base.getDate() + c.frequencyDays)
    return base.toISOString().slice(0, 10)
  }
  return refDate
}

function Dot({ color }: { color: string }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
}

export default function WeekStrip() {
  const { assignments, tasks, recurringEvents, workoutSessions, choreSchedules } = useAppState()
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as DayOfWeek

    const hasClass = recurringEvents.some(e => e.category === 'class' && e.active && e.daysOfWeek.includes(dow))
    const hasAssignment = assignments.some(a => a.dueDate === dateStr && a.status !== 'done')
    const hasTask = tasks.some(t => t.dueDate === dateStr && !t.completed)
    const hasWorkout = workoutSessions.some(s => s.date === dateStr)
    const hasChore = choreSchedules.some(c => c.active && nextDue(c, dateStr) <= dateStr)

    return { date, dateStr, isCurrentDay: isToday(date), hasClass, hasAssignment, hasTask, hasWorkout, hasChore }
  })

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-muted" />
          <span className="font-display font-semibold text-sm text-slate-200">This week</span>
        </div>
        <Link
          to="/calendar"
          className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
        >
          Calendar <ArrowRight size={11} />
        </Link>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, dateStr, isCurrentDay, hasClass, hasAssignment, hasTask, hasWorkout, hasChore }) => (
            <div
              key={dateStr}
              className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl transition-colors ${
                isCurrentDay ? 'bg-accent/15 border border-accent/30' : 'hover:bg-white/5'
              }`}
            >
              <span className={`text-[9px] font-display font-semibold uppercase tracking-wider ${isCurrentDay ? 'text-accent' : 'text-muted'}`}>
                {format(date, 'EEE')}
              </span>
              <span className={`font-mono text-sm font-bold leading-none ${isCurrentDay ? 'text-accent' : 'text-slate-300'}`}>
                {format(date, 'd')}
              </span>
              <div className="flex flex-wrap justify-center gap-0.5 min-h-[10px]">
                {hasClass && <Dot color="bg-blue-400" />}
                {hasAssignment && <Dot color="bg-warning" />}
                {hasTask && <Dot color="bg-orange-400" />}
                {hasWorkout && <Dot color="bg-success" />}
                {hasChore && <Dot color="bg-slate-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
