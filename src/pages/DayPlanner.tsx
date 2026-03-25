import { useState, useMemo } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, RefreshCw, Check,
  Trash2, GripVertical, Plus,
} from 'lucide-react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { generateDayPlan, BLOCK_COLORS } from '../lib/plannerUtils'
import { timeToMinutes } from '../lib/utils'
import type { PlannerBlock, BlockType } from '../types'

// ─── Block type labels ────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  morning:  'Routine',
  study:    'Étude',
  class:    'Cours',
  workout:  'Sport',
  chore:    'Corvée',
  break:    'Pause',
  free:     'Libre',
  personal: 'Personnel',
  admin:    'Admin',
  custom:   'Autre',
}

// ─── Block row ────────────────────────────────────────────────────────────────

function BlockRow({
  block,
  onToggle,
  onDelete,
}: {
  block: PlannerBlock
  onToggle: () => void
  onDelete: () => void
}) {
  const color = block.color ?? BLOCK_COLORS[block.type]
  const dur = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
  const durLabel = dur >= 60
    ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? (dur % 60) + 'm' : ''}`
    : `${dur}m`

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
      block.completed
        ? 'bg-card/40 border-border/30 opacity-60'
        : 'bg-card border-border'
    }`}>
      {/* Color bar */}
      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color }} />

      {/* Drag handle (visual only) */}
      <GripVertical size={14} className="text-border shrink-0 cursor-grab" />

      {/* Times */}
      <div className="text-right shrink-0 w-20">
        <p className="text-xs font-mono text-white">{block.startTime}</p>
        <p className="text-xs font-mono text-muted">{block.endTime}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${block.completed ? 'line-through text-muted' : 'text-white'}`}>
          {block.title}
        </p>
        <p className="text-xs text-muted">
          {BLOCK_LABELS[block.type]} · {durLabel}
        </p>
      </div>

      {/* Actions */}
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
          block.completed
            ? 'bg-success border-success text-white'
            : 'border-border hover:border-success hover:text-success text-transparent'
        }`}>
        <Check size={12} />
      </button>
      <button
        onClick={onDelete}
        className="text-muted hover:text-danger transition-colors shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Quick-add form ───────────────────────────────────────────────────────────

function QuickAdd({ date, onAdd }: { date: string; onAdd: (b: PlannerBlock) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [type, setType] = useState<BlockType>('custom')

  function handleAdd() {
    if (!title.trim()) return
    onAdd({
      id: Math.random().toString(36).slice(2),
      date,
      startTime: start,
      endTime: end,
      title: title.trim(),
      type,
      completed: false,
      color: BLOCK_COLORS[type],
    })
    setTitle('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted hover:text-accent transition-colors px-1">
        <Plus size={14} />
        Ajouter un bloc
      </button>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre du bloc…"
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
        />
        <select
          value={type}
          onChange={e => setType(e.target.value as BlockType)}
          className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent">
          {(Object.keys(BLOCK_LABELS) as BlockType[]).map(t => (
            <option key={t} value={t}>{BLOCK_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="time" value={start} onChange={e => setStart(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        <span className="text-muted text-xs">→</span>
        <input type="time" value={end} onChange={e => setEnd(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-muted hover:text-white transition-colors">
            Annuler
          </button>
          <button onClick={handleAdd} disabled={!title.trim()}
            className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg disabled:opacity-40 hover:bg-accent/80 transition-colors">
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ blocks }: { blocks: PlannerBlock[] }) {
  const total = blocks.length
  const done = blocks.filter(b => b.completed).length
  const studyMin = blocks
    .filter(b => b.type === 'study')
    .reduce((s, b) => s + timeToMinutes(b.endTime) - timeToMinutes(b.startTime), 0)

  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: 'Blocs', value: total },
        { label: 'Terminés', value: `${done}/${total}` },
        { label: 'Étude', value: studyMin >= 60 ? `${Math.floor(studyMin / 60)}h${studyMin % 60 > 0 ? (studyMin % 60) + 'm' : ''}` : `${studyMin}m` },
        { label: 'Progression', value: `${pct}%` },
      ].map(s => (
        <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-xs text-muted mb-0.5">{s.label}</p>
          <p className="text-lg font-mono font-bold text-white">{s.value}</p>
        </div>
      ))}
      <div className="col-span-4">
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DayPlanner() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [confirmRegen, setConfirmRegen] = useState(false)

  // Blocks for the current date
  const blocks = useMemo(
    () => state.plannerBlocks.filter(b => b.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state.plannerBlocks, date],
  )

  const hasBlocks = blocks.length > 0

  function generate(force = false) {
    if (hasBlocks && !force) { setConfirmRegen(true); return }
    const newBlocks = generateDayPlan({
      date,
      prefs: state.preferences,
      recurringEvents: state.recurringEvents,
      assignments: state.assignments,
      tasks: state.tasks,
      workoutPlan: state.workoutPlan,
      choreSchedules: state.choreSchedules,
    })
    dispatch({ type: 'SET_PLANNER_BLOCKS', payload: { date, blocks: newBlocks } })
    setConfirmRegen(false)
  }

  function toggleBlock(id: string) {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    dispatch({ type: 'UPDATE_PLANNER_BLOCK', payload: { ...block, completed: !block.completed } })
  }

  function deleteBlock(id: string) {
    dispatch({ type: 'DELETE_PLANNER_BLOCK', payload: { id } })
  }

  function addBlock(block: PlannerBlock) {
    // Merge into existing day blocks
    const updated = [...blocks, block].sort((a, b) => a.startTime.localeCompare(b.startTime))
    dispatch({ type: 'SET_PLANNER_BLOCKS', payload: { date, blocks: updated } })
  }

  const dateLabel = format(new Date(date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: fr })

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-white mb-0.5">Planificateur</h1>
      <p className="text-muted text-sm mb-6">Programme journalier auto-généré</p>

      {/* Date nav */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setDate(d => format(subDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'))}
          className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors">
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
          className="flex-1 py-2 text-sm font-display font-semibold text-white capitalize text-center bg-card border border-border rounded-xl hover:border-accent/50 transition-colors">
          {dateLabel}
        </button>
        <button
          onClick={() => setDate(d => format(addDays(new Date(d + 'T12:00:00'), 1), 'yyyy-MM-dd'))}
          className="p-2 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors">
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => generate(false)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
          <RefreshCw size={14} />
          {hasBlocks ? 'Regénérer' : 'Générer'}
        </button>
      </div>

      {/* Regen confirmation */}
      {confirmRegen && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-warning">Remplacer le planning existant ?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRegen(false)} className="text-xs text-muted hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-card">
              Annuler
            </button>
            <button onClick={() => generate(true)} className="text-xs text-white bg-warning rounded-lg px-3 py-1.5 hover:bg-warning/80 transition-colors">
              Remplacer
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasBlocks && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-center mb-4">
          <p className="font-display font-semibold text-slate-300 mb-1">Aucun planning</p>
          <p className="text-muted text-sm mb-4">Génère un programme basé sur tes cours, devoirs urgents et préférences.</p>
          <button
            onClick={() => generate(false)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/80 transition-colors">
            <RefreshCw size={14} />
            Générer le planning
          </button>
        </div>
      )}

      {/* Stats */}
      {hasBlocks && (
        <div className="mb-4">
          <StatsBar blocks={blocks} />
        </div>
      )}

      {/* Block list */}
      {hasBlocks && (
        <div className="space-y-2 mb-4">
          {blocks.map(block => (
            <BlockRow
              key={block.id}
              block={block}
              onToggle={() => toggleBlock(block.id)}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </div>
      )}

      {/* Quick add */}
      {hasBlocks && <QuickAdd date={date} onAdd={addBlock} />}
    </div>
  )
}
