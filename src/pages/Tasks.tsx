import { useState } from 'react'
import {
  ListChecks, Plus, Check, Pencil, Trash2,
  ChevronDown, ChevronUp, Clock,
} from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { Badge } from '../components/ui/Badge'
import TaskModal from '../components/tasks/TaskModal'
import { uid } from '../lib/utils'
import type { Task, TaskCategory, Priority } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

const CAT_BADGE: Record<TaskCategory, string> = {
  school: 'bg-accent/20 text-accent',
  personal: 'bg-purple-500/20 text-purple-400',
  chore: 'bg-slate-500/20 text-slate-400',
  admin: 'bg-orange-500/20 text-orange-400',
  errand: 'bg-emerald-500/20 text-emerald-400',
}
const PRI_BADGE: Record<Priority, string> = {
  urgent: 'bg-danger/20 text-danger',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-accent/20 text-accent',
  low: 'bg-muted/20 text-muted',
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h${r}m` : `${h}h`
}

function dueLabel(dueDate: string): { text: string; cls: string } {
  const today = format(new Date(), 'yyyy-MM-dd')
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date())
  if (dueDate < today) return { text: `${Math.abs(diff)}d overdue`, cls: 'text-danger' }
  if (diff === 0) return { text: 'Today', cls: 'text-warning' }
  if (diff === 1) return { text: 'Tomorrow', cls: 'text-warning' }
  if (diff <= 7) return { text: `In ${diff}d`, cls: 'text-slate-400' }
  return { text: format(parseISO(dueDate), 'dd/MM'), cls: 'text-muted' }
}

function sortTasks(tasks: Task[]): Task[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return [...tasks].sort((a, b) => {
    const aOv = a.dueDate && a.dueDate < today ? -1 : 0
    const bOv = b.dueDate && b.dueDate < today ? -1 : 0
    if (aOv !== bOv) return aOv - bOv
    const pd = PRANK[a.priority] - PRANK[b.priority]
    if (pd !== 0) return pd
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onEdit, onDelete }: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [delConfirm, setDelConfirm] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = !task.completed && !!task.dueDate && task.dueDate < today
  const due = task.dueDate ? dueLabel(task.dueDate) : null

  return (
    <div className={`bg-card border rounded-xl px-4 py-3 transition-opacity ${
      isOverdue ? 'border-danger/30' : 'border-border'
    } ${task.completed ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border shrink-0 flex items-center justify-center transition-colors ${
            task.completed
              ? 'bg-success/20 border-success/50'
              : 'border-border hover:border-accent'
          }`}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && <Check size={11} className="text-success" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-display leading-snug ${
            task.completed ? 'line-through text-muted' : 'text-slate-200'
          }`}>
            {task.title}
          </p>
          {task.notes && !task.completed && (
            <p className="text-[11px] text-muted mt-0.5 truncate">{task.notes}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge label={task.category} className={CAT_BADGE[task.category]} />
            {task.priority !== 'medium' && (
              <Badge label={task.priority} className={PRI_BADGE[task.priority]} />
            )}
            {due && (
              <span className={`font-mono text-[11px] ${due.cls}`}>{due.text}</span>
            )}
            {task.estimatedMinutes && (
              <span className="text-[11px] text-muted font-mono flex items-center gap-0.5">
                <Clock size={9} /> {fmtMinutes(task.estimatedMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {delConfirm ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-display">
              <button onClick={onDelete} className="text-danger hover:underline">Delete</button>
              <button onClick={() => setDelConfirm(false)} className="text-muted hover:underline">Cancel</button>
            </span>
          ) : (
            <>
              <button onClick={onEdit}
                className="p-1.5 text-muted hover:text-slate-200 hover:bg-white/5 rounded transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => setDelConfirm(true)}
                className="p-1.5 text-muted hover:text-danger hover:bg-white/5 rounded transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Task List (pending + done) ───────────────────────────────────────────────

function TaskList({ tasks, emptyLabel, onToggle, onEdit, onDelete }: {
  tasks: Task[]
  emptyLabel: string
  onToggle: (id: string) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
}) {
  const [showDone, setShowDone] = useState(false)
  const dispatch = useAppDispatch()

  const pending = sortTasks(tasks.filter(t => !t.completed))
  const done = tasks.filter(t => t.completed)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
    .slice(0, 20)

  function clearCompleted() {
    done.forEach(t => dispatch({ type: 'DELETE_TASK', payload: { id: t.id } }))
  }

  return (
    <div className="space-y-2">
      {pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-10">
          <ListChecks size={28} className="mx-auto text-muted mb-2" />
          <p className="text-muted text-sm font-display">{emptyLabel}</p>
        </div>
      ) : (
        <>
          {pending.map(t => (
            <TaskRow key={t.id} task={t}
              onToggle={() => onToggle(t.id)}
              onEdit={() => onEdit(t)}
              onDelete={() => onDelete(t.id)} />
          ))}

          {done.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowDone(s => !s)}
                className="flex items-center gap-2 text-xs text-muted hover:text-slate-300 font-display transition-colors mb-2"
              >
                {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {done.length} completed
                {showDone && (
                  <button
                    onClick={e => { e.stopPropagation(); clearCompleted() }}
                    className="ml-2 flex items-center gap-1 text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 size={10} /> Clear
                  </button>
                )}
              </button>
              {showDone && (
                <div className="space-y-2">
                  {done.map(t => (
                    <TaskRow key={t.id} task={t}
                      onToggle={() => onToggle(t.id)}
                      onEdit={() => onEdit(t)}
                      onDelete={() => onDelete(t.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Quick Add ────────────────────────────────────────────────────────────────

function QuickAdd({ onAdd }: { defaultCategory: TaskCategory; onAdd: (title: string) => void }) {
  const [input, setInput] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    onAdd(input.trim())
    setInput('')
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 mb-4">
      <Plus size={15} className="text-muted shrink-0" />
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Add a task…"
        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-muted outline-none font-display"
      />
      <button type="submit" disabled={!input.trim()}
        className="text-xs text-accent hover:text-blue-400 font-display transition-colors disabled:opacity-30">
        Add
      </button>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type CatFilter = 'all' | TaskCategory

const NON_CHORE_CATS: TaskCategory[] = ['school', 'personal', 'admin', 'errand']

export default function Tasks() {
  const { tasks } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [catFilter, setCatFilter] = useState<CatFilter>('all')
  const [modal, setModal] = useState<{ open: boolean; task?: Task; defaultCat?: TaskCategory }>({ open: false })

  const today = format(new Date(), 'yyyy-MM-dd')

  function addQuick(title: string, category: TaskCategory) {
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: uid(), title, category,
        priority: 'medium', completed: false,
        createdAt: new Date().toISOString(),
      },
    })
    toast('Task added', 'success')
  }

  function toggle(id: string) { dispatch({ type: 'TOGGLE_TASK', payload: { id } }) }
  function remove(id: string) { dispatch({ type: 'DELETE_TASK', payload: { id } }); toast('Task deleted', 'success') }

  const taskTabTasks = tasks.filter(t => {
    if (catFilter === 'all') return t.category !== 'chore'
    return t.category === catFilter
  })

  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-0.5">Tasks</h1>
          <p className="text-muted text-sm">
            {tasks.filter(t => !t.completed).length} pending
            {overdueCount > 0 && <span className="ml-2 text-danger font-semibold">· {overdueCount} overdue</span>}
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true, defaultCat: 'personal' })}
          className="flex items-center gap-2 bg-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-colors ${
            catFilter === 'all' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted hover:bg-white/10 hover:text-slate-300'
          }`}>
          All
        </button>
        {NON_CHORE_CATS.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold whitespace-nowrap capitalize transition-colors ${
              catFilter === cat
                ? CAT_BADGE[cat].replace('/20', '/30')
                : 'bg-white/5 text-muted hover:bg-white/10 hover:text-slate-300'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      <QuickAdd
        defaultCategory={catFilter !== 'all' ? catFilter : 'personal'}
        onAdd={title => addQuick(title, catFilter !== 'all' ? catFilter : 'personal')}
      />

      <TaskList
        tasks={taskTabTasks}
        emptyLabel={catFilter === 'all' ? 'No tasks yet — add one above.' : `No ${catFilter} tasks.`}
        onToggle={toggle}
        onEdit={t => setModal({ open: true, task: t })}
        onDelete={remove}
      />

      <TaskModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        initial={modal.task}
        defaultCategory={modal.defaultCat}
      />
    </div>
  )
}
