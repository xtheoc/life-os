import { useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { createSeedData } from '../data/seedData'
import type { UserPreferences, DayOfWeek, TransactionCategory } from '../types'
import { AlertTriangle } from 'lucide-react'
import SyncSection from '../components/settings/SyncSection'

const BUDGET_CATEGORIES: TransactionCategory[] = [
  'food', 'housing', 'transport', 'utilities', 'entertainment', 'health', 'shopping', 'education', 'other',
]

const BUDGET_CAT_LABELS: Record<string, string> = {
  food: 'Food',
  housing: 'Housing',
  transport: 'Transport',
  utilities: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  education: 'Education',
  other: 'Other',
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-sm font-display font-semibold text-white border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white">{label}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmAction({
  label,
  description,
  confirmText,
  variant,
  onConfirm,
}: {
  label: string
  description: string
  confirmText: string
  variant: 'warning' | 'danger'
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const color = variant === 'danger' ? 'danger' : 'warning'

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${
      variant === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-warning/30 bg-warning/5'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={16} className={`text-${color} shrink-0 mt-0.5`} />
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            variant === 'danger'
              ? 'bg-danger/20 text-danger hover:bg-danger/30'
              : 'bg-warning/20 text-warning hover:bg-warning/30'
          }`}>
          {label}
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(false)}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); setOpen(false) }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              variant === 'danger' ? 'bg-danger text-white hover:bg-danger/80' : 'bg-warning text-white hover:bg-warning/80'
            }`}>
            {confirmText}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DOW_LABELS: Record<DayOfWeek, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
}

export default function Settings() {
  const { preferences } = useAppState()
  const dispatch = useAppDispatch()

  // Local draft
  const [draft, setDraft] = useState<UserPreferences>(preferences)
  const [saved, setSaved] = useState(false)

  function updateDraft<K extends keyof UserPreferences>(k: K, v: UserPreferences[K]) {
    setDraft(d => ({ ...d, [k]: v }))
    setSaved(false)
  }

  function save() {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: draft })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function resetDemo() {
    const seed = createSeedData()
    dispatch({ type: 'RESET_DEMO_DATA', payload: { ...seed, preferences: draft, initialized: true } })
  }

  function clearAll() {
    dispatch({ type: 'CLEAR_ALL_DATA' })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white mb-0.5">Settings</h1>
        <p className="text-muted text-sm">Preferences, schedule & data management</p>
      </div>

      {/* Cloud Sync */}
      <Section title="Cloud Sync">
        <SyncSection />
      </Section>

      {/* Schedule */}
      <Section title="Schedule">
        <Row label="Wake time" sub="Used for the daily planner">
          <input type="time" value={draft.wakeTime} onChange={e => updateDraft('wakeTime', e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        </Row>
        <Row label="Bedtime">
          <input type="time" value={draft.sleepTime} onChange={e => updateDraft('sleepTime', e.target.value)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent" />
        </Row>
        <Row label="Study block duration" sub="Minutes per session">
          <div className="flex items-center gap-2">
            <input type="number" min={15} max={180} step={5} value={draft.studyBlockMinutes}
              onChange={e => updateDraft('studyBlockMinutes', Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-accent" />
            <span className="text-xs text-muted">min</span>
          </div>
        </Row>
        <Row label="Break duration" sub="Between study blocks">
          <div className="flex items-center gap-2">
            <input type="number" min={5} max={60} step={5} value={draft.breakMinutes}
              onChange={e => updateDraft('breakMinutes', Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-accent" />
            <span className="text-xs text-muted">min</span>
          </div>
        </Row>
        <Row label="Max study hours / day">
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={12} step={0.5} value={draft.maxStudyHoursPerDay}
              onChange={e => updateDraft('maxStudyHoursPerDay', Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white text-right focus:outline-none focus:border-accent" />
            <span className="text-xs text-muted">h</span>
          </div>
        </Row>
      </Section>

      {/* Body */}
      <Section title="Fitness & weight">
        <Row label="Weight unit">
          <div className="flex gap-1 p-1 bg-surface rounded-lg">
            {(['kg', 'lb'] as const).map(u => (
              <button key={u} onClick={() => updateDraft('weightUnit', u)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  draft.weightUnit === u ? 'bg-accent text-white' : 'text-muted hover:text-white'
                }`}>
                {u}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Weekly weigh-in day">
          <select
            value={draft.weeklyWeighInDay}
            onChange={e => updateDraft('weeklyWeighInDay', Number(e.target.value) as DayOfWeek)}
            className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent">
            {([1, 2, 3, 4, 5, 6, 0] as DayOfWeek[]).map(d => (
              <option key={d} value={d}>{DOW_LABELS[d]}</option>
            ))}
          </select>
        </Row>
      </Section>

      {/* Finance */}
      <Section title="Finance">
        <Row label="Currency" sub="Symbol displayed in expenses">
          <input
            value={draft.currency}
            onChange={e => updateDraft('currency', e.target.value)}
            maxLength={3}
            className="w-16 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-accent" />
        </Row>
      </Section>

      {/* Budget Limits */}
      <Section title="Budget Limits">
        <p className="text-xs text-muted">Set monthly spending limits per category (€). Leave blank for no limit.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {BUDGET_CATEGORIES.map(cat => (
            <div key={cat} className="flex flex-col gap-1">
              <label className="text-xs text-slate-300 font-display">{BUDGET_CAT_LABELS[cat]}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  step={10}
                  placeholder="—"
                  value={draft.budgetLimits[cat] ?? ''}
                  onChange={e => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value)
                    const updated = { ...draft.budgetLimits }
                    if (val === undefined) { delete updated[cat] } else { updated[cat] = val }
                    updateDraft('budgetLimits', updated)
                  }}
                  className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-accent"
                />
                <span className="text-xs text-muted shrink-0">€</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Save button */}
      <button
        onClick={save}
        className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/80 transition-colors">
        {saved ? '✓ Saved' : 'Save preferences'}
      </button>

      {/* Data management */}
      <Section title="Data management">
        <ConfirmAction
          label="Reset demo data"
          description="Reloads example data (courses, tasks, workout sessions…). Your preferences are kept."
          confirmText="Reset"
          variant="warning"
          onConfirm={resetDemo}
        />
        <ConfirmAction
          label="Clear all data"
          description="Deletes everything except your preferences. This action is irreversible."
          confirmText="Clear all"
          variant="danger"
          onConfirm={clearAll}
        />
      </Section>

      {/* About */}
      <div className="text-center text-xs text-muted py-2">
        Life OS · Data stored locally · No connection required
      </div>
    </div>
  )
}
