import { useState } from 'react'
import Modal from '../ui/Modal'
import { FormField, Input, SubmitRow } from '../ui/Form'
import { useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { Course, UE } from '../../types'

const COLORS = [
  '#3b82f6', '#a855f7', '#22c55e', '#f59e0b',
  '#f97316', '#ec4899', '#14b8a6', '#ef4444',
]

interface Props {
  isOpen: boolean
  onClose: () => void
  initial?: Course
  ues: UE[]
}

export default function CourseModal({ isOpen, onClose, initial, ues }: Props) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [form, setForm] = useState(() => ({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    ueId: initial?.ueId ?? (ues[0]?.id ?? ''),
    coefficient: String(initial?.coefficient ?? 1),
    ccPct: String(Math.round((initial?.continuousWeight ?? 0.4) * 100)),
    color: initial?.color ?? '#3b82f6',
  }))

  const initKey = initial?.id ?? 'new'

  function reset() {
    setForm({
      name: initial?.name ?? '',
      code: initial?.code ?? '',
      ueId: initial?.ueId ?? (ues[0]?.id ?? ''),
      coefficient: String(initial?.coefficient ?? 1),
      ccPct: String(Math.round((initial?.continuousWeight ?? 0.4) * 100)),
      color: initial?.color ?? '#3b82f6',
    })
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ccW = Math.min(100, Math.max(0, Number(form.ccPct))) / 100
    const course: Course = {
      id: initial?.id ?? uid(),
      ueId: form.ueId,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      coefficient: Math.max(1, Number(form.coefficient)),
      continuousWeight: ccW,
      finalWeight: 1 - ccW,
      color: form.color,
    }
    dispatch({ type: initial ? 'UPDATE_COURSE' : 'ADD_COURSE', payload: course })
    toast(initial ? 'Matière modifiée' : 'Matière ajoutée', 'success')
    handleClose()
  }

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal
      key={initKey}
      isOpen={isOpen}
      onClose={handleClose}
      title={initial ? 'Modifier la matière' : 'Ajouter une matière'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nom">
            <Input
              value={form.name}
              onChange={e => set('name')(e.target.value)}
              placeholder="Mathématiques"
              required
            />
          </FormField>
          <FormField label="Code">
            <Input
              value={form.code}
              onChange={e => set('code')(e.target.value)}
              placeholder="MATH101"
              required
            />
          </FormField>
        </div>

        {ues.length > 0 && (
          <FormField label="Unité d'Enseignement (UE)">
            <select
              value={form.ueId}
              onChange={e => set('ueId')(e.target.value)}
              required
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              {ues.map(u => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name} (S{u.semester}, {u.credits} ECTS)
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="Coefficient dans l'UE" hint="Poids de cette matière dans l'UE">
          <Input
            type="number"
            min={1}
            max={10}
            value={form.coefficient}
            onChange={e => set('coefficient')(e.target.value)}
          />
        </FormField>

        <FormField
          label={`Contrôle continu — ${form.ccPct}% / Examen final — ${100 - Number(form.ccPct)}%`}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.ccPct}
            onChange={e => set('ccPct')(e.target.value)}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[11px] text-muted font-mono">
            <span>0% CC</span>
            <span>50/50</span>
            <span>100% CC</span>
          </div>
        </FormField>

        <FormField label="Couleur">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color')(c)}
                className={`w-7 h-7 rounded-full transition-all ${
                  form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110' : 'hover:scale-105'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </FormField>

        <SubmitRow onCancel={handleClose} submitLabel={initial ? 'Enregistrer' : 'Ajouter'} />
      </form>
    </Modal>
  )
}
