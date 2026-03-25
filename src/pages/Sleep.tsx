import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Moon, Sun, Trash2, Plus, Star } from 'lucide-react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { calcSleepDuration, formatDuration } from '../lib/utils'
import type { SleepLog } from '../types'

// ─── Quality stars ────────────────────────────────────────────────────────────

function QualityPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            size={14}
            className={n <= value ? 'text-warning fill-warning' : 'text-border'}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Log form ─────────────────────────────────────────────────────────────────

function SleepForm({ onSave }: { onSave: (log: Omit<SleepLog, 'id'>) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const [sleepDate, setSleepDate] = useState(yesterday)
  const [sleepTime, setSleepTime] = useState('23:30')
  const [wakeDate, setWakeDate] = useState(today)
  const [wakeTime, setWakeTime] = useState('07:30')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')

  const duration = calcSleepDuration(sleepDate, sleepTime, wakeDate, wakeTime)
  const valid = duration > 0 && duration < 24 * 60

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSave({ sleepDate, sleepTime, wakeDate, wakeTime, durationMinutes: duration, quality: quality as 1|2|3|4|5, notes: notes || undefined })
    setSleepDate(yesterday)
    setSleepTime('23:30')
    setWakeDate(today)
    setWakeTime('07:30')
    setQuality(3)
    setNotes('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-display font-semibold text-white">Log a night</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Sleep */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <Moon size={12} className="text-purple-400" />
            Bedtime
          </label>
          <input type="date" value={sleepDate} onChange={e => setSleepDate(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
          <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        </div>

        {/* Wake */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <Sun size={12} className="text-yellow-400" />
            Wake time
          </label>
          <input type="date" value={wakeDate} onChange={e => setWakeDate(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
          <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        </div>
      </div>

      {/* Duration preview */}
      <div className={`text-center py-2 rounded-lg text-sm font-mono font-semibold ${
        !valid ? 'text-danger bg-danger/10' :
        duration >= 7 * 60 ? 'text-success bg-success/10' :
        duration >= 6 * 60 ? 'text-warning bg-warning/10' :
        'text-danger bg-danger/10'
      }`}>
        {valid ? `⏱ ${formatDuration(duration)}` : 'Durée invalide'}
      </div>

      {/* Quality + notes */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-muted mb-1">Quality</p>
          <QualityPicker value={quality} onChange={setQuality} />
        </div>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
        />
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="w-full py-2 bg-accent text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-accent/80 transition-colors flex items-center justify-center gap-2">
        <Plus size={14} />
        Save
      </button>
    </form>
  )
}

// ─── 7-day chart (simple bar) ─────────────────────────────────────────────────

function SleepChart({ logs }: { logs: SleepLog[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const log = logs.find(l => l.wakeDate === d)
    return { date: d, dur: log?.durationMinutes ?? null }
  })

  const max = 9 * 60  // 9h cap for bar height

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-sm font-display font-semibold text-white mb-4">Last 7 days</h2>
      <div className="flex items-end justify-between gap-1" style={{ height: 100 }}>
        {days.map(({ date, dur }) => {
          const pct = dur ? Math.min(dur / max, 1) : 0
          const label = format(new Date(date + 'T12:00:00'), 'EEE', { locale: fr })
          const color = !dur ? '#1e2d45'
            : dur >= 7 * 60 ? '#22c55e'
            : dur >= 6 * 60 ? '#f59e0b'
            : '#ef4444'

          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-muted">
                {dur ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? dur % 60 + 'm' : ''}` : '—'}
              </span>
              <div className="w-full rounded-t-sm" style={{ height: Math.max(pct * 76, dur ? 4 : 4), background: color }} />
              <span className="text-[10px] text-muted capitalize">{label}</span>
            </div>
          )
        })}
      </div>
      {/* Reference lines legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        {[
          { color: '#22c55e', label: '≥7h' },
          { color: '#f59e0b', label: '≥6h' },
          { color: '#ef4444', label: '<6h' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            <span className="text-xs text-muted">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Log row ──────────────────────────────────────────────────────────────────

function LogRow({ log, onDelete }: { log: SleepLog; onDelete: () => void }) {
  const wakeLabel = format(new Date(log.wakeDate + 'T12:00:00'), 'EEE d MMM', { locale: fr })
  const durColor = log.durationMinutes >= 7 * 60 ? 'text-success'
    : log.durationMinutes >= 6 * 60 ? 'text-warning'
    : 'text-danger'

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl">
      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
        <Moon size={14} className="text-purple-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white capitalize">{wakeLabel}</p>
        <p className="text-xs text-muted">
          {log.sleepTime} → {log.wakeTime}
          {log.sleepDate !== log.wakeDate && ' (next day)'}
        </p>
      </div>

      <div className="text-right">
        <p className={`text-sm font-mono font-bold ${durColor}`}>
          {formatDuration(log.durationMinutes)}
        </p>
        {log.quality && (
          <div className="flex justify-end gap-0.5 mt-0.5">
            {[1,2,3,4,5].map(n => (
              <Star key={n} size={10} className={n <= (log.quality ?? 0) ? 'text-warning fill-warning' : 'text-border'} />
            ))}
          </div>
        )}
      </div>

      <button onClick={onDelete} className="text-muted hover:text-danger transition-colors shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Sleep() {
  const { sleepLogs } = useAppState()
  const dispatch = useAppDispatch()

  const sorted = useMemo(
    () => [...sleepLogs].sort((a, b) => b.wakeDate.localeCompare(a.wakeDate) || b.wakeTime.localeCompare(a.wakeTime)),
    [sleepLogs],
  )

  const stats = useMemo(() => {
    const last7 = sorted.filter(l => {
      const diff = (new Date().getTime() - new Date(l.wakeDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    })
    const avg = last7.length > 0
      ? Math.round(last7.reduce((s, l) => s + l.durationMinutes, 0) / last7.length)
      : null
    const latest = sorted[0] ?? null
    const avgQuality = last7.filter(l => l.quality).length > 0
      ? (last7.reduce((s, l) => s + (l.quality ?? 0), 0) / last7.filter(l => l.quality).length).toFixed(1)
      : null
    return { avg, latest, avgQuality }
  }, [sorted])

  function handleSave(log: Omit<SleepLog, 'id'>) {
    dispatch({
      type: 'ADD_SLEEP_LOG',
      payload: { ...log, id: Math.random().toString(36).slice(2) },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-white mb-0.5">Sleep</h1>
        <p className="text-muted text-sm">Sleep log · duration · quality</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted mb-1">Last night</p>
          <p className={`text-xl font-mono font-bold ${
            !stats.latest ? 'text-muted' :
            stats.latest.durationMinutes >= 7 * 60 ? 'text-success' :
            stats.latest.durationMinutes >= 6 * 60 ? 'text-warning' : 'text-danger'
          }`}>
            {stats.latest ? formatDuration(stats.latest.durationMinutes) : '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted mb-1">7-day avg.</p>
          <p className={`text-xl font-mono font-bold ${
            !stats.avg ? 'text-muted' :
            stats.avg >= 7 * 60 ? 'text-success' :
            stats.avg >= 6 * 60 ? 'text-warning' : 'text-danger'
          }`}>
            {stats.avg ? formatDuration(stats.avg) : '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted mb-1">Avg. quality</p>
          <p className="text-xl font-mono font-bold text-warning">
            {stats.avgQuality ? `${stats.avgQuality}/5` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log form */}
        <SleepForm onSave={handleSave} />

        {/* 7-day bar chart */}
        <SleepChart logs={sorted} />
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-display font-semibold text-muted mb-3">History ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">No nights logged</p>
        ) : (
          <div className="space-y-2">
            {sorted.map(log => (
              <LogRow
                key={log.id}
                log={log}
                onDelete={() => dispatch({ type: 'DELETE_SLEEP_LOG', payload: { id: log.id } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
