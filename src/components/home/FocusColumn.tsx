import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, ArrowRight, ListChecks } from 'lucide-react'
import { format } from 'date-fns'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { ChoreSchedule } from '../../types'

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function nextDue(c: ChoreSchedule): string {
  if (c.lastDone) {
    const base = new Date(c.lastDone + 'T12:00:00')
    base.setDate(base.getDate() + c.frequencyDays)
    return base.toISOString().slice(0, 10)
  }
  return format(new Date(), 'yyyy-MM-dd')
}

interface Props {
  taskInputRef: React.RefObject<HTMLInputElement>
}

export default function FocusColumn({ taskInputRef }: Props) {
  const { tasks, choreSchedules } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [input, setInput] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  // Tasks due today or overdue
  const dueTasks = [...tasks].filter(t => !t.completed && t.dueDate && t.dueDate <= today)
  // High/urgent tasks with no due date, to fill remaining slots
  const undatedUrgent = [...tasks].filter(
    t => !t.completed && !t.dueDate && (t.priority === 'urgent' || t.priority === 'high')
  )
  const focusTasks = [...dueTasks, ...undatedUrgent]
    .sort((a, b) => {
      const aOv = a.dueDate && a.dueDate < today ? -1 : 0
      const bOv = b.dueDate && b.dueDate < today ? -1 : 0
      if (aOv !== bOv) return aOv - bOv
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    })
    .slice(0, 5)

  const dueChores = choreSchedules
    .filter(c => c.active && nextDue(c) <= today)
    .sort((a, b) => nextDue(a).localeCompare(nextDue(b)))
    .slice(0, 3)

  function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = input.trim()
    if (!title) return
    dispatch({
      type: 'ADD_TASK',
      payload: { id: uid(), title, category: 'personal', priority: 'medium', completed: false, createdAt: new Date().toISOString() },
    })
    toast('Task added', 'success')
    setInput('')
  }

  const empty = focusTasks.length === 0 && dueChores.length === 0

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <ListChecks size={15} className="text-muted" />
        <span className="font-display font-semibold text-sm text-slate-200">Focus</span>
      </div>

      {/* Quick-add */}
      <form onSubmit={quickAdd} className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <input
          ref={taskInputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-muted outline-none font-display"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-1 rounded text-muted hover:text-accent transition-colors disabled:opacity-30"
          aria-label="Add task"
        >
          <Plus size={15} />
        </button>
      </form>

      <div className="flex-1 px-2 py-2">
        {empty ? (
          <div className="py-6 text-center">
            <p className="font-display font-semibold text-success text-sm">All clear!</p>
            <p className="text-muted text-xs mt-0.5">Nothing due today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tasks */}
            {focusTasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider">Tasks</span>
                  <Link to="/tasks" className="text-[10px] text-accent hover:text-blue-400 font-display flex items-center gap-0.5 transition-colors">
                    All <ArrowRight size={10} />
                  </Link>
                </div>
                <ul className="space-y-0.5">
                  {focusTasks.map(t => (
                    <li key={t.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/4 transition-colors">
                      <button
                        onClick={() => {
                          dispatch({ type: 'TOGGLE_TASK', payload: { id: t.id } })
                          toast('Task done!', 'success')
                        }}
                        className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 hover:border-accent transition-colors"
                        aria-label="Complete"
                      >
                        <Check size={10} className="text-success opacity-0 hover:opacity-100" />
                      </button>
                      <span className="flex-1 text-sm text-slate-200 font-display truncate">{t.title}</span>
                      {t.dueDate == null
                        ? <span className="text-[10px] font-mono text-muted shrink-0">{t.priority}</span>
                        : t.dueDate < today
                          ? <span className="text-[10px] font-mono text-danger shrink-0">overdue</span>
                          : <span className="text-[10px] font-mono text-warning shrink-0">today</span>
                      }
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Chores */}
            {dueChores.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-display font-semibold text-muted uppercase tracking-wider">Chores</span>
                  <Link to="/chores" className="text-[10px] text-accent hover:text-blue-400 font-display flex items-center gap-0.5 transition-colors">
                    All <ArrowRight size={10} />
                  </Link>
                </div>
                <ul className="space-y-0.5">
                  {dueChores.map(c => (
                    <li key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/4 transition-colors">
                      <button
                        onClick={() => {
                          dispatch({ type: 'MARK_CHORE_DONE', payload: { id: c.id, date: today } })
                          toast('Chore done!', 'success')
                        }}
                        className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 hover:border-success transition-colors"
                        aria-label="Mark done"
                      >
                        <Check size={10} className="text-success opacity-0 hover:opacity-100" />
                      </button>
                      <span className="flex-1 text-sm text-slate-200 font-display truncate">{c.title}</span>
                      {nextDue(c) < today && (
                        <span className="text-[10px] font-mono text-danger shrink-0">overdue</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
