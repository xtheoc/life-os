import { useState, useEffect } from 'react'
import {
  Dumbbell, Plus, Trash2, X, Flame, Scale,
  TrendingUp, AlertTriangle, BarChart2, Calendar,
  LayoutGrid, ChevronDown,
} from 'lucide-react'
import {
  format, parseISO, startOfWeek,
} from 'date-fns'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { uid } from '../lib/utils'
import {
  computeStreak, estimated1RM, sessionBest1RM, sessionVolume,
  allExerciseNames, isStagnating,
} from '../lib/workoutUtils'
import type {
  WorkoutDay, WorkoutSession, BodyweightLog, DayOfWeek,
  WorkoutProgram, WorkoutExerciseTarget,
} from '../types'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a2235', border: '1px solid #1e2d45',
      borderRadius: 8, padding: '8px 12px',
      fontSize: 12, fontFamily: 'DM Mono, monospace',
    }}>
      <p style={{ color: '#64748b', marginBottom: 4 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color ?? '#94a3b8' }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  )
}

const AXIS_PROPS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false }
const GRID_PROPS = { strokeDasharray: '3 3', stroke: '#1e2d45' }

// ─── Plan Tab ─────────────────────────────────────────────────────────────────

function PlanTab() {
  const { workoutPlan } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [local, setLocal] = useState<WorkoutDay[]>(() =>
    Array.from({ length: 7 }, (_, i) => {
      const dow = i as DayOfWeek
      return workoutPlan.days.find(d => d.dayOfWeek === dow)
        ?? { dayOfWeek: dow, label: '', isRest: true }
    })
  )

  const todayDow = new Date().getDay()

  function updateDay(dow: DayOfWeek, changes: Partial<WorkoutDay>) {
    setLocal(days => days.map(d => d.dayOfWeek === dow ? { ...d, ...changes } : d))
  }

  function save() {
    dispatch({ type: 'SET_WORKOUT_PLAN', payload: { days: local } })
    toast('Workout plan saved', 'success')
  }

  return (
    <div>
      <p className="text-muted text-sm mb-4 font-display">
        Toggle rest/active for each day and label your workout split.
      </p>
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max xl:grid xl:grid-cols-7 xl:min-w-0">
          {local.map(day => (
            <div key={day.dayOfWeek}
              className={`flex flex-col gap-2 p-3 rounded-xl border min-w-[110px] xl:min-w-0 transition-colors ${
                day.dayOfWeek === todayDow
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border bg-card'
              }`}>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs font-display font-bold ${
                  day.dayOfWeek === todayDow ? 'text-accent' : 'text-muted'
                }`}>
                  {DAY_SHORT[day.dayOfWeek]}
                </span>
                <button
                  onClick={() => updateDay(day.dayOfWeek, { isRest: !day.isRest })}
                  className={`text-[10px] font-display font-semibold px-1.5 py-0.5 rounded transition-colors ${
                    day.isRest
                      ? 'bg-muted/20 text-muted hover:bg-muted/30'
                      : 'bg-success/20 text-success hover:bg-success/30'
                  }`}>
                  {day.isRest ? 'Rest' : 'On'}
                </button>
              </div>
              {!day.isRest && (
                <input
                  value={day.label}
                  onChange={e => updateDay(day.dayOfWeek, { label: e.target.value })}
                  placeholder="Push, Pull…"
                  className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder-muted/50 border-b border-border focus:border-accent transition-colors pb-1 font-display"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <button onClick={save}
        className="mt-5 bg-accent hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-display font-semibold transition-colors">
        Save Plan
      </button>
    </div>
  )
}

// ─── Programs Tab ─────────────────────────────────────────────────────────────

const DEFAULT_PROGRAMS: Omit<WorkoutProgram, 'id'>[] = [
  {
    name: 'A – Push',
    exercises: [
      { name: 'Bench Press', sets: 3, reps: '5', notes: 'Focus on full ROM' },
      { name: 'Overhead Press', sets: 3, reps: '5' },
      { name: 'Incline DB Press', sets: 3, reps: '8–12' },
      { name: 'Lateral Raises', sets: 3, reps: '15–20' },
      { name: 'Tricep Pushdown', sets: 3, reps: '12–15' },
    ],
  },
  {
    name: 'B – Pull + Legs',
    exercises: [
      { name: 'Back Squat', sets: 3, reps: '5' },
      { name: 'Deadlift', sets: 2, reps: '4' },
      { name: 'Barbell Row', sets: 3, reps: '6–8' },
      { name: 'Pull-ups', sets: 3, reps: '6–10' },
      { name: 'Barbell Curl', sets: 3, reps: '8–12' },
      { name: 'Leg Press', sets: 3, reps: '10' },
    ],
  },
]

function ProgramCard({ program }: { program: WorkoutProgram }) {
  const dispatch = useAppDispatch()

  function updateProgram(updated: WorkoutProgram) {
    dispatch({ type: 'UPDATE_WORKOUT_PROGRAM', payload: updated })
  }

  function updateName(name: string) {
    updateProgram({ ...program, name })
  }

  function updateExercise(idx: number, field: keyof WorkoutExerciseTarget, value: string | number) {
    const exercises = program.exercises.map((ex, i) =>
      i === idx ? { ...ex, [field]: value } : ex
    )
    updateProgram({ ...program, exercises })
  }

  function removeExercise(idx: number) {
    updateProgram({ ...program, exercises: program.exercises.filter((_, i) => i !== idx) })
  }

  function addExercise() {
    updateProgram({
      ...program,
      exercises: [...program.exercises, { name: '', sets: 3, reps: '8–12' }],
    })
  }

  const isA = program.name.startsWith('A')
  const badgeColor = isA ? 'bg-accent/20 text-accent border-accent/30' : 'bg-success/20 text-success border-success/30'

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-border ${isA ? 'bg-accent/5' : 'bg-success/5'}`}>
        <span className={`text-xs font-display font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
          {isA ? 'A' : 'B'}
        </span>
        <input
          value={program.name}
          onChange={e => updateName(e.target.value)}
          className="flex-1 bg-transparent text-sm font-display font-bold text-slate-200 outline-none border-b border-transparent focus:border-border transition-colors"
        />
      </div>

      {/* Exercise list */}
      <div className="p-3 space-y-2 flex-1">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_3rem_5rem_1fr_1.5rem] gap-2 px-1">
          <span className="text-[10px] font-display text-muted uppercase tracking-wider">Exercise</span>
          <span className="text-[10px] font-display text-muted uppercase tracking-wider text-center">Sets</span>
          <span className="text-[10px] font-display text-muted uppercase tracking-wider text-center">Reps</span>
          <span className="text-[10px] font-display text-muted uppercase tracking-wider">Notes</span>
          <span />
        </div>

        {program.exercises.map((ex, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_3rem_5rem_1fr_1.5rem] gap-2 items-center">
            <input
              value={ex.name}
              onChange={e => updateExercise(idx, 'name', e.target.value)}
              placeholder="Exercise"
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-display"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={ex.sets}
              onChange={e => updateExercise(idx, 'sets', Number(e.target.value))}
              className="bg-surface border border-border rounded px-1 py-1 text-xs font-mono text-slate-200 outline-none focus:border-accent transition-colors text-center"
            />
            <input
              value={ex.reps}
              onChange={e => updateExercise(idx, 'reps', e.target.value)}
              placeholder="5"
              className="bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors"
            />
            <input
              value={ex.notes ?? ''}
              onChange={e => updateExercise(idx, 'notes', e.target.value)}
              placeholder="optional note"
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-slate-400 placeholder-muted outline-none focus:border-accent transition-colors font-display"
            />
            <button
              onClick={() => removeExercise(idx)}
              className="p-0.5 text-muted hover:text-danger transition-colors flex items-center justify-center">
              <X size={12} />
            </button>
          </div>
        ))}

        <button
          onClick={addExercise}
          className="flex items-center gap-1 text-xs text-accent hover:text-blue-400 font-display transition-colors mt-1 pt-1">
          <Plus size={12} /> Add exercise
        </button>
      </div>
    </div>
  )
}

function ProgramsTab() {
  const { workoutPrograms } = useAppState()
  const dispatch = useAppDispatch()

  function createDefaults() {
    const programs: WorkoutProgram[] = DEFAULT_PROGRAMS.map(p => ({ ...p, id: uid() }))
    dispatch({ type: 'SET_WORKOUT_PROGRAMS', payload: programs })
  }

  if (workoutPrograms.length === 0) {
    return (
      <div className="text-center py-16 max-w-lg mx-auto">
        <LayoutGrid size={32} className="mx-auto text-muted mb-3" />
        <p className="font-display font-semibold text-slate-300 mb-1">No programs set up yet</p>
        <p className="text-muted text-sm mb-5">
          Programs define which exercises you do on Program A vs Program B. You alternate A/B/A/B each session.
        </p>
        <button
          onClick={createDefaults}
          className="bg-accent hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-display font-semibold transition-colors">
          Set up default programs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm font-display">
        You alternate A / B / A / B… across sessions. Edit exercises, sets, and rep targets below — changes save immediately.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {workoutPrograms.map(p => (
          <ProgramCard key={p.id} program={p} />
        ))}
      </div>
    </div>
  )
}

// ─── Log Tab ──────────────────────────────────────────────────────────────────

type SetForm = { weight: string; reps: string; unit: 'kg' | 'lb' }
type ExForm = { name: string; sets: SetForm[] }
type SForm = { label: string; durationMinutes: string; notes: string; exercises: ExForm[] }

function emptySession(label = ''): SForm {
  return { label, durationMinutes: '', notes: '', exercises: [] }
}

function sessionToForm(s: WorkoutSession, unit: 'kg' | 'lb'): SForm {
  return {
    label: s.label,
    durationMinutes: String(s.durationMinutes ?? ''),
    notes: s.notes ?? '',
    exercises: s.exercises.map(e => ({
      name: e.name,
      sets: e.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps), unit: set.unit ?? unit })),
    })),
  }
}

/** Determine which program is next: even session count → A, odd → B */
function detectNextProgram(sessions: WorkoutSession[]): 'A' | 'B' {
  return sessions.length % 2 === 0 ? 'A' : 'B'
}

function LogTab() {
  const { workoutSessions, workoutPlan, workoutPrograms, preferences } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const unit = preferences.weightUnit
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayDow = new Date().getDay() as DayOfWeek
  const planLabel = workoutPlan.days.find(d => d.dayOfWeek === todayDow && !d.isRest)?.label ?? ''

  const nextProgram = detectNextProgram(workoutSessions)
  const sessionNumber = workoutSessions.length + 1
  const programDef = workoutPrograms.find(p =>
    nextProgram === 'A' ? p.name.startsWith('A') : p.name.startsWith('B')
  ) ?? null

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const existing = workoutSessions.find(s => s.date === selectedDate)
  const [form, setForm] = useState<SForm>(() =>
    existing ? sessionToForm(existing, unit) : emptySession(planLabel)
  )
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    const s = workoutSessions.find(s => s.date === selectedDate)
    setForm(s ? sessionToForm(s, unit) : emptySession(
      selectedDate === todayStr ? planLabel : ''
    ))
    setDeleteConfirm(false)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const exNames = allExerciseNames(workoutSessions)

  function addExercise() {
    setForm(f => ({
      ...f,
      exercises: [...f.exercises, { name: '', sets: [{ weight: '', reps: '', unit }] }],
    }))
  }

  function removeExercise(ei: number) {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ei) }))
  }

  function updateEx(ei: number, name: string) {
    setForm(f => ({ ...f, exercises: f.exercises.map((e, i) => i === ei ? { ...e, name } : e) }))
  }

  function addSet(ei: number) {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) => {
        if (i !== ei) return e
        const prev = e.sets[e.sets.length - 1]
        return { ...e, sets: [...e.sets, prev ? { ...prev } : { weight: '', reps: '', unit }] }
      }),
    }))
  }

  function removeSet(ei: number, si: number) {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }),
    }))
  }

  function updateSet(ei: number, si: number, field: 'weight' | 'reps', value: string) {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) =>
        i !== ei ? e : {
          ...e,
          sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: value }),
        }
      ),
    }))
  }

  /** Load template from programDef, pre-filling weights from last matching session */
  function loadTemplate() {
    if (!programDef) return

    // Find the last session tagged with the same program letter
    const lastMatchingSession = [...workoutSessions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find(s => s.program === nextProgram)

    const exercises: ExForm[] = programDef.exercises.map(target => {
      // Try to find matching exercise in last session
      const lastEx = lastMatchingSession?.exercises.find(
        e => e.name.toLowerCase() === target.name.toLowerCase()
      )

      if (lastEx && lastEx.sets.length > 0) {
        // Pre-fill from last session sets
        return {
          name: target.name,
          sets: lastEx.sets.map(s => ({
            weight: String(s.weight),
            reps: String(s.reps),
            unit: s.unit ?? unit,
          })),
        }
      }

      // No previous data — create empty sets per target
      const emptySets: SetForm[] = Array.from({ length: target.sets }, () => ({
        weight: '',
        reps: '',
        unit,
      }))
      return { name: target.name, sets: emptySets }
    })

    setForm(f => ({
      ...f,
      label: programDef.name,
      exercises,
    }))
  }

  /** Check if user completed all target reps in the last matching session for an exercise */
  function shouldSuggestIncrease(exerciseName: string): boolean {
    if (!programDef) return false
    const target = programDef.exercises.find(
      e => e.name.toLowerCase() === exerciseName.toLowerCase()
    )
    if (!target) return false

    const lastMatchingSession = [...workoutSessions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find(s => s.program === nextProgram)
    if (!lastMatchingSession) return false

    const lastEx = lastMatchingSession.exercises.find(
      e => e.name.toLowerCase() === exerciseName.toLowerCase()
    )
    if (!lastEx) return false

    // Parse target reps (take the lower bound for range like "8–12")
    const targetRepsStr = target.reps.split(/[–\-]/)[0].trim()
    const targetReps = parseInt(targetRepsStr, 10)
    if (isNaN(targetReps)) return false

    // All sets completed target reps
    return lastEx.sets.every(s => s.reps >= targetReps)
  }

  function applyIncrease(ei: number) {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) => {
        if (i !== ei) return e
        return {
          ...e,
          sets: e.sets.map(s => ({
            ...s,
            weight: s.weight !== '' ? String(Number(s.weight) + 2.5) : '',
          })),
        }
      }),
    }))
  }

  function buildSession(): WorkoutSession {
    return {
      id: existing?.id ?? uid(),
      date: selectedDate,
      label: form.label.trim(),
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
      notes: form.notes.trim() || undefined,
      program: selectedDate === todayStr ? nextProgram : existing?.program,
      exercises: form.exercises
        .filter(e => e.name.trim())
        .map(e => ({
          name: e.name.trim(),
          sets: e.sets
            .filter(s => s.weight !== '' && s.reps !== '')
            .map(s => ({ weight: Number(s.weight), reps: Number(s.reps), unit: s.unit })),
        }))
        .filter(e => e.sets.length > 0),
    }
  }

  function save() {
    const session = buildSession()
    dispatch({ type: existing ? 'UPDATE_WORKOUT_SESSION' : 'ADD_WORKOUT_SESSION', payload: session })
    toast(existing ? 'Session updated' : 'Session logged', 'success')
  }

  function deleteSession() {
    if (!existing) return
    dispatch({ type: 'DELETE_WORKOUT_SESSION', payload: { id: existing.id } })
    setForm(emptySession(selectedDate === todayStr ? planLabel : ''))
    setDeleteConfirm(false)
    toast('Session deleted', 'success')
  }

  const isToday = selectedDate === todayStr

  return (
    <div className="max-w-2xl space-y-4">
      {/* TODAY'S PROGRAM banner — show only for today's date */}
      {isToday && !existing && (
        <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 flex-wrap ${
          nextProgram === 'A'
            ? 'bg-accent/10 border-accent/30'
            : 'bg-success/10 border-success/30'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-display font-bold px-2 py-0.5 rounded border ${
              nextProgram === 'A'
                ? 'bg-accent/20 text-accent border-accent/30'
                : 'bg-success/20 text-success border-success/30'
            }`}>
              Program {nextProgram}
            </span>
            <span className="font-display font-semibold text-slate-200 text-sm">
              {programDef?.name ?? `Program ${nextProgram}`}
            </span>
            <span className="text-[11px] font-mono text-muted">Session #{sessionNumber}</span>
          </div>
          {programDef && (
            <button
              onClick={loadTemplate}
              className="flex items-center gap-1.5 text-xs font-display font-semibold bg-card border border-border hover:border-slate-500 px-3 py-1.5 rounded-lg text-slate-300 transition-colors">
              <ChevronDown size={12} /> Load program template
            </button>
          )}
        </div>
      )}

      {/* Date + meta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2">
          <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">Date</label>
          <input type="date" value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent transition-colors font-mono" />
        </div>
        <div>
          <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">Label</label>
          <input value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Push, Pull, Legs…"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-display" />
        </div>
        <div>
          <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">Duration (min)</label>
          <input type="number" min={1} value={form.durationMinutes}
            onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
            placeholder="60"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-mono" />
        </div>
      </div>

      {/* Exercises */}
      <datalist id="ex-names">
        {exNames.map(n => <option key={n} value={n} />)}
      </datalist>

      {form.exercises.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-xl">
          <Dumbbell size={22} className="mx-auto text-muted mb-2" />
          <p className="text-muted text-sm font-display">No exercises added yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {form.exercises.map((ex, ei) => {
          const canIncrease = shouldSuggestIncrease(ex.name)
          return (
            <div key={ei} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Exercise header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3 border-b border-border">
                <input
                  list="ex-names"
                  value={ex.name}
                  onChange={e => updateEx(ei, e.target.value)}
                  placeholder="Exercise name"
                  className="flex-1 bg-transparent text-sm font-display font-semibold text-slate-200 placeholder-muted outline-none"
                  autoFocus={ex.name === ''}
                />
                {canIncrease && (
                  <button
                    onClick={() => applyIncrease(ei)}
                    title="Completed all target reps last session — try +2.5kg?"
                    className="text-[10px] font-mono bg-success/15 text-success border border-success/30 hover:bg-success/25 px-2 py-0.5 rounded transition-colors">
                    +2.5kg
                  </button>
                )}
                <button onClick={() => removeExercise(ei)}
                  className="p-1 text-muted hover:text-danger transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Sets */}
              <div className="p-3 space-y-1.5">
                {ex.sets.map((set, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted font-mono w-10 shrink-0">
                      Set {si + 1}
                    </span>
                    <input
                      type="number" min={0} step={0.5}
                      value={set.weight}
                      onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                      placeholder="0"
                      className="w-16 bg-surface border border-border rounded px-2 py-1 text-sm font-mono text-slate-200 outline-none focus:border-accent text-right transition-colors"
                    />
                    <span className="text-[11px] text-muted font-mono">{unit}</span>
                    <span className="text-muted text-xs">×</span>
                    <input
                      type="number" min={1}
                      value={set.reps}
                      onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                      placeholder="0"
                      className="w-12 bg-surface border border-border rounded px-2 py-1 text-sm font-mono text-slate-200 outline-none focus:border-accent text-right transition-colors"
                    />
                    <span className="text-[11px] text-muted font-mono">reps</span>
                    {set.weight && set.reps && (
                      <span className="text-[10px] text-accent font-mono ml-1">
                        {estimated1RM(Number(set.weight), Number(set.reps)).toFixed(1)} 1RM
                      </span>
                    )}
                    <button onClick={() => removeSet(ei, si)}
                      className="ml-auto p-1 text-muted hover:text-danger transition-colors">
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button onClick={() => addSet(ei)}
                  className="flex items-center gap-1 text-[11px] text-accent hover:text-blue-400 font-display transition-colors mt-1">
                  <Plus size={11} /> Add set
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={addExercise}
        className="flex items-center gap-2 w-full justify-center py-2.5 border border-dashed border-border rounded-xl text-sm text-muted hover:text-slate-300 hover:border-slate-600 font-display transition-colors">
        <Plus size={14} /> Add Exercise
      </button>

      {/* Notes */}
      <div>
        <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">Notes</label>
        <textarea value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="How did it feel? Any notes…"
          rows={2}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-display resize-none" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={save}
          className="bg-accent hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-display font-semibold transition-colors">
          {existing ? 'Update Session' : 'Save Session'}
        </button>
        {existing && (
          deleteConfirm ? (
            <span className="flex items-center gap-2 text-sm font-display">
              <span className="text-slate-400">Delete this session?</span>
              <button onClick={deleteSession} className="text-danger hover:underline">Yes</button>
              <button onClick={() => setDeleteConfirm(false)} className="text-muted hover:underline">Cancel</button>
            </span>
          ) : (
            <button onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-danger font-display transition-colors">
              <Trash2 size={14} /> Delete
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab() {
  const { workoutSessions } = useAppState()
  const exNames = allExerciseNames(workoutSessions)
  const [selectedEx, setSelectedEx] = useState(exNames[0] ?? '')
  const [progressEx, setProgressEx] = useState(exNames[0] ?? '')

  const sorted = [...workoutSessions].sort((a, b) => a.date.localeCompare(b.date))

  const exSessions = sorted.filter(s =>
    s.exercises.some(e => e.name.toLowerCase() === selectedEx.toLowerCase())
  )

  const rm1Data = exSessions.map(s => ({
    date: format(parseISO(s.date), 'dd/MM'),
    '1RM (kg)': sessionBest1RM(s, selectedEx),
  }))

  const volumeData = sorted.slice(-12).map(s => ({
    date: format(parseISO(s.date), 'dd/MM'),
    Volume: sessionVolume(s),
    label: s.label,
  }))

  const currentRM = exSessions.length > 0
    ? sessionBest1RM(exSessions[exSessions.length - 1], selectedEx)
    : null
  const bestRM = exSessions.length > 0
    ? Math.max(...exSessions.map(s => sessionBest1RM(s, selectedEx) ?? 0))
    : null

  const stagnating = selectedEx ? isStagnating(workoutSessions, selectedEx) : false

  // Exercise progress section
  const progressSessions = sorted.filter(s =>
    s.exercises.some(e => e.name.toLowerCase() === progressEx.toLowerCase())
  )

  const progressChartData = progressSessions.map(s => {
    const best = sessionBest1RM(s, progressEx)
    return {
      date: format(parseISO(s.date), 'dd/MM'),
      program: s.program ?? null,
      'Program A': s.program === 'A' ? best : null,
      'Program B': s.program === 'B' ? best : null,
      'No tag': (!s.program) ? best : null,
    }
  })

  const progressLast5 = [...progressSessions].slice(-5).reverse().map(s => {
    const ex = s.exercises.find(e => e.name.toLowerCase() === progressEx.toLowerCase())
    const maxWeight = ex ? Math.max(...ex.sets.map(set => set.weight)) : 0
    const totalSets = ex?.sets.length ?? 0
    const totalReps = ex ? ex.sets.reduce((sum, set) => sum + set.reps, 0) : 0
    return {
      date: format(parseISO(s.date), 'dd/MM/yyyy'),
      setsReps: `${totalSets}×${Math.round(totalReps / (totalSets || 1))}`,
      weight: maxWeight,
      program: s.program,
    }
  })

  if (workoutSessions.length === 0) {
    return (
      <div className="text-center py-16">
        <BarChart2 size={32} className="mx-auto text-muted mb-3" />
        <p className="font-display font-semibold text-slate-300 mb-1">No sessions yet</p>
        <p className="text-muted text-sm">Log your first session to see progression charts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Exercise selector */}
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider shrink-0">
          Exercise
        </label>
        <select
          value={selectedEx}
          onChange={e => setSelectedEx(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent transition-colors font-display"
        >
          {exNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Stats row */}
      {selectedEx && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-1">Current 1RM</p>
            <p className="font-mono text-2xl font-bold text-white">
              {currentRM?.toFixed(1) ?? '—'}<span className="text-sm text-muted ml-1">kg</span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-1">All-time Best</p>
            <p className="font-mono text-2xl font-bold text-accent">
              {bestRM?.toFixed(1) ?? '—'}<span className="text-sm text-muted ml-1">kg</span>
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 md:col-span-1 col-span-2">
            <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-1">Sessions tracked</p>
            <p className="font-mono text-2xl font-bold text-white">{exSessions.length}</p>
          </div>
        </div>
      )}

      {/* Stagnation warning */}
      {stagnating && (
        <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />
          <p className="text-warning text-sm font-display">
            Stagnation detected on <strong>{selectedEx}</strong> — no meaningful 1RM progress in the last 3 sessions.
            Consider increasing weight, changing rep range, or varying the exercise.
          </p>
        </div>
      )}

      {/* 1RM chart */}
      {rm1Data.length >= 2 ? (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider mb-4">
            Estimated 1RM — {selectedEx}
          </h3>
          <ResponsiveContainer width="99%" height={200}>
            <LineChart data={rm1Data}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="1RM (kg)" stroke="#3b82f6"
                strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-muted text-sm font-display text-center py-4">
          Log {Math.max(0, 2 - rm1Data.length)} more session{rm1Data.length < 1 ? 's' : ''} to see the 1RM chart.
        </p>
      )}

      {/* Volume chart */}
      {volumeData.length >= 2 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider mb-4">
            Session Volume (kg × reps) — last {volumeData.length} sessions
          </h3>
          <ResponsiveContainer width="99%" height={180}>
            <BarChart data={volumeData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Volume" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Exercise Progress (A/B split) ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider shrink-0">
            Exercise Progress
          </h3>
          <select
            value={progressEx}
            onChange={e => setProgressEx(e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-accent transition-colors font-display"
          >
            {exNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] font-display text-muted">
            <span className="inline-block w-3 h-0.5 bg-accent rounded" /> Program A
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-display text-muted">
            <span className="inline-block w-3 h-0.5 bg-success rounded" /> Program B
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-display text-muted">
            <span className="inline-block w-3 h-0.5 bg-muted rounded" /> Untagged
          </span>
        </div>

        {progressChartData.length >= 2 ? (
          <ResponsiveContainer width="99%" height={200}>
            <LineChart data={progressChartData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="Program A" stroke="#3b82f6"
                strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="Program B" stroke="#22c55e"
                strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="No tag" stroke="#64748b"
                strokeWidth={2} dot={{ r: 3, fill: '#64748b' }} activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted text-sm font-display text-center py-4">
            Log more sessions with <strong className="text-slate-400">{progressEx}</strong> to see the chart.
          </p>
        )}

        {/* Last 5 sessions table */}
        {progressLast5.length > 0 && (
          <div>
            <p className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider mb-2">
              Last {progressLast5.length} sessions
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface">
                    <th className="text-left px-3 py-2 text-muted font-display font-semibold">Date</th>
                    <th className="text-center px-3 py-2 text-muted font-display font-semibold">Sets×Reps</th>
                    <th className="text-right px-3 py-2 text-muted font-display font-semibold">Max Weight</th>
                    <th className="text-center px-3 py-2 text-muted font-display font-semibold">Prog</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {progressLast5.map((row, i) => (
                    <tr key={i} className="hover:bg-white/2 transition-colors">
                      <td className="px-3 py-2 font-mono text-slate-300">{row.date}</td>
                      <td className="px-3 py-2 font-mono text-slate-200 text-center">{row.setsReps}</td>
                      <td className="px-3 py-2 font-mono text-slate-200 text-right">{row.weight} kg</td>
                      <td className="px-3 py-2 text-center">
                        {row.program ? (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            row.program === 'A'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-success/20 text-success'
                          }`}>
                            {row.program}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bodyweight Tab ───────────────────────────────────────────────────────────

function BodyweightTab() {
  const { bodyweightLogs, preferences } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const unit = preferences.weightUnit
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), weight: '' })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const sorted = [...bodyweightLogs].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1] ?? null
  const prev = sorted[sorted.length - 2] ?? null
  const delta = latest && prev ? latest.weight - prev.weight : null

  // Weigh-in reminder
  const preferredDow = preferences.weeklyWeighInDay
  const todayDow = new Date().getDay()
  let daysBack = todayDow - preferredDow
  if (daysBack < 0) daysBack += 7
  const weighInDate = format(new Date(Date.now() - daysBack * 86400000), 'yyyy-MM-dd')
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const needsWeighIn = !bodyweightLogs.some(l => l.date >= weighInDate && l.date <= todayStr)

  const chartData = sorted.map(l => ({
    date: format(parseISO(l.date), 'dd/MM'),
    Weight: l.weight,
  }))

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.weight) return
    const log: BodyweightLog = {
      id: uid(),
      date: form.date,
      weight: Number(form.weight),
      unit,
    }
    dispatch({ type: 'ADD_BODYWEIGHT_LOG', payload: log })
    toast('Weight logged', 'success')
    setForm(f => ({ ...f, weight: '' }))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Reminder */}
      {needsWeighIn && (
        <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="text-warning shrink-0" />
          <p className="text-warning text-sm font-display">Weekly weigh-in due — log your weight below.</p>
        </div>
      )}

      {/* Log form */}
      <form onSubmit={save} className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">Date</label>
          <input type="date" value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent transition-colors font-mono" />
        </div>
        <div>
          <label className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider block mb-1">
            Weight ({unit})
          </label>
          <input type="number" min={0} step={0.1} value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            placeholder="73.5" required
            className="w-28 bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-mono" />
        </div>
        <button type="submit"
          className="bg-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors">
          Log
        </button>
      </form>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <Scale size={18} className="text-muted shrink-0" />
            <div>
              <p className="text-[10px] text-muted font-display uppercase tracking-wider">Latest</p>
              <p className="font-mono text-xl font-bold text-white">
                {latest.weight}<span className="text-sm text-muted ml-1">{unit}</span>
              </p>
            </div>
          </div>
          {delta !== null && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <TrendingUp size={18} className={`shrink-0 ${delta > 0 ? 'text-danger' : delta < 0 ? 'text-success' : 'text-muted'}`} />
              <div>
                <p className="text-[10px] text-muted font-display uppercase tracking-wider">vs prev</p>
                <p className={`font-mono text-xl font-bold ${delta > 0 ? 'text-danger' : delta < 0 ? 'text-success' : 'text-muted'}`}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}<span className="text-sm ml-1">{unit}</span>
                </p>
              </div>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted font-display uppercase tracking-wider">Logs</p>
            <p className="font-mono text-xl font-bold text-white">{bodyweightLogs.length}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[11px] font-display font-semibold text-muted uppercase tracking-wider mb-4">
            Bodyweight over time
          </h3>
          <ResponsiveContainer width="99%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="date" {...AXIS_PROPS} />
              <YAxis {...AXIS_PROPS} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Weight" stroke="#22c55e"
                strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <Scale size={24} className="mx-auto text-muted mb-2" />
          <p className="text-muted text-sm font-display">Log 2+ weights to see the trend chart.</p>
        </div>
      )}

      {/* History */}
      {bodyweightLogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[11px] font-display font-semibold text-muted uppercase tracking-widest">History</span>
          </div>
          <ul className="divide-y divide-border max-h-64 overflow-y-auto">
            {[...bodyweightLogs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(l => (
                <li key={l.id} className="flex items-center px-4 py-2.5 gap-3">
                  <span className="font-mono text-xs text-muted">
                    {format(parseISO(l.date), 'dd/MM/yyyy')}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-200 ml-auto">
                    {l.weight} {l.unit}
                  </span>
                  {deleteConfirm === l.id ? (
                    <span className="flex items-center gap-1.5 text-xs font-display">
                      <button onClick={() => { dispatch({ type: 'DELETE_BODYWEIGHT_LOG', payload: { id: l.id } }); setDeleteConfirm(null) }}
                        className="text-danger hover:underline">Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-muted hover:underline">Cancel</button>
                    </span>
                  ) : (
                    <button onClick={() => setDeleteConfirm(l.id)}
                      className="p-1 text-muted hover:text-danger transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'plan' | 'programs' | 'log' | 'progress' | 'bodyweight'

const TABS: { key: Tab; label: string; icon: typeof Dumbbell }[] = [
  { key: 'plan', label: 'Plan', icon: Calendar },
  { key: 'programs', label: 'Programs', icon: LayoutGrid },
  { key: 'log', label: 'Log', icon: Dumbbell },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'bodyweight', label: 'Bodyweight', icon: Scale },
]

export default function Workout() {
  const { workoutSessions, workoutPlan, bodyweightLogs } = useAppState()
  const [tab, setTab] = useState<Tab>('log')

  const streak = computeStreak(workoutSessions, workoutPlan)
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const sessionsThisWeek = workoutSessions.filter(s => s.date >= weekStart).length
  const latestWeight = [...bodyweightLogs].sort((a, b) => b.date.localeCompare(a.date))[0]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-0.5">Workout</h1>
          <p className="text-muted text-sm">Plan, log, and track your training</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Flame size={14} className={streak > 0 ? 'text-warning' : 'text-muted'} />
              <span className="font-mono text-lg font-bold text-white">{streak}</span>
              <span className="text-[11px] text-muted font-display">streak</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end mt-0.5">
              <span className="font-mono text-sm text-slate-300">{sessionsThisWeek}</span>
              <span className="text-[11px] text-muted font-display">this week</span>
              {latestWeight && (
                <>
                  <span className="text-muted">·</span>
                  <span className="font-mono text-sm text-slate-300">{latestWeight.weight}{latestWeight.unit}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface p-1 rounded-xl w-fit border border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold whitespace-nowrap transition-colors ${
              tab === key ? 'bg-card text-white shadow-sm' : 'text-muted hover:text-slate-300'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'plan' && <PlanTab />}
      {tab === 'programs' && <ProgramsTab />}
      {tab === 'log' && <LogTab />}
      {tab === 'progress' && <ProgressTab />}
      {tab === 'bodyweight' && <BodyweightTab />}
    </div>
  )
}
