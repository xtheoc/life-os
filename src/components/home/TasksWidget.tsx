import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, ArrowRight, Plus, Check } from 'lucide-react'
import { format } from 'date-fns'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { uid } from '../../lib/utils'
import type { Priority, TaskCategory } from '../../types'

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0, high: 1, medium: 2, low: 3,
}

const CATEGORY_BADGE: Record<TaskCategory, string> = {
  school: 'bg-accent/20 text-accent',
  personal: 'bg-purple-500/20 text-purple-400',
  chore: 'bg-slate-500/20 text-slate-400',
  admin: 'bg-orange-500/20 text-orange-400',
  errand: 'bg-emerald-500/20 text-emerald-400',
}

export default function TasksWidget() {
  const { tasks } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [input, setInput] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')

  const pending = [...tasks]
    .filter(t => !t.completed)
    .sort((a, b) => {
      // Overdue first
      const aOv = a.dueDate && a.dueDate < today ? -1 : 0
      const bOv = b.dueDate && b.dueDate < today ? -1 : 0
      if (aOv !== bOv) return aOv - bOv
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    })
    .slice(0, 6)

  const totalPending = tasks.filter(t => !t.completed).length

  function toggle(id: string) {
    dispatch({ type: 'TOGGLE_TASK', payload: { id } })
  }

  function quickAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = input.trim()
    if (!title) return
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: uid(),
        title,
        category: 'personal',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
      },
    })
    toast('Task added', 'success')
    setInput('')
  }

  return (
    <Card>
      <CardHeader
        title="Tasks & Chores"
        icon={ListChecks}
        action={
          <Link
            to="/tasks"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            All <ArrowRight size={11} />
          </Link>
        }
      />

      {/* Quick add */}
      <form onSubmit={quickAdd} className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Quick add task…"
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-muted outline-none font-display"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="p-1 rounded text-muted hover:text-accent transition-colors disabled:opacity-30"
          aria-label="Add task"
        >
          <Plus size={16} />
        </button>
      </form>

      {pending.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="font-display font-semibold text-success text-sm mb-1">All done!</p>
          <p className="text-muted text-xs">No pending tasks.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pending.map(t => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <button
                onClick={() => toggle(t.id)}
                className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 hover:border-accent transition-colors"
                aria-label="Complete task"
              >
                {t.completed && <Check size={11} className="text-success" />}
              </button>
              <span className="flex-1 text-sm text-slate-200 font-display truncate">
                {t.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.dueDate && t.dueDate <= today && (
                  <span className="font-mono text-[10px] text-danger">
                    {t.dueDate === today ? 'today' : 'overdue'}
                  </span>
                )}
                <Badge
                  label={t.category}
                  className={CATEGORY_BADGE[t.category]}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPending > 6 && (
        <div className="px-4 py-2.5 border-t border-border">
          <Link
            to="/tasks"
            className="text-xs text-muted hover:text-slate-300 font-display transition-colors"
          >
            +{totalPending - 6} more tasks →
          </Link>
        </div>
      )}
    </Card>
  )
}
