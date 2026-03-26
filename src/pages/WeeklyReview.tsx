import { useState } from 'react'
import {
  format, startOfWeek, addDays, addWeeks, isToday,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  Dumbbell, BookOpen, CalendarDays, AlarmClock,
} from 'lucide-react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { uid } from '../lib/utils'
import type { DayOfWeek } from '../types'

// ─── helpers ──────────────────────────────────────────────────────────────────

function nextDue(c: { lastDone?: string; frequencyDays: number }): string {
  if (c.lastDone) {
    const base = new Date(c.lastDone + 'T12:00:00')
    base.setDate(base.getDate() + c.frequencyDays)
    return base.toISOString().slice(0, 10)
  }
  return format(new Date(), 'yyyy-MM-dd')
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-danger',
  high: 'text-warning',
  medium: 'text-muted',
  low: 'text-muted',
}

// ─── Day picker chips ──────────────────────────────────────────────────────────

function DayChips({ weekDays, onSelect }: { weekDays: Date[]; onSelect: (d: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5 pb-1">
      {weekDays.map(day => (
        <button
          key={day.toISOString()}
          onClick={() => onSelect(format(day, 'yyyy-MM-dd'))}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-display font-semibold transition-colors ${
            isToday(day)
              ? 'bg-accent text-white'
              : 'bg-accent/15 text-accent hover:bg-accent/30'
          }`}
        >
          {format(day, 'EEE d')}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  const {
    tasks, choreSchedules, choreAssignments,
    recurringEvents, assignments, courses,
    calendarEvents, workoutPlan,
  } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [weekOffset, setWeekOffset] = useState(0)
  const [assigningTask, setAssigningTask] = useState<string | null>(null)
  const [assigningChore, setAssigningChore] = useState<string | null>(null)

  // Week bounds
  const weekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekStartStr = format(weekDays[0], 'yyyy-MM-dd')
  const weekEndStr = format(weekDays[6], 'yyyy-MM-dd')

  // ── Inbox derived data ──────────────────────────────────────────────────────

  const inboxTasks = tasks.filter(t =>
    !t.completed &&
    (!t.scheduledDate || t.scheduledDate < weekStartStr || t.scheduledDate > weekEndStr)
  )

  const assignedChoreIdsThisWeek = new Set(
    choreAssignments
      .filter(a => a.date >= weekStartStr && a.date <= weekEndStr)
      .map(a => a.choreId)
  )
  const inboxChores = choreSchedules.filter(c =>
    c.active && nextDue(c) <= weekEndStr && !assignedChoreIdsThisWeek.has(c.id)
  )

  // ── Actions ─────────────────────────────────────────────────────────────────

  function assignTask(taskId: string, date: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, scheduledDate: date } })
    setAssigningTask(null)
    toast(`Planned for ${format(new Date(date + 'T12:00'), 'EEE d')}`, 'success')
  }

  function unassignTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    dispatch({ type: 'UPDATE_TASK', payload: { ...task, scheduledDate: undefined } })
  }

  function assignChore(choreId: string, date: string) {
    dispatch({ type: 'ASSIGN_CHORE', payload: { id: uid(), choreId, date } })
    setAssigningChore(null)
    toast(`Planned for ${format(new Date(date + 'T12:00'), 'EEE d')}`, 'success')
  }

  function unassignChore(choreId: string) {
    dispatch({ type: 'UNASSIGN_CHORE', payload: { choreId } })
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Week Planner</h1>
          <p className="text-muted text-sm mt-0.5">
            {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-muted hover:text-white text-xs font-display transition-colors"
            >
              This week
            </button>
          )}
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">

        {/* ── Inbox ──────────────────────────────────────────────────────────── */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display font-semibold text-sm text-slate-200">To schedule</span>
              <span className="font-mono text-xs text-muted bg-white/5 px-2 py-0.5 rounded-full">
                {inboxTasks.length + inboxChores.length}
              </span>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">

              {/* Tasks */}
              {inboxTasks.length > 0 && (
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider px-1 mb-2">
                    Tasks
                  </p>
                  <ul className="space-y-0.5">
                    {inboxTasks.map(task => (
                      <li key={task.id}>
                        <div className="flex items-start gap-2 px-1.5 py-1.5 rounded-lg hover:bg-white/4 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-display text-slate-200 leading-tight">{task.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-mono ${PRIORITY_COLOR[task.priority]}`}>
                                {task.priority}
                              </span>
                              {task.dueDate && (
                                <span className="text-[10px] font-mono text-muted">
                                  due {task.dueDate.slice(5)}
                                </span>
                              )}
                              {task.estimatedMinutes && (
                                <span className="text-[10px] font-mono text-muted">
                                  ~{task.estimatedMinutes}m
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAssigningChore(null)
                              setAssigningTask(assigningTask === task.id ? null : task.id)
                            }}
                            className={`p-1 rounded-lg transition-colors shrink-0 mt-0.5 ${
                              assigningTask === task.id
                                ? 'bg-accent/20 text-accent'
                                : 'text-muted hover:text-accent'
                            }`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        {assigningTask === task.id && (
                          <div className="px-1.5 pb-1.5">
                            <p className="text-[10px] text-muted font-display px-0.5 mb-1">Pick a day:</p>
                            <DayChips weekDays={weekDays} onSelect={d => assignTask(task.id, d)} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Chores */}
              {inboxChores.length > 0 && (
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider px-1 mb-2">
                    Chores
                  </p>
                  <ul className="space-y-0.5">
                    {inboxChores.map(chore => (
                      <li key={chore.id}>
                        <div className="flex items-start gap-2 px-1.5 py-1.5 rounded-lg hover:bg-white/4 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-display text-slate-200 leading-tight">{chore.title}</p>
                            <p className="text-[10px] font-mono text-muted mt-0.5">
                              every {chore.frequencyDays}d
                              {chore.durationMinutes ? ` · ~${chore.durationMinutes}m` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setAssigningTask(null)
                              setAssigningChore(assigningChore === chore.id ? null : chore.id)
                            }}
                            className={`p-1 rounded-lg transition-colors shrink-0 mt-0.5 ${
                              assigningChore === chore.id
                                ? 'bg-accent/20 text-accent'
                                : 'text-muted hover:text-accent'
                            }`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                        {assigningChore === chore.id && (
                          <div className="px-1.5 pb-1.5">
                            <p className="text-[10px] text-muted font-display px-0.5 mb-1">Pick a day:</p>
                            <DayChips weekDays={weekDays} onSelect={d => assignChore(chore.id, d)} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {inboxTasks.length === 0 && inboxChores.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-success font-display font-semibold text-sm">All planned!</p>
                  <p className="text-muted text-xs mt-0.5">Nothing left to schedule.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Week grid ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dow = day.getDay() as DayOfWeek
              const today = isToday(day)

              // Fixed / immovable items
              const dayRecurring = recurringEvents.filter(e => e.active && e.daysOfWeek.includes(dow))
              const dayDeadlines = assignments.filter(a => a.dueDate === dateStr && a.status !== 'done')
              const dayCalEvents = calendarEvents.filter(e => e.date === dateStr)

              // Workout plan
              const workoutDay = workoutPlan.days.find(d => d.dayOfWeek === dow)

              // Assigned by user
              const dayTasks = tasks.filter(t => !t.completed && t.scheduledDate === dateStr)
              const dayChoreAssignments = choreAssignments.filter(a => a.date === dateStr)

              // Load estimate
              const estimatedMin = dayTasks.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)

              const hasFixed = dayRecurring.length > 0 || dayDeadlines.length > 0 || dayCalEvents.length > 0
              const hasAssigned = dayTasks.length > 0 || dayChoreAssignments.length > 0

              return (
                <div
                  key={dateStr}
                  className={`bg-card border rounded-xl flex flex-col overflow-hidden ${
                    today ? 'border-accent/50' : 'border-border'
                  }`}
                >
                  {/* Day header */}
                  <div className={`px-2 py-2 text-center border-b ${
                    today ? 'bg-accent/10 border-accent/30' : 'border-border'
                  }`}>
                    <p className={`text-[10px] font-display font-semibold uppercase tracking-wider ${
                      today ? 'text-accent' : 'text-muted'
                    }`}>
                      {format(day, 'EEE')}
                    </p>
                    <p className={`font-mono text-sm font-bold ${today ? 'text-accent' : 'text-white'}`}>
                      {format(day, 'd')}
                    </p>
                    {estimatedMin > 0 && (
                      <p className="font-mono text-[9px] text-muted mt-0.5">~{estimatedMin}m</p>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1 flex-1">

                    {/* Workout badge */}
                    {workoutDay && !workoutDay.isRest && (
                      <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-success/10 border border-success/20">
                        <Dumbbell size={9} className="text-success shrink-0" />
                        <span className="text-[10px] font-display text-success truncate leading-tight">
                          {workoutDay.label}
                        </span>
                      </div>
                    )}

                    {/* Recurring events (classes, etc.) */}
                    {dayRecurring.map(e => (
                      <div key={e.id} className="flex items-start gap-1 px-1.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <BookOpen size={9} className="text-blue-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-display text-blue-300 truncate leading-tight">{e.title}</p>
                          <p className="font-mono text-[9px] text-blue-400/60">{e.startTime}</p>
                        </div>
                      </div>
                    ))}

                    {/* Assignment deadlines */}
                    {dayDeadlines.map(a => {
                      const course = courses.find(c => c.id === a.courseId)
                      return (
                        <div key={a.id} className="flex items-start gap-1 px-1.5 py-1 rounded-lg bg-danger/10 border border-danger/20">
                          <AlarmClock size={9} className="text-danger shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-display text-red-300 truncate leading-tight">{a.title}</p>
                            {course && (
                              <p className="font-mono text-[9px] text-red-400/60 truncate">{course.code}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Calendar events */}
                    {dayCalEvents.map(e => (
                      <div
                        key={e.id}
                        className="flex items-center gap-1 px-1.5 py-1 rounded-lg border"
                        style={{ background: `${e.color}18`, borderColor: `${e.color}35` }}
                      >
                        <CalendarDays size={9} style={{ color: e.color }} className="shrink-0" />
                        <span
                          className="text-[10px] font-display truncate leading-tight"
                          style={{ color: e.color }}
                        >
                          {e.title}
                        </span>
                      </div>
                    ))}

                    {/* Divider between fixed and user-assigned */}
                    {hasFixed && hasAssigned && (
                      <div className="border-t border-border/40 my-0.5" />
                    )}

                    {/* Assigned tasks */}
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-1 px-1.5 py-1 rounded-lg bg-white/4 group hover:bg-white/6 transition-colors"
                      >
                        <button
                          onClick={() => {
                            dispatch({ type: 'TOGGLE_TASK', payload: { id: task.id } })
                            toast('Task done!', 'success')
                          }}
                          className="w-3 h-3 rounded border border-border hover:border-accent flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                          aria-label="Complete task"
                        >
                          <Check size={7} className="text-success opacity-0 group-hover:opacity-60" />
                        </button>
                        <span className="flex-1 text-[11px] font-display text-slate-300 truncate leading-tight min-w-0">
                          {task.title}
                        </span>
                        <button
                          onClick={() => unassignTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all shrink-0 ml-0.5"
                          aria-label="Unassign"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}

                    {/* Assigned chores */}
                    {dayChoreAssignments.map(assignment => {
                      const chore = choreSchedules.find(c => c.id === assignment.choreId)
                      if (!chore) return null
                      const isDone = chore.lastDone === dateStr
                      return (
                        <div
                          key={assignment.id}
                          className={`flex items-start gap-1 px-1.5 py-1 rounded-lg group transition-colors ${
                            isDone
                              ? 'bg-success/5 opacity-50'
                              : 'bg-white/4 hover:bg-white/6'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (!isDone) {
                                dispatch({ type: 'MARK_CHORE_DONE', payload: { id: chore.id, date: dateStr } })
                                toast('Chore done!', 'success')
                              }
                            }}
                            className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isDone
                                ? 'border-success/50 bg-success/15'
                                : 'border-border hover:border-success'
                            }`}
                            aria-label={isDone ? 'Done' : 'Mark done'}
                          >
                            {isDone && <Check size={7} className="text-success" />}
                          </button>
                          <span className={`flex-1 text-[11px] font-display truncate leading-tight min-w-0 ${
                            isDone ? 'line-through text-muted' : 'text-slate-300'
                          }`}>
                            {chore.title}
                          </span>
                          {!isDone && (
                            <button
                              onClick={() => unassignChore(chore.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition-all shrink-0 ml-0.5"
                              aria-label="Unassign"
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Empty state */}
                    {!workoutDay?.isRest && !hasFixed && !hasAssigned && (
                      <p className="text-[10px] text-muted font-display text-center py-3 opacity-50">free</p>
                    )}
                    {workoutDay?.isRest && !hasFixed && !hasAssigned && (
                      <p className="text-[10px] text-muted font-display text-center py-1 opacity-40">rest</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
