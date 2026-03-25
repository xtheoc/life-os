import { useMemo, useState } from 'react'
import {
  format, startOfWeek, endOfWeek, subWeeks, addWeeks,
  isWithinInterval, parseISO, addDays,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Moon,
  Dumbbell, DollarSign, BookOpen,
} from 'lucide-react'
import { useAppState } from '../context/AppContext'
import { totalExpenses, totalIncome } from '../lib/financeUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-muted" />
      <h2 className="text-sm font-display font-semibold text-white">{title}</h2>
    </div>
  )
}

function MiniBar({ value, max, color = '#3b82f6' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WeeklyReview() {
  const {
    tasks, choreSchedules, sleepLogs, workoutPlan, workoutSessions,
    financeImports, grades, assignments, preferences,
  } = useAppState()

  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 })
    return weekOffset === 0 ? base : weekOffset < 0 ? subWeeks(base, -weekOffset) : addWeeks(base, weekOffset)
  }, [weekOffset])

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const interval = { start: weekStart, end: weekEnd }

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const weekLabel = `${format(weekStart, 'EEE d MMM')} – ${format(weekEnd, 'EEE d MMM yyyy')}`

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const tasksCompleted = useMemo(() =>
    tasks.filter(t => t.completedAt && isWithinInterval(parseISO(t.completedAt.slice(0, 10)), interval)).length,
  [tasks, weekStart, weekEnd])

  const tasksOverdue = useMemo(() =>
    tasks.filter(t => !t.completed && t.dueDate && t.dueDate >= weekStartStr && t.dueDate <= weekEndStr).length,
  [tasks, weekStartStr, weekEndStr])

  const tasksTotal = tasksCompleted + tasksOverdue

  // ── Chores ─────────────────────────────────────────────────────────────────
  const choreOccurrences = useMemo(() => {
    let count = 0
    for (const c of choreSchedules) {
      if (!c.active) continue
      // Count how many occurrences of this chore fall in the week
      const anchor = c.lastDone ? parseISO(c.lastDone) : addDays(weekStart, -c.frequencyDays)
      let occ = new Date(anchor)
      // Step forward to first occurrence after or on week start
      while (occ < weekStart) occ = addDays(occ, c.frequencyDays)
      while (occ <= weekEnd) {
        count++
        occ = addDays(occ, c.frequencyDays)
      }
    }
    return count
  }, [choreSchedules, weekStart, weekEnd])

  const choresDone = useMemo(() =>
    choreSchedules.filter(c => c.lastDone && isWithinInterval(parseISO(c.lastDone), interval)).length,
  [choreSchedules, weekStart, weekEnd])

  const choreAdherence = choreOccurrences > 0 ? Math.round((choresDone / choreOccurrences) * 100) : null

  // ── Sleep ──────────────────────────────────────────────────────────────────
  const weekSleepLogs = useMemo(() =>
    sleepLogs.filter(s => s.wakeDate >= weekStartStr && s.wakeDate <= weekEndStr),
  [sleepLogs, weekStartStr, weekEndStr])

  const avgSleepMin = weekSleepLogs.length > 0
    ? weekSleepLogs.reduce((s, l) => s + l.durationMinutes, 0) / weekSleepLogs.length
    : null
  const avgSleepH = avgSleepMin !== null ? Math.floor(avgSleepMin / 60) : null
  const avgSleepM = avgSleepMin !== null ? Math.round(avgSleepMin % 60) : null

  const avgQuality = weekSleepLogs.length > 0 && weekSleepLogs.some(s => s.quality)
    ? weekSleepLogs.filter(s => s.quality).reduce((s, l) => s + (l.quality ?? 0), 0) / weekSleepLogs.filter(s => s.quality).length
    : null

  // ── Workout ────────────────────────────────────────────────────────────────
  // Count planned workout days in this week
  const plannedWorkoutDays = useMemo(() => {
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const dow = d.getDay()
      const planDay = workoutPlan.days.find(p => p.dayOfWeek === dow)
      if (planDay && !planDay.isRest) count++
    }
    return count
  }, [workoutPlan, weekStart])

  const actualWorkoutSessions = useMemo(() =>
    workoutSessions.filter(ws => ws.date >= weekStartStr && ws.date <= weekEndStr).length,
  [workoutSessions, weekStartStr, weekEndStr])

  // ── Finance ────────────────────────────────────────────────────────────────
  const weekTransactions = useMemo(() => {
    const txns = financeImports.flatMap(imp => imp.transactions)
    return txns.filter(t => t.date >= weekStartStr && t.date <= weekEndStr)
  }, [financeImports, weekStartStr, weekEndStr])

  const weekExpenses = totalExpenses(weekTransactions)
  const weekIncome = totalIncome(weekTransactions)

  // Budget % used (weekly portion = monthly / 4.3)
  const totalBudgetLimit = Object.values(preferences.budgetLimits).reduce((s: number, v) => s + (v ?? 0), 0)
  const weeklyBudget = totalBudgetLimit > 0 ? totalBudgetLimit / 4.3 : null
  const weeklyBudgetPct = weeklyBudget ? Math.round((weekExpenses / weeklyBudget) * 100) : null

  // ── School ─────────────────────────────────────────────────────────────────
  const weekGrades = useMemo(() =>
    grades.filter(g => g.date >= weekStartStr && g.date <= weekEndStr),
  [grades, weekStartStr, weekEndStr])

  const weekAssignmentsDone = useMemo(() =>
    assignments.filter(a => a.status === 'done' && a.dueDate && a.dueDate >= weekStartStr && a.dueDate <= weekEndStr).length,
  [assignments, weekStartStr, weekEndStr])

  const weekAssignmentsDue = useMemo(() =>
    assignments.filter(a => a.dueDate && a.dueDate >= weekStartStr && a.dueDate <= weekEndStr).length,
  [assignments, weekStartStr, weekEndStr])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-0.5">Weekly Review</h1>
          <p className="text-muted text-sm">Summary of your week</p>
        </div>
        {/* Week navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-display font-semibold text-white min-w-[200px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            disabled={weekOffset >= 0}
            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Tasks */}
        <Card>
          <CardTitle icon={CheckCircle2} title="Tasks" />
          {tasksTotal === 0 ? (
            <p className="text-xs text-muted">No tasks due this week.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-success flex items-center gap-1.5"><CheckCircle2 size={13} /> {tasksCompleted} completed</span>
                <span className="text-danger flex items-center gap-1.5"><XCircle size={13} /> {tasksOverdue} overdue</span>
              </div>
              <MiniBar value={tasksCompleted} max={tasksTotal} color="#22c55e" />
              <p className="text-xs text-muted">{tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0}% completion rate</p>
            </div>
          )}
        </Card>

        {/* Chores */}
        <Card>
          <CardTitle icon={CheckCircle2} title="Chores" />
          {choreOccurrences === 0 ? (
            <p className="text-xs text-muted">No chores scheduled this week.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">{choresDone} / {choreOccurrences} done</span>
                {choreAdherence !== null && (
                  <span className={`font-mono text-xs font-semibold ${choreAdherence >= 80 ? 'text-success' : choreAdherence >= 50 ? 'text-warning' : 'text-danger'}`}>
                    {choreAdherence}%
                  </span>
                )}
              </div>
              <MiniBar value={choresDone} max={choreOccurrences} color={choreAdherence !== null && choreAdherence >= 80 ? '#22c55e' : '#f59e0b'} />
              <p className="text-xs text-muted">Adherence this week</p>
            </div>
          )}
        </Card>

        {/* Sleep */}
        <Card>
          <CardTitle icon={Moon} title="Sleep" />
          {weekSleepLogs.length === 0 ? (
            <p className="text-xs text-muted">No sleep logs this week.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {avgSleepH !== null && (
                  <div>
                    <p className="text-[10px] text-muted font-display uppercase tracking-wider">Avg. Duration</p>
                    <p className="font-mono text-lg font-bold text-white">{avgSleepH}h{avgSleepM !== null && avgSleepM > 0 ? `${avgSleepM}m` : ''}</p>
                  </div>
                )}
                {avgQuality !== null && (
                  <div>
                    <p className="text-[10px] text-muted font-display uppercase tracking-wider">Avg. Quality</p>
                    <p className="font-mono text-lg font-bold text-white">{avgQuality.toFixed(1)}/5</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted font-display uppercase tracking-wider">Nights</p>
                  <p className="font-mono text-lg font-bold text-white">{weekSleepLogs.length}</p>
                </div>
              </div>
              <div className="space-y-1">
                {weekSleepLogs.slice().sort((a, b) => a.wakeDate.localeCompare(b.wakeDate)).map(s => {
                  const h = Math.floor(s.durationMinutes / 60)
                  const m = s.durationMinutes % 60
                  const durColor = s.durationMinutes >= 7 * 60 ? '#22c55e' : s.durationMinutes >= 6 * 60 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted w-12 shrink-0 font-mono">{format(parseISO(s.wakeDate), 'EEE')}</span>
                      <div className="flex-1 h-3 bg-white/5 rounded overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${Math.min((s.durationMinutes / (10 * 60)) * 100, 100)}%`, background: durColor }} />
                      </div>
                      <span className="font-mono text-white w-12 text-right">{h}h{m > 0 ? `${m}m` : ''}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Workout */}
        <Card>
          <CardTitle icon={Dumbbell} title="Workout" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">{actualWorkoutSessions} / {plannedWorkoutDays} workout days</span>
              {plannedWorkoutDays > 0 && (
                <span className={`font-mono text-xs font-semibold ${actualWorkoutSessions >= plannedWorkoutDays ? 'text-success' : actualWorkoutSessions > 0 ? 'text-warning' : 'text-muted'}`}>
                  {Math.round((actualWorkoutSessions / Math.max(plannedWorkoutDays, 1)) * 100)}%
                </span>
              )}
            </div>
            <MiniBar value={actualWorkoutSessions} max={plannedWorkoutDays} color="#22c55e" />
            <p className="text-xs text-muted">{actualWorkoutSessions === 0 ? 'No sessions logged' : `${actualWorkoutSessions} session${actualWorkoutSessions > 1 ? 's' : ''} logged`}</p>
          </div>
        </Card>

        {/* Finance */}
        <Card>
          <CardTitle icon={DollarSign} title="Finance" />
          {weekTransactions.length === 0 ? (
            <p className="text-xs text-muted">No transactions this week.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-muted font-display uppercase tracking-wider">Expenses</p>
                  <p className="font-mono text-base font-bold text-danger">{weekExpenses.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted font-display uppercase tracking-wider">Income</p>
                  <p className="font-mono text-base font-bold text-success">{weekIncome.toFixed(2)} €</p>
                </div>
              </div>
              {weeklyBudget !== null && weeklyBudgetPct !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Weekly budget ({weeklyBudget.toFixed(0)} €)</span>
                    <span className={`font-mono font-semibold ${weeklyBudgetPct > 100 ? 'text-danger' : weeklyBudgetPct >= 80 ? 'text-warning' : 'text-success'}`}>
                      {weeklyBudgetPct}%
                    </span>
                  </div>
                  <MiniBar
                    value={weekExpenses}
                    max={weeklyBudget}
                    color={weeklyBudgetPct > 100 ? '#ef4444' : weeklyBudgetPct >= 80 ? '#f59e0b' : '#22c55e'}
                  />
                </div>
              )}
            </div>
          )}
        </Card>

        {/* School */}
        <Card>
          <CardTitle icon={BookOpen} title="School" />
          <div className="space-y-3">
            {weekGrades.length > 0 ? (
              <div>
                <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-2">Grades this week ({weekGrades.length})</p>
                <div className="space-y-1">
                  {weekGrades.slice(0, 4).map(g => (
                    <div key={g.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate flex-1">{g.title}</span>
                      <span className="font-mono text-white ml-2">{g.score}/{g.maxScore}</span>
                    </div>
                  ))}
                  {weekGrades.length > 4 && <p className="text-xs text-muted">+{weekGrades.length - 4} more</p>}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">No grades added this week.</p>
            )}
            {weekAssignmentsDue > 0 && (
              <div>
                <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-1">Assignments due</p>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-success">{weekAssignmentsDone} submitted</span>
                  <span className="text-muted">/ {weekAssignmentsDue} due</span>
                </div>
                <MiniBar value={weekAssignmentsDone} max={weekAssignmentsDue} color="#22c55e" />
              </div>
            )}
            {weekGrades.length === 0 && weekAssignmentsDue === 0 && (
              <p className="text-xs text-muted">No school activity this week.</p>
            )}
          </div>
        </Card>

      </div>
    </div>
  )
}
