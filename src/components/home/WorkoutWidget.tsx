import { Link } from 'react-router-dom'
import { Dumbbell, ArrowRight, Flame, Scale, AlertCircle } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import type { WorkoutPlan, WorkoutSession, BodyweightLog, DayOfWeek } from '../../types'

function computeStreak(sessions: WorkoutSession[], plan: WorkoutPlan): number {
  const sessionDates = new Set(sessions.map(s => s.date))
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayDow = today.getDay() as DayOfWeek

  // Count today if it's a planned day with a session
  const todayPlan = plan.days.find(d => d.dayOfWeek === todayDow)
  let streak = todayPlan && !todayPlan.isRest && sessionDates.has(todayStr) ? 1 : 0

  // Walk backwards from yesterday
  for (let i = 1; i <= 365; i++) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as DayOfWeek
    const planDay = plan.days.find(d => d.dayOfWeek === dow)

    if (!planDay || planDay.isRest) continue // Transparent rest day

    if (sessionDates.has(dateStr)) {
      streak++
    } else {
      break // Missed a planned workout day
    }
  }

  return streak
}

function needsWeighIn(logs: BodyweightLog[], preferredDay: DayOfWeek): boolean {
  if (logs.length === 0) return true
  const today = new Date()
  const todayDow = today.getDay()
  let daysBack = todayDow - preferredDay
  if (daysBack < 0) daysBack += 7
  const weighInDate = format(subDays(today, daysBack), 'yyyy-MM-dd')
  const todayStr = format(today, 'yyyy-MM-dd')
  return !logs.some(l => l.date >= weighInDate && l.date <= todayStr)
}

export default function WorkoutWidget() {
  const { workoutSessions, workoutPlan, bodyweightLogs, preferences } = useAppState()

  const streak = computeStreak(workoutSessions, workoutPlan)
  const showWeighInReminder = needsWeighIn(
    bodyweightLogs,
    preferences.weeklyWeighInDay
  )

  const latestWeight = [...bodyweightLogs].sort((a, b) =>
    b.date.localeCompare(a.date)
  )[0] ?? null

  const todayDow = new Date().getDay() as DayOfWeek
  const todayPlan = workoutPlan.days.find(d => d.dayOfWeek === todayDow)
  const todayLabel = todayPlan
    ? todayPlan.isRest
      ? 'Rest day'
      : todayPlan.label
    : 'No plan set'

  return (
    <Card>
      <CardHeader
        title="Workout"
        icon={Dumbbell}
        action={
          <Link
            to="/workout"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            Log <ArrowRight size={11} />
          </Link>
        }
      />

      <div className="p-4 space-y-3">
        {/* Streak + weight row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-lg p-3 flex items-center gap-2">
            <Flame size={18} className={streak > 0 ? 'text-warning' : 'text-muted'} />
            <div>
              <span className="font-mono text-xl font-bold text-white">{streak}</span>
              <p className="text-[10px] text-muted font-display leading-none mt-0.5">
                day streak
              </p>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-3 flex items-center gap-2">
            <Scale size={16} className="text-muted" />
            <div>
              {latestWeight ? (
                <>
                  <span className="font-mono text-xl font-bold text-white">
                    {latestWeight.weight}
                  </span>
                  <span className="font-mono text-xs text-muted ml-0.5">
                    {latestWeight.unit}
                  </span>
                  <p className="text-[10px] text-muted font-display leading-none mt-0.5">
                    bodyweight
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted font-display">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Today's plan */}
        <div className="bg-surface rounded-lg px-3 py-2.5 flex items-center gap-2">
          <span className="text-[10px] text-muted font-display uppercase tracking-wider shrink-0">
            Today
          </span>
          <span
            className={`text-sm font-display font-medium truncate ${
              todayPlan?.isRest ? 'text-muted' : 'text-slate-200'
            }`}
          >
            {todayLabel}
          </span>
        </div>

        {/* Weigh-in reminder */}
        {showWeighInReminder && (
          <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning font-display leading-snug">
              Weekly weigh-in due — log your weight.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
