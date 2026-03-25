import { useState } from 'react'
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Sparkles, Plus, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { uid } from '../lib/utils'
import type { ChoreSchedule } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextDueDate(c: ChoreSchedule): string {
  const base = c.lastDone
    ? format(addDays(parseISO(c.lastDone), c.frequencyDays), 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')
  return base
}

function frequencyLabel(days: number): string {
  if (days === 1) return 'Every day'
  if (days === 2) return 'Every 2 days'
  if (days === 7) return 'Once a week'
  if (days === 14) return 'Every 2 weeks'
  if (days === 30) return 'Once a month'
  return `Every ${days} days`
}

function dueStatus(nextDue: string): { label: string; cls: string } {
  const today = format(new Date(), 'yyyy-MM-dd')
  const diff = differenceInCalendarDays(parseISO(nextDue), new Date())
  if (nextDue < today) return { label: `${Math.abs(diff)}d overdue`, cls: 'text-danger font-semibold' }
  if (diff === 0) return { label: 'Today', cls: 'text-warning font-semibold' }
  if (diff === 1) return { label: 'Tomorrow', cls: 'text-warning' }
  if (diff <= 3) return { label: `In ${diff} days`, cls: 'text-slate-300' }
  return { label: format(parseISO(nextDue), 'd MMM', { locale: fr }), cls: 'text-muted' }
}

// ─── Chore form ───────────────────────────────────────────────────────────────

const PRESET_FREQUENCIES = [
  { label: 'Every day', days: 1 },
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Every 4 days', days: 4 },
  { label: '2× per week', days: 4 },
  { label: 'Once a week', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Once a month', days: 30 },
]

interface ChoreForm {
  title: string
  frequencyDays: number
  customDays: string
  useCustom: boolean
  durationMinutes: string
}

function ChoreFormPanel({ initial, onSave, onCancel }: {
  initial?: ChoreSchedule
  onSave: (data: { title: string; frequencyDays: number; durationMinutes?: number }) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ChoreForm>(() => {
    const presetMatch = PRESET_FREQUENCIES.find(p => p.days === initial?.frequencyDays)
    return {
      title: initial?.title ?? '',
      frequencyDays: initial?.frequencyDays ?? 7,
      customDays: String(initial?.frequencyDays ?? 7),
      useCustom: !!initial && !presetMatch,
      durationMinutes: String(initial?.durationMinutes ?? ''),
    }
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const freq = form.useCustom ? Math.max(1, Number(form.customDays)) : form.frequencyDays
    onSave({
      title: form.title.trim(),
      frequencyDays: freq,
      durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-accent/40 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-display font-semibold text-white">
        {initial ? 'Edit chore' : 'New chore'}
      </h3>

      <div>
        <label className="block text-xs text-muted mb-1.5">Chore name</label>
        <input
          autoFocus
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Vacuum, mop the floor…"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
          required
        />
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Frequency</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {PRESET_FREQUENCIES.map(p => (
            <button
              key={p.days + p.label}
              type="button"
              onClick={() => setForm(f => ({ ...f, frequencyDays: p.days, useCustom: false }))}
              className={`px-2 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
                !form.useCustom && form.frequencyDays === p.days
                  ? 'bg-accent text-white'
                  : 'bg-surface text-muted hover:text-white border border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, useCustom: true }))}
            className={`px-2 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
              form.useCustom ? 'bg-accent text-white' : 'bg-surface text-muted hover:text-white border border-border'
            }`}
          >
            Custom
          </button>
        </div>
        {form.useCustom && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Every</span>
            <input
              type="number"
              min={1}
              max={365}
              value={form.customDays}
              onChange={e => setForm(f => ({ ...f, customDays: e.target.value }))}
              className="w-20 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">days</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Estimated duration (optional)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={240}
            value={form.durationMinutes}
            onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))}
            placeholder="15"
            className="w-24 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">minutes</span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 text-sm text-muted hover:text-white bg-surface rounded-xl transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={!form.title.trim()}
          className="flex-1 py-2 text-sm font-semibold text-white bg-accent rounded-xl disabled:opacity-40 hover:bg-accent/80 transition-colors">
          {initial ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  )
}

// ─── Chore card ───────────────────────────────────────────────────────────────

function ChoreCard({ chore, onEdit, onDelete, onMarkDone }: {
  chore: ChoreSchedule
  onEdit: () => void
  onDelete: () => void
  onMarkDone: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const next = nextDueDate(chore)
  const status = dueStatus(next)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = next < today
  const isDueToday = next === today

  return (
    <div className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 ${
      isOverdue ? 'border-danger/40' : isDueToday ? 'border-warning/40' : 'border-border'
    }`}>
      <button
        onClick={onMarkDone}
        title="Mark as done"
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isOverdue || isDueToday
            ? 'bg-warning/15 text-warning hover:bg-warning/30'
            : 'bg-white/5 text-muted hover:bg-white/10 hover:text-slate-200'
        }`}
      >
        <CheckCircle2 size={16} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-medium text-slate-200 truncate">{chore.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted font-display">{frequencyLabel(chore.frequencyDays)}</span>
          {chore.durationMinutes && (
            <span className="text-[11px] text-muted font-mono flex items-center gap-0.5">
              <Clock size={9} /> {chore.durationMinutes}min
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-[11px] font-mono ${status.cls}`}>
            Next: {status.label}
          </span>
          {chore.lastDone && (
            <span className="text-[11px] text-muted font-mono">
              Done {format(parseISO(chore.lastDone), 'd MMM', { locale: fr })}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {confirmDel ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-display">
            <button onClick={onDelete} className="text-danger hover:underline">Yes</button>
            <button onClick={() => setConfirmDel(false)} className="text-muted hover:underline">No</button>
          </span>
        ) : (
          <>
            <button onClick={onEdit} className="p-1.5 text-muted hover:text-slate-200 hover:bg-white/5 rounded transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => setConfirmDel(true)} className="p-1.5 text-muted hover:text-danger hover:bg-white/5 rounded transition-colors">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Chores() {
  const { choreSchedules } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreSchedule | undefined>()

  const today = format(new Date(), 'yyyy-MM-dd')

  // Sort: overdue first, then by next due date
  const sorted = [...choreSchedules].sort((a, b) => {
    const na = nextDueDate(a)
    const nb = nextDueDate(b)
    return na.localeCompare(nb)
  })

  const overdueCount = sorted.filter(c => nextDueDate(c) < today).length
  const dueTodayCount = sorted.filter(c => nextDueDate(c) === today).length

  function handleSave(data: { title: string; frequencyDays: number; durationMinutes?: number }) {
    if (editingChore) {
      dispatch({ type: 'UPDATE_CHORE_SCHEDULE', payload: { ...editingChore, ...data } })
      toast('Chore updated', 'success')
    } else {
      dispatch({ type: 'ADD_CHORE_SCHEDULE', payload: { id: uid(), ...data, active: true } })
      toast('Chore added', 'success')
    }
    setShowForm(false)
    setEditingChore(undefined)
  }

  function handleEdit(chore: ChoreSchedule) {
    setEditingChore(chore)
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingChore(undefined)
  }

  function handleMarkDone(chore: ChoreSchedule) {
    dispatch({ type: 'MARK_CHORE_DONE', payload: { id: chore.id, date: today } })
    toast(`✓ ${chore.title}`, 'success')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-0.5">Chores</h1>
          <p className="text-muted text-sm">
            {choreSchedules.length} task{choreSchedules.length !== 1 ? 's' : ''}
            {overdueCount > 0 && <span className="ml-2 text-danger font-semibold">· {overdueCount} overdue</span>}
            {dueTodayCount > 0 && <span className="ml-2 text-warning font-semibold">· {dueTodayCount} today</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditingChore(undefined); setShowForm(true) }}
          className="flex items-center gap-2 bg-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
        >
          <Plus size={15} /> Add
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <ChoreFormPanel
            initial={editingChore}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}

      {sorted.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <Sparkles size={36} className="mx-auto text-muted mb-3" />
          <p className="font-display font-semibold text-slate-300 mb-1">No chores scheduled</p>
          <p className="text-muted text-sm">Click "Add" to create your first chore.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(chore => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              onEdit={() => handleEdit(chore)}
              onDelete={() => { dispatch({ type: 'DELETE_CHORE_SCHEDULE', payload: { id: chore.id } }); toast('Chore deleted', 'success') }}
              onMarkDone={() => handleMarkDone(chore)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
