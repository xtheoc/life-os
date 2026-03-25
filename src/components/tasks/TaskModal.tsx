import { useState } from 'react'
import Modal from '../ui/Modal'
import { FormField, Input, Textarea, SubmitRow } from '../ui/Form'
import { useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { Task, TaskCategory, Priority } from '../../types'

const CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'personal', label: 'Personal' },
  { value: 'chore', label: 'Chore' },
  { value: 'admin', label: 'Admin' },
  { value: 'errand', label: 'Errand' },
]

const CAT_ACTIVE: Record<TaskCategory, string> = {
  school: 'bg-accent/30 text-accent',
  personal: 'bg-purple-500/30 text-purple-400',
  chore: 'bg-slate-500/30 text-slate-300',
  admin: 'bg-orange-500/30 text-orange-400',
  errand: 'bg-emerald-500/30 text-emerald-400',
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const PRI_ACTIVE: Record<Priority, string> = {
  low: 'bg-muted/30 text-muted',
  medium: 'bg-accent/30 text-accent',
  high: 'bg-warning/30 text-warning',
  urgent: 'bg-danger/30 text-danger',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  initial?: Task
  defaultCategory?: TaskCategory
}

export default function TaskModal({ isOpen, onClose, initial, defaultCategory }: Props) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [form, setForm] = useState(() => ({
    title: initial?.title ?? '',
    category: (initial?.category ?? defaultCategory ?? 'personal') as TaskCategory,
    priority: (initial?.priority ?? 'medium') as Priority,
    dueDate: initial?.dueDate ?? '',
    estimatedMinutes: String(initial?.estimatedMinutes ?? ''),
    notes: initial?.notes ?? '',
  }))

  function reset() {
    setForm({
      title: initial?.title ?? '',
      category: (initial?.category ?? defaultCategory ?? 'personal') as TaskCategory,
      priority: (initial?.priority ?? 'medium') as Priority,
      dueDate: initial?.dueDate ?? '',
      estimatedMinutes: String(initial?.estimatedMinutes ?? ''),
      notes: initial?.notes ?? '',
    })
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const task: Task = {
      id: initial?.id ?? uid(),
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : undefined,
      notes: form.notes.trim() || undefined,
      completed: initial?.completed ?? false,
      completedAt: initial?.completedAt,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    dispatch({ type: initial ? 'UPDATE_TASK' : 'ADD_TASK', payload: task })
    toast(initial ? 'Task updated' : 'Task added', 'success')
    handleClose()
  }

  return (
    <Modal
      key={initial?.id ?? 'new'}
      isOpen={isOpen}
      onClose={handleClose}
      title={initial ? 'Edit Task' : 'Add Task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Title">
          <Input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What needs to be done?"
            required
            autoFocus
          />
        </FormField>

        <FormField label="Category">
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, category: c.value }))}
                className={`px-3 py-1 rounded-full text-xs font-display font-semibold transition-colors ${
                  form.category === c.value ? CAT_ACTIVE[c.value] : 'bg-white/5 text-muted hover:bg-white/10'
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Priority">
          <div className="flex gap-1.5">
            {PRIORITIES.map(p => (
              <button key={p} type="button"
                onClick={() => setForm(f => ({ ...f, priority: p }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-display font-semibold capitalize transition-colors ${
                  form.priority === p ? PRI_ACTIVE[p] : 'bg-white/5 text-muted hover:bg-white/10'
                }`}>
                {p}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Due Date">
            <Input type="date" value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </FormField>
          <FormField label="Est. Minutes" hint="e.g. 30, 90">
            <Input type="number" min={5} step={5} value={form.estimatedMinutes}
              onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))}
              placeholder="30" />
          </FormField>
        </div>

        <FormField label="Notes (optional)">
          <Textarea value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any context…" rows={2} />
        </FormField>

        <SubmitRow onCancel={handleClose} submitLabel={initial ? 'Save Changes' : 'Add Task'} />
      </form>
    </Modal>
  )
}
