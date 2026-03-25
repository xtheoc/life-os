import { Link } from 'react-router-dom'
import { CalendarDays, ArrowRight } from 'lucide-react'
import { format, addDays, isToday } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import type { DayOfWeek } from '../../types'

interface DayDots {
  hasAssignment: boolean
  hasTask: boolean
  hasClass: boolean
  hasWorkout: boolean
  hasSleep: boolean
}

function Dot({ color }: { color: string }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
}

export default function CalendarStrip() {
  const { assignments, tasks, recurringEvents, workoutSessions, sleepLogs } =
    useAppState()

  const today = new Date()

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 3)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as DayOfWeek

    const dots: DayDots = {
      hasAssignment: assignments.some(
        a => a.dueDate === dateStr && a.status !== 'done'
      ),
      hasTask: tasks.some(t => t.dueDate === dateStr && !t.completed),
      hasClass: recurringEvents.some(
        e => e.category === 'class' && e.active && e.daysOfWeek.includes(dow)
      ),
      hasWorkout: workoutSessions.some(s => s.date === dateStr),
      hasSleep: sleepLogs.some(s => s.wakeDate === dateStr),
    }

    return { date, dateStr, isCurrentDay: isToday(date), dots }
  })

  return (
    <Card>
      <CardHeader
        title="Week at a Glance"
        icon={CalendarDays}
        action={
          <Link
            to="/calendar"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            Calendar <ArrowRight size={11} />
          </Link>
        }
      />

      <div className="p-3 overflow-x-auto">
        <div className="flex gap-1 min-w-max lg:min-w-0 lg:grid lg:grid-cols-7">
          {days.map(({ date, dateStr, isCurrentDay, dots }) => (
            <div
              key={dateStr}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl min-w-[52px] lg:min-w-0 transition-colors ${
                isCurrentDay
                  ? 'bg-accent/15 border border-accent/30'
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Day abbrev */}
              <span
                className={`text-[10px] font-display font-semibold uppercase tracking-wider ${
                  isCurrentDay ? 'text-accent' : 'text-muted'
                }`}
              >
                {format(date, 'EEE')}
              </span>

              {/* Date number */}
              <span
                className={`font-mono text-sm font-bold leading-none ${
                  isCurrentDay ? 'text-accent' : 'text-slate-300'
                }`}
              >
                {format(date, 'd')}
              </span>

              {/* Event dots */}
              <div className="flex flex-wrap justify-center gap-0.5 min-h-[12px]">
                {dots.hasClass && <Dot color="bg-blue-400" />}
                {dots.hasAssignment && <Dot color="bg-warning" />}
                {dots.hasTask && <Dot color="bg-orange-400" />}
                {dots.hasWorkout && <Dot color="bg-success" />}
                {dots.hasSleep && <Dot color="bg-purple-400" />}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 px-1">
          {[
            { color: 'bg-blue-400', label: 'Class' },
            { color: 'bg-warning', label: 'Assignment' },
            { color: 'bg-orange-400', label: 'Task' },
            { color: 'bg-success', label: 'Workout' },
            { color: 'bg-purple-400', label: 'Sleep' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] text-muted font-display">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
