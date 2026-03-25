import { Link } from 'react-router-dom'
import { Moon, Dumbbell, TrendingUp, ArrowRight, Flame } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { formatDuration } from '../../lib/utils'
import type { WorkoutSession, WorkoutPlan, DayOfWeek } from '../../types'

function computeStreak(sessions: WorkoutSession[], plan: WorkoutPlan): number {
  const sessionDates = new Set(sessions.map(s => s.date))
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayDow = today.getDay() as DayOfWeek
  const todayPlan = plan.days.find(d => d.dayOfWeek === todayDow)
  let streak = todayPlan && !todayPlan.isRest && sessionDates.has(todayStr) ? 1 : 0
  for (let i = 1; i <= 365; i++) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as DayOfWeek
    const planDay = plan.days.find(d => d.dayOfWeek === dow)
    if (!planDay || planDay.isRest) continue
    if (sessionDates.has(dateStr)) streak++
    else break
  }
  return streak
}

function QualityDots({ quality }: { quality?: number }) {
  if (!quality) return null
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= quality ? 'bg-purple-400' : 'bg-border'}`} />
      ))}
    </div>
  )
}

export default function VitalsColumn() {
  const { sleepLogs, workoutSessions, workoutPlan, financeImports, preferences } = useAppState()

  // Sleep
  const latestSleep = [...sleepLogs]
    .sort((a, b) => `${b.wakeDate} ${b.wakeTime}`.localeCompare(`${a.wakeDate} ${a.wakeTime}`))[0] ?? null

  // Workout
  const streak = computeStreak(workoutSessions, workoutPlan)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayDow = new Date().getDay() as DayOfWeek
  const todayPlan = workoutPlan.days.find(d => d.dayOfWeek === todayDow)
  const todaySession = workoutSessions.find(s => s.date === todayStr)
  const isRestDay = !todayPlan || todayPlan.isRest
  const workoutDone = !!todaySession

  // Finance
  const latestImport = [...financeImports].sort((a, b) => b.month.localeCompare(a.month))[0] ?? null
  const monthSpend = latestImport
    ? latestImport.transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    : null
  const monthName = latestImport ? format(parseISO(latestImport.month + '-01'), 'MMM yyyy') : null

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <span className="font-display font-semibold text-sm text-slate-200">Vitals</span>
      </div>

      <div className="divide-y divide-border">
        {/* Sleep */}
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Moon size={16} className="text-purple-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-1">Sleep</p>
            {latestSleep ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-white">
                    {formatDuration(latestSleep.durationMinutes)}
                  </span>
                  <QualityDots quality={latestSleep.quality} />
                </div>
                <p className="font-mono text-[11px] text-muted mt-0.5">
                  {latestSleep.sleepTime} → {latestSleep.wakeTime}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted font-display">No data</p>
            )}
          </div>
          <Link to="/sleep" className="text-[11px] text-muted hover:text-accent font-display flex items-center gap-0.5 transition-colors shrink-0 mt-0.5">
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Workout */}
        <div className="flex items-start gap-3 px-4 py-3.5">
          <Dumbbell size={16} className={`mt-0.5 shrink-0 ${isRestDay ? 'text-muted' : workoutDone ? 'text-success' : 'text-warning'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-1">Workout</p>
            {isRestDay ? (
              <span className="text-sm font-display text-muted">Rest day</span>
            ) : workoutDone ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-display font-medium text-success">Done</span>
                <span className="text-xs text-muted font-display">{todayPlan?.label}</span>
                {streak > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-warning">
                    <Flame size={11} /> {streak}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-display font-medium text-warning">Pending</span>
                <span className="text-xs text-muted font-display truncate">{todayPlan?.label}</span>
              </div>
            )}
          </div>
          <Link to="/workout" className="text-[11px] text-muted hover:text-accent font-display flex items-center gap-0.5 transition-colors shrink-0 mt-0.5">
            <ArrowRight size={11} />
          </Link>
        </div>

        {/* Finance */}
        <div className="flex items-start gap-3 px-4 py-3.5">
          <TrendingUp size={16} className="text-accent mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-1">Finance</p>
            {monthSpend !== null ? (
              <>
                <span className="font-mono text-base font-bold text-white">
                  {monthSpend.toFixed(0)}
                  <span className="text-xs text-muted ml-1">{preferences.currency}</span>
                </span>
                <p className="text-[11px] text-muted font-display mt-0.5">{monthName}</p>
              </>
            ) : (
              <p className="text-sm text-muted font-display">No data</p>
            )}
          </div>
          <Link to="/finance" className="text-[11px] text-muted hover:text-accent font-display flex items-center gap-0.5 transition-colors shrink-0 mt-0.5">
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  )
}
