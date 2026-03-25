import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { AlertTriangle, CheckCircle2, Dumbbell, Moon, BookOpen, Clock } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import type { DayOfWeek } from '../../types'

// Helper: next due date for a chore
function choreDue(lastDone: string | undefined, frequencyDays: number): string {
  if (!lastDone) return format(new Date(), 'yyyy-MM-dd')
  return format(addDays(parseISO(lastDone), frequencyDays), 'yyyy-MM-dd')
}

export default function TodayAlert() {
  const { assignments, tasks, choreSchedules, workoutPlan, preferences, recurringEvents, sleepLogs } = useAppState()

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const dow = today.getDay() as DayOfWeek

  // Today's classes
  const todayClasses = recurringEvents.filter(e => e.active && e.category === 'class' && e.daysOfWeek.includes(dow))

  // Today's workout
  const workoutDay = workoutPlan.days.find(d => d.dayOfWeek === dow)
  const hasWorkout = workoutDay && !workoutDay.isRest

  // Exams due within 7 days
  const upcomingExams = assignments.filter(a => {
    if (a.status === 'done' || a.type !== 'exam' || !a.dueDate) return false
    const diff = differenceInCalendarDays(parseISO(a.dueDate), today)
    return diff >= 0 && diff <= 7
  })

  // Overdue tasks
  const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr)

  // Overdue chores
  const overdueChores = choreSchedules.filter(c => c.active && choreDue(c.lastDone, c.frequencyDays) < todayStr)

  // Due today
  const dueToday = tasks.filter(t => !t.completed && t.dueDate === todayStr)
  const choresDueToday = choreSchedules.filter(c => c.active && choreDue(c.lastDone, c.frequencyDays) === todayStr)

  // Tonight's sleep target
  const sleepTarget = preferences.sleepTime

  // Last night's sleep
  const lastSleep = [...sleepLogs].sort((a, b) => b.wakeDate.localeCompare(a.wakeDate))[0]
  const lastSleepHours = lastSleep ? (lastSleep.durationMinutes / 60).toFixed(1) : null

  const alerts: { icon: React.ReactNode; text: string; cls: string }[] = []

  if (overdueChores.length > 0) alerts.push({
    icon: <AlertTriangle size={13} />, cls: 'text-danger',
    text: `${overdueChores.length} overdue chore${overdueChores.length > 1 ? 's' : ''}`
  })
  if (overdueTasks.length > 0) alerts.push({
    icon: <AlertTriangle size={13} />, cls: 'text-danger',
    text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`
  })
  if (upcomingExams.length > 0) alerts.push({
    icon: <BookOpen size={13} />, cls: 'text-warning',
    text: `${upcomingExams.length} exam${upcomingExams.length > 1 ? 's' : ''} this week`
  })
  if (dueToday.length > 0 || choresDueToday.length > 0) alerts.push({
    icon: <Clock size={13} />, cls: 'text-warning',
    text: `${dueToday.length + choresDueToday.length} due today`
  })

  const info: { icon: React.ReactNode; text: string; cls: string }[] = []

  if (todayClasses.length > 0) info.push({
    icon: <BookOpen size={13} />, cls: 'text-accent',
    text: `${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''} today`
  })
  if (hasWorkout) info.push({
    icon: <Dumbbell size={13} />, cls: 'text-success',
    text: workoutDay.label || 'Workout today'
  })
  if (lastSleepHours) info.push({
    icon: <Moon size={13} />, cls: 'text-purple-400',
    text: `Last night: ${lastSleepHours}h · Bed at ${sleepTarget}`
  })

  if (alerts.length === 0 && info.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2.5">
        <CheckCircle2 size={16} className="text-success shrink-0" />
        <span className="text-sm text-slate-300">All clear — nothing urgent today.</span>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {alerts.map((a, i) => (
            <span key={i} className={`flex items-center gap-1.5 text-xs font-display font-semibold ${a.cls}`}>
              {a.icon}{a.text}
            </span>
          ))}
        </div>
      )}
      {info.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {info.map((a, i) => (
            <span key={i} className={`flex items-center gap-1.5 text-xs font-display ${a.cls}`}>
              {a.icon}{a.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
