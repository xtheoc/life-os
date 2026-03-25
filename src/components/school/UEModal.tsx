import { useState } from 'react'
import Modal from '../ui/Modal'
import { FormField, Input, SubmitRow } from '../ui/Form'
import { useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { uid } from '../../lib/utils'
import type { UE } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  initial?: UE
}

export default function UEModal({ isOpen, onClose, initial }: Props) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [form, setForm] = useState(() => ({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    credits: String(initial?.credits ?? 6),
    semester: String(initial?.semester ?? 1),
  }))

  const initKey = initial?.id ?? 'new-ue'

  function reset() {
    setForm({
      name: initial?.name ?? '',
      code: initial?.code ?? '',
      credits: String(initial?.credits ?? 6),
      semester: String(initial?.semester ?? 1),
    })
  }

  function handleClose() { reset(); onClose() }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ue: UE = {
      id: initial?.id ?? uid(),
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      credits: Math.max(1, Number(form.credits)),
      semester: Number(form.semester) === 2 ? 2 : 1,
    }
    dispatch({ type: initial ? 'UPDATE_UE' : 'ADD_UE', payload: ue })
    toast(initial ? 'UE modifiée' : 'UE ajoutée', 'success')
    handleClose()
  }

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Modal
      key={initKey}
      isOpen={isOpen}
      onClose={handleClose}
      title={initial ? "Modifier l'UE" : 'Ajouter une UE'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Nom de l'UE">
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
              placeholder="UE-MATH"
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Crédits ECTS">
            <Input
              type="number"
              min={1}
              max={30}
              value={form.credits}
              onChange={e => set('credits')(e.target.value)}
            />
          </FormField>
          <FormField label="Semestre">
            <select
              value={form.semester}
              onChange={e => set('semester')(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="1">Semestre 1</option>
              <option value="2">Semestre 2</option>
            </select>
          </FormField>
        </div>

        <SubmitRow onCancel={handleClose} submitLabel={initial ? 'Enregistrer' : 'Ajouter'} />
      </form>
    </Modal>
  )
}
