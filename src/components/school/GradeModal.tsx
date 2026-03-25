import { useState } from 'react'
import { format } from 'date-fns'
import Modal from '../ui/Modal'
import { FormField, Input, Select, SubmitRow } from '../ui/Form'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { Grade, GradeCategory } from '../../types'

const CATEGORIES: GradeCategory[] = ['continuous', 'final']
const CAT_STYLE: Record<GradeCategory, string> = {
  continuous: 'bg-accent/30 text-accent',
  final: 'bg-purple-500/30 text-purple-400',
}

interface Props {
  isOpen: boolean
  onClose: () => void
  initial?: Grade
  defaultCourseId?: string
}

export default function GradeModal({ isOpen, onClose, initial, defaultCourseId }: Props) {
  const { courses } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [form, setForm] = useState(() => ({
    courseId: initial?.courseId ?? defaultCourseId ?? courses[0]?.id ?? '',
    title: initial?.title ?? '',
    score: String(initial?.score ?? ''),
    maxScore: String(initial?.maxScore ?? 20),
    category: (initial?.category ?? 'continuous') as GradeCategory,
    date: initial?.date ?? format(new Date(), 'yyyy-MM-dd'),
  }))

  const initKey = initial?.id ?? 'new'

  function reset() {
    setForm({
      courseId: initial?.courseId ?? defaultCourseId ?? courses[0]?.id ?? '',
      title: initial?.title ?? '',
      score: String(initial?.score ?? ''),
      maxScore: String(initial?.maxScore ?? 20),
      category: (initial?.category ?? 'continuous') as GradeCategory,
      date: initial?.date ?? format(new Date(), 'yyyy-MM-dd'),
    })
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const grade: Grade = {
      id: initial?.id ?? uid(),
      courseId: form.courseId,
      title: form.title.trim(),
      score: Number(form.score),
      maxScore: Number(form.maxScore),
      category: form.category,
      date: form.date,
    }
    dispatch({ type: initial ? 'UPDATE_GRADE' : 'ADD_GRADE', payload: grade })
    toast(initial ? 'Grade updated' : 'Grade added', 'success')
    handleClose()
  }

  const score = Number(form.score)
  const max = Number(form.maxScore)
  const norm = max > 0 && form.score !== '' ? (score / max * 20).toFixed(1) : null

  return (
    <Modal
      key={initKey}
      isOpen={isOpen}
      onClose={handleClose}
      title={initial ? 'Edit Grade' : 'Add Grade'}
      size="sm"
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
            placeholder="CC1 – Analyse"
            required
          />
        </FormField>

        <FormField label="Category">
          <div className="flex gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-display font-semibold capitalize transition-colors ${
                  form.category === c ? CAT_STYLE[c] : 'bg-white/5 text-muted hover:bg-white/10'
                }`}
              >
                {c === 'continuous' ? 'CC' : 'Final exam'}
              </button>
            ))}
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={`Score${norm ? ` (${norm}/20)` : ''}`}>
            <Input
              type="number"
              min={0}
              max={form.maxScore}
              step={0.5}
              value={form.score}
              onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
              placeholder="0"
              required
            />
          </FormField>
          <FormField label="Out of">
            <Input
              type="number"
              min={1}
              value={form.maxScore}
              onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
            />
          </FormField>
        </div>

        <FormField label="Date">
          <Input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />
        </FormField>

        <SubmitRow onCancel={handleClose} submitLabel={initial ? 'Save Changes' : 'Add Grade'} />
      </form>
    </Modal>
  )
}
