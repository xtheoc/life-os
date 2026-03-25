import { useState } from 'react'
import Modal from '../ui/Modal'
import { FormField, Input, Select, Textarea, SubmitRow } from '../ui/Form'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { Assignment, AssignmentType, AssignmentStatus, Priority } from '../../types'

const TYPES: AssignmentType[] = ['exam', 'assignment', 'project', 'quiz']
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent']
const STATUSES: AssignmentStatus[] = ['todo', 'in-progress', 'done']

const TYPE_STYLE: Record<AssignmentType, string> = {
  exam: 'bg-danger/20 text-danger',
  assignment: 'bg-accent/20 text-accent',
  project: 'bg-purple-500/20 text-purple-400',
  quiz: 'bg-warning/20 text-warning',
}
const PRI_STYLE: Record<Priority, string> = {
  urgent: 'bg-danger/30 text-danger',
  high: 'bg-warning/30 text-warning',
  medium: 'bg-accent/30 text-accent',
  low: 'bg-muted/30 text-muted',
}
const STATUS_STYLE: Record<AssignmentStatus, string> = {
  todo: 'bg-muted/20 text-slate-400',
  'in-progress': 'bg-warning/20 text-warning',
  done: 'bg-success/20 text-success',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  initial?: Assignment
  defaultCourseId?: string
}

export default function AssignmentModal({ isOpen, onClose, initial, defaultCourseId }: Props) {
  const { courses } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [form, setForm] = useState(() => ({
    courseId: initial?.courseId ?? defaultCourseId ?? courses[0]?.id ?? '',
    title: initial?.title ?? '',
    type: (initial?.type ?? 'assignment') as AssignmentType,
    dueDate: initial?.dueDate ?? '',
    priority: (initial?.priority ?? 'medium') as Priority,
    status: (initial?.status ?? 'todo') as AssignmentStatus,
    estimatedHours: String(initial?.estimatedHours ?? 1),
    description: initial?.description ?? '',
  }))

  const initKey = initial?.id ?? 'new'

  function reset() {
    setForm({
      courseId: initial?.courseId ?? defaultCourseId ?? courses[0]?.id ?? '',
      title: initial?.title ?? '',
      type: (initial?.type ?? 'assignment') as AssignmentType,
      dueDate: initial?.dueDate ?? '',
      priority: (initial?.priority ?? 'medium') as Priority,
      status: (initial?.status ?? 'todo') as AssignmentStatus,
      estimatedHours: String(initial?.estimatedHours ?? 1),
      description: initial?.description ?? '',
    })
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const assignment: Assignment = {
      id: initial?.id ?? uid(),
      courseId: form.courseId,
      title: form.title.trim(),
      type: form.type,
      dueDate: form.dueDate,
      priority: form.priority,
      status: form.status,
      estimatedHours: Math.max(0.5, Number(form.estimatedHours)),
      description: form.description.trim() || undefined,
    }
    dispatch({ type: initial ? 'UPDATE_ASSIGNMENT' : 'ADD_ASSIGNMENT', payload: assignment })
    toast(initial ? 'Assignment updated' : 'Assignment added', 'success')
    handleClose()
  }

  function pill<T extends string>(
    value: T,
    options: T[],
    styles: Record<T, string>,
    onChange: (v: T) => void,
    label?: (v: T) => string
  ) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {options.map(o => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-full text-xs font-display font-semibold capitalize transition-colors ${
              value === o ? styles[o] : 'bg-white/5 text-muted hover:bg-white/10'
            }`}
          >
            {label ? label(o) : o}
          </button>
        ))}
      </div>
    )
  }

  return (
    <Modal
      key={initKey}
      isOpen={isOpen}
      onClose={handleClose}
      title={initial ? 'Edit Assignment' : 'Add Assignment'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Course">
          <Select
            value={form.courseId}
            onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
            required
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Title">
          <Input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Assignment title"
            required
          />
        </FormField>

        <FormField label="Type">
          {pill(form.type, TYPES, TYPE_STYLE, v => setForm(f => ({ ...f, type: v })))}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Due Date">
            <Input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </FormField>
          <FormField label="Est. Hours">
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={form.estimatedHours}
              onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Priority">
          {pill(form.priority, PRIORITIES, PRI_STYLE, v => setForm(f => ({ ...f, priority: v })))}
        </FormField>

        <FormField label="Status">
          {pill(
            form.status,
            STATUSES,
            STATUS_STYLE,
            v => setForm(f => ({ ...f, status: v })),
            v => v.replace('-', ' ')
          )}
        </FormField>

        <FormField label="Notes (optional)">
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Any notes…"
            rows={2}
          />
        </FormField>

        <SubmitRow onCancel={handleClose} submitLabel={initial ? 'Save Changes' : 'Add Assignment'} />
      </form>
    </Modal>
  )
}
