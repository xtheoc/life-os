import { useState, useRef, useCallback } from 'react'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { useToast } from '../components/ui/Toast'
import { Card, CardHeader } from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { FormField, Input, Select, SubmitRow } from '../components/ui/Form'
import {
  detectColumns,
  rowsToTransactions,
  expensesByCategory,
  monthlySummaries,
  totalExpenses,
  totalIncome,
  CAT_LABELS,
  CAT_COLORS,
  type ColumnMap,
  type RawRow,
} from '../lib/financeUtils'
import { uid } from '../lib/utils'
import type { FinanceImport, Transaction, TransactionCategory, FinanceAccount } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Legend, Cell,
} from 'recharts'
import {
  Upload, Trash2, Plus, TrendingDown, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, AlertTriangle, Wallet, BarChart2, List,
  Edit2, X as XIcon,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short' })
}

function fmt(n: number): string {
  return `${n.toFixed(2)} €`
}

const ALL_CATEGORIES = Object.keys(CAT_LABELS) as TransactionCategory[]

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || !payload.length) return null
  return (
    <div style={{ background: '#1a2235', border: '1px solid #1e2d45', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{String(label)}</p>
      {(payload as { name: string; value: number; color: string }[]).map((p, i) => (
        <p key={i} style={{ color: p.color, margin: 0 }}>{p.name}: {p.value.toFixed(2)} €</p>
      ))}
    </div>
  )
}

// ─── Account modal ────────────────────────────────────────────────────────────

function AccountModal({ isOpen, onClose, initial }: { isOpen: boolean; onClose: () => void; initial?: FinanceAccount }) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: (initial?.type ?? 'checking') as FinanceAccount['type'],
    currency: initial?.currency ?? 'EUR',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const account: FinanceAccount = { id: initial?.id ?? uid(), ...form }
    dispatch({ type: initial ? 'UPDATE_FINANCE_ACCOUNT' : 'ADD_FINANCE_ACCOUNT', payload: account })
    toast(initial ? 'Account updated' : 'Account added', 'success')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Edit account' : 'Add account'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Account name">
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
        </FormField>
        <FormField label="Type">
          <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FinanceAccount['type'] }))}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit card</option>
            <option value="other">Other</option>
          </Select>
        </FormField>
        <FormField label="Currency (ISO code)">
          <Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} maxLength={3} />
        </FormField>
        <SubmitRow onCancel={onClose} submitLabel={initial ? 'Save' : 'Add'} />
      </form>
    </Modal>
  )
}

// ─── Review modal ─────────────────────────────────────────────────────────────

interface ReviewRow extends Transaction { _delete: boolean }

function ReviewModal({
  isOpen, onClose, accountId, month, rows, onSave,
}: {
  isOpen: boolean; onClose: () => void
  accountId: string; month: string
  rows: Transaction[]; onSave: (imp: FinanceImport) => void
}) {
  const [items, setItems] = useState<ReviewRow[]>(() => rows.map(r => ({ ...r, _delete: false })))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<TransactionCategory | 'all'>('all')
  const { toast } = useToast()

  function updateItem(id: string, patch: Partial<ReviewRow>) {
    setItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function handleSave() {
    const kept = items.filter(r => !r._delete).map(({ _delete, ...t }) => t)
    if (kept.length === 0) { toast('No transactions to import', 'error'); return }
    onSave({ id: uid(), accountId, month, importedAt: new Date().toISOString(), transactions: kept })
  }

  const visible = filter === 'all' ? items : items.filter(r => r.category === filter)
  const usedCats = Array.from(new Set(items.map(r => r.category))) as TransactionCategory[]
  const keptCount = items.filter(r => !r._delete).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review — ${month} (${items.length} transactions)`} size="lg">
      <div className="space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-accent/30 text-accent' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
            All ({items.length})
          </button>
          {usedCats.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === cat ? 'text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
              style={filter === cat ? { background: CAT_COLORS[cat] + '50', color: CAT_COLORS[cat] } : {}}>
              {CAT_LABELS[cat]} ({items.filter(r => r.category === cat).length})
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto space-y-1 pr-1">
          {visible.map(row => (
            <div key={row.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-opacity ${row._delete ? 'opacity-30' : ''}`}
              style={{ background: '#1a2235' }}>
              <button onClick={() => updateItem(row.id, { _delete: !row._delete })}
                className={`shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${row._delete ? 'bg-danger/30 text-danger' : 'bg-white/10 text-muted hover:bg-danger/20 hover:text-danger'}`}>
                <XIcon size={10} />
              </button>
              <span className="font-mono text-xs text-muted w-20 shrink-0">{row.date}</span>
              {editingId === row.id ? (
                <input
                  className="flex-1 bg-card border border-accent rounded px-2 py-0.5 text-xs text-white outline-none"
                  defaultValue={row.description}
                  onBlur={e => { updateItem(row.id, { description: e.target.value }); setEditingId(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  autoFocus
                />
              ) : (
                <button className="flex-1 text-left text-xs text-white truncate hover:text-accent transition-colors"
                  onClick={() => setEditingId(row.id)}>
                  {row.description}
                </button>
              )}
              <select value={row.category}
                onChange={e => updateItem(row.id, { category: e.target.value as TransactionCategory })}
                className="bg-card border border-border rounded px-1.5 py-0.5 text-xs outline-none shrink-0"
                style={{ color: CAT_COLORS[row.category] }}>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              <span className={`font-mono text-xs w-20 text-right shrink-0 ${row.amount < 0 ? 'text-danger' : 'text-success'}`}>
                {row.amount > 0 ? '+' : ''}{row.amount.toFixed(2)} €
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted">{keptCount} transactions will be imported</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/80 transition-colors font-semibold">
              Import {keptCount} transactions
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Import wizard ────────────────────────────────────────────────────────────

function ImportWizard({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'idle' | 'mapping'>('idle')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [colMap, setColMap] = useState<ColumnMap | null>(null)
  const [month, setMonth] = useState('')
  const [reviewRows, setReviewRows] = useState<Transaction[]>([])
  const [showReview, setShowReview] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      const { read, utils } = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = utils.sheet_to_json(ws, { header: 1, raw: true }) as unknown[][]
      const hdrs = (data[0] as unknown[]).map(String)
      const bodyRows = data.slice(1).filter(r => (r as unknown[]).some(v => v !== null && v !== ''))
      const rowObjects: RawRow[] = bodyRows.map(r =>
        Object.fromEntries(hdrs.map((h, i) => [h, (r as unknown[])[i] as string | number]))
      )
      setHeaders(hdrs)
      setRawRows(rowObjects)
      setColMap(detectColumns(hdrs))
      setStep('mapping')
    } else {
      toast('Unsupported format — use XLSX, XLS or CSV', 'error')
    }
  }, [toast])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleProceedToReview() {
    if (!colMap || colMap.date === -1 || colMap.description === -1) {
      toast('Please map Date and Description columns', 'error'); return
    }
    if (!month) { toast('Please select a month', 'error'); return }
    const txns = rowsToTransactions(rawRows, colMap)
    if (txns.length === 0) { toast('No transactions detected', 'error'); return }
    setReviewRows(txns)
    setShowReview(true)
  }

  function handleSaveImport(imp: FinanceImport) {
    dispatch({ type: 'ADD_FINANCE_IMPORT', payload: imp })
    toast(`${imp.transactions.length} transactions imported`, 'success')
    setShowReview(false)
    setStep('idle')
    onDone()
  }

  if (step === 'idle') {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-accent/50 transition-colors"
        onClick={() => fileRef.current?.click()}>
        <Upload className="mx-auto text-muted mb-3" size={32} />
        <p className="text-sm text-white font-semibold mb-1">Drop a file here</p>
        <p className="text-xs text-muted">XLSX, XLS or CSV exported from your bank</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileInput} />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Column mapping</h3>
          <button onClick={() => setStep('idle')} className="text-xs text-muted hover:text-white transition-colors">
            Change file
          </button>
        </div>
        <p className="text-xs text-muted">{rawRows.length} rows · {headers.length} columns</p>

        <div className="grid grid-cols-2 gap-3">
          {(['date', 'description', 'amount'] as const).map(field => {
            const labels = { date: 'Date column', description: 'Description column', amount: 'Amount column' }
            return (
              <FormField key={field} label={labels[field]}>
                <Select
                  value={colMap?.[field] !== undefined && colMap[field] !== -1 ? String(colMap[field]) : ''}
                  onChange={e => setColMap(prev => ({
                    ...(prev ?? { date: -1, description: -1, amount: -1 }),
                    [field]: e.target.value !== '' ? Number(e.target.value) : -1,
                  }))}>
                  <option value="">— select —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </Select>
              </FormField>
            )
          })}
          <FormField label="Mois">
            <Input type="month" value={month} onChange={e => setMonth(e.target.value)} required />
          </FormField>
        </div>

        {rawRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {headers.map((h, i) => <th key={i} className="px-3 py-2 text-left text-muted font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {headers.map((h, j) => <td key={j} className="px-3 py-1.5 text-muted">{String(row[h] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={handleProceedToReview}
          className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
          Continue to review →
        </button>
      </div>

      {showReview && (
        <ReviewModal
          isOpen={showReview}
          onClose={() => setShowReview(false)}
          accountId={accountId}
          month={month}
          rows={reviewRows}
          onSave={handleSaveImport}
        />
      )}
    </>
  )
}

// ─── Transaction list ─────────────────────────────────────────────────────────

type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

interface EditDraft {
  date: string
  description: string
  amount: string
  category: TransactionCategory
}

interface AddDraft {
  date: string
  description: string
  amount: string
  isExpense: boolean
  category: TransactionCategory
}

type TxnView = 'list' | 'summary'

function TransactionList({ transactions, currency, importId }: {
  transactions: Transaction[]
  currency: string
  importId: string
}) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<TransactionCategory | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('date-desc')
  const [view, setView] = useState<TxnView>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState<AddDraft>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    isExpense: true,
    category: 'other',
  })

  const usedCats = Array.from(new Set(transactions.map(t => t.category))) as TransactionCategory[]

  const filtered = transactions
    .filter(t => catFilter === 'all' || t.category === catFilter)
    .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'date-desc') return b.date.localeCompare(a.date)
      if (sort === 'date-asc') return a.date.localeCompare(b.date)
      if (sort === 'amount-desc') return Math.abs(b.amount) - Math.abs(a.amount)
      return Math.abs(a.amount) - Math.abs(b.amount)
    })

  function cycleSortDate() {
    setSort(s => s === 'date-desc' ? 'date-asc' : 'date-desc')
  }
  function cycleSortAmount() {
    setSort(s => s === 'amount-desc' ? 'amount-asc' : 'amount-desc')
  }

  function startEdit(t: Transaction) {
    setEditingId(t.id)
    setEditDraft({ date: t.date, description: t.description, amount: String(Math.abs(t.amount)), category: t.category })
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft(null)
  }

  function saveEdit(t: Transaction) {
    if (!editDraft) return
    const absAmt = parseFloat(editDraft.amount)
    if (isNaN(absAmt)) { toast('Invalid amount', 'error'); return }
    const updated: Transaction = {
      ...t,
      date: editDraft.date,
      description: editDraft.description,
      amount: t.amount < 0 ? -Math.abs(absAmt) : Math.abs(absAmt),
      category: editDraft.category,
    }
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { importId, transaction: updated } })
    toast('Transaction updated', 'success')
    cancelEdit()
  }

  function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    dispatch({ type: 'DELETE_TRANSACTION', payload: { importId, transactionId: id } })
    toast('Transaction deleted', 'success')
    setConfirmDeleteId(null)
  }

  function handleAdd() {
    const absAmt = parseFloat(addDraft.amount)
    if (!addDraft.description.trim()) { toast('Description required', 'error'); return }
    if (isNaN(absAmt) || absAmt <= 0) { toast('Invalid amount', 'error'); return }
    const txn: Transaction = {
      id: uid(),
      date: addDraft.date,
      description: addDraft.description.trim(),
      amount: addDraft.isExpense ? -Math.abs(absAmt) : Math.abs(absAmt),
      category: addDraft.category,
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: { importId, transaction: txn } })
    toast('Transaction added', 'success')
    setShowAdd(false)
    setAddDraft({ date: new Date().toISOString().slice(0, 10), description: '', amount: '', isExpense: true, category: 'other' })
  }

  // ── Summary view ──
  const summaryRows = (() => {
    const map = new Map<TransactionCategory, { count: number; total: number }>()
    transactions.forEach(t => {
      const cur = map.get(t.category) ?? { count: 0, total: 0 }
      map.set(t.category, { count: cur.count + 1, total: cur.total + t.amount })
    })
    return Array.from(map.entries())
      .map(([cat, v]) => ({ cat, ...v }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  })()
  const summaryGrandTotal = summaryRows.reduce((s, r) => s + r.total, 0)

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white">Transactions ({transactions.length})</h3>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-0.5 p-0.5 bg-surface rounded-lg">
            <button onClick={() => setView('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'list' ? 'bg-card text-white' : 'text-muted hover:text-white'}`}>
              List
            </button>
            <button onClick={() => setView('summary')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${view === 'summary' ? 'bg-card text-white' : 'text-muted hover:text-white'}`}>
              Summary
            </button>
          </div>
          {/* Add button */}
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Add transaction form */}
      {showAdd && (
        <div className="rounded-xl border border-accent/30 bg-surface p-3 space-y-3">
          <p className="text-xs font-semibold text-accent">New transaction</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Date</label>
              <input type="date" value={addDraft.date}
                onChange={e => setAddDraft(d => ({ ...d, date: e.target.value }))}
                className="bg-card border border-border rounded px-2 py-1 text-xs text-white outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-xs text-muted">Description</label>
              <input type="text" value={addDraft.description} placeholder="Description"
                onChange={e => setAddDraft(d => ({ ...d, description: e.target.value }))}
                className="bg-card border border-border rounded px-2 py-1 text-xs text-white outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Amount</label>
              <div className="flex gap-1">
                <button onClick={() => setAddDraft(d => ({ ...d, isExpense: !d.isExpense }))}
                  className={`shrink-0 px-2 py-1 rounded text-xs font-bold transition-colors ${addDraft.isExpense ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                  {addDraft.isExpense ? '−' : '+'}
                </button>
                <input type="number" min="0" step="0.01" value={addDraft.amount} placeholder="0.00"
                  onChange={e => setAddDraft(d => ({ ...d, amount: e.target.value }))}
                  className="flex-1 min-w-0 bg-card border border-border rounded px-2 py-1 text-xs text-white outline-none focus:border-accent" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Category</label>
              <select value={addDraft.category}
                onChange={e => setAddDraft(d => ({ ...d, category: e.target.value as TransactionCategory }))}
                className="bg-card border border-border rounded px-2 py-1 text-xs text-white outline-none focus:border-accent"
                style={{ color: CAT_COLORS[addDraft.category] }}>
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors">
              Save
            </button>
          </div>
        </div>
      )}

      {view === 'summary' ? (
        /* ── Summary view ── */
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-muted font-normal">Category</th>
                <th className="px-3 py-2 text-right text-muted font-normal"># Transactions</th>
                <th className="px-3 py-2 text-right text-muted font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(({ cat, count, total }) => (
                <tr key={cat} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[cat] }} />
                      <span style={{ color: CAT_COLORS[cat] }}>{CAT_LABELS[cat]}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-muted">{count}</td>
                  <td className={`px-3 py-2 text-right font-mono ${total < 0 ? 'text-danger' : 'text-success'}`}>
                    {total > 0 ? '+' : ''}{total.toFixed(2)} {currency}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-3 py-2 font-semibold text-white">Total</td>
                <td className="px-3 py-2 text-right text-muted">{transactions.length}</td>
                <td className={`px-3 py-2 text-right font-mono font-semibold ${summaryGrandTotal < 0 ? 'text-danger' : 'text-success'}`}>
                  {summaryGrandTotal > 0 ? '+' : ''}{summaryGrandTotal.toFixed(2)} {currency}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* ── List view ── */
        <>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-muted outline-none focus:border-accent transition-colors" />

          {/* Category filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCatFilter('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${catFilter === 'all' ? 'bg-accent/30 text-accent' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
              All ({transactions.length})
            </button>
            {usedCats.map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${catFilter === cat ? 'text-white' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                style={catFilter === cat ? { background: CAT_COLORS[cat] + '40', color: CAT_COLORS[cat] } : {}}>
                {CAT_LABELS[cat]} ({transactions.filter(t => t.category === cat).length})
              </button>
            ))}
          </div>

          {/* Sort controls */}
          <div className="flex gap-2 text-xs">
            <button onClick={cycleSortDate}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${sort.startsWith('date') ? 'border-accent/50 text-accent bg-accent/10' : 'border-border text-muted hover:text-white'}`}>
              Date {sort === 'date-desc' ? <ChevronDown size={11} /> : sort === 'date-asc' ? <ChevronUp size={11} /> : null}
            </button>
            <button onClick={cycleSortAmount}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${sort.startsWith('amount') ? 'border-accent/50 text-accent bg-accent/10' : 'border-border text-muted hover:text-white'}`}>
              Amount {sort === 'amount-desc' ? <ChevronDown size={11} /> : sort === 'amount-asc' ? <ChevronUp size={11} /> : null}
            </button>
          </div>

          {/* Transaction rows */}
          <div className="max-h-[28rem] overflow-y-auto space-y-0.5 pr-1">
            {filtered.map(t => (
              <div key={t.id}>
                {editingId === t.id && editDraft ? (
                  /* Edit row */
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-accent/30">
                    <input type="date" value={editDraft.date}
                      onChange={e => setEditDraft(d => d ? { ...d, date: e.target.value } : d)}
                      className="bg-card border border-border rounded px-2 py-0.5 text-xs text-white outline-none focus:border-accent w-28" />
                    <input type="text" value={editDraft.description}
                      onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)}
                      className="flex-1 min-w-[8rem] bg-card border border-border rounded px-2 py-0.5 text-xs text-white outline-none focus:border-accent" />
                    <input type="number" step="0.01" value={editDraft.amount}
                      onChange={e => setEditDraft(d => d ? { ...d, amount: e.target.value } : d)}
                      className="bg-card border border-border rounded px-2 py-0.5 text-xs text-white outline-none focus:border-accent w-24" />
                    <select value={editDraft.category}
                      onChange={e => setEditDraft(d => d ? { ...d, category: e.target.value as TransactionCategory } : d)}
                      className="bg-card border border-border rounded px-1.5 py-0.5 text-xs outline-none"
                      style={{ color: CAT_COLORS[editDraft.category] }}>
                      {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                    </select>
                    <button onClick={() => saveEdit(t)}
                      className="px-2.5 py-0.5 rounded bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors">
                      Save
                    </button>
                    <button onClick={cancelEdit}
                      className="px-2.5 py-0.5 rounded bg-white/10 text-muted text-xs hover:bg-white/20 transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Normal row */
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <span className="font-mono text-xs text-muted w-20 shrink-0">{t.date}</span>
                    <span className="flex-1 text-xs text-white truncate">{t.description}</span>
                    <span className="text-xs shrink-0 px-2 py-0.5 rounded-full"
                      style={{ background: CAT_COLORS[t.category] + '25', color: CAT_COLORS[t.category] }}>
                      {CAT_LABELS[t.category]}
                    </span>
                    <span className={`font-mono text-xs w-24 text-right shrink-0 ${t.amount < 0 ? 'text-danger' : 'text-success'}`}>
                      {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)} {currency}
                    </span>
                    <button onClick={() => startEdit(t)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded text-muted hover:text-accent transition-all">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className={`shrink-0 p-1 rounded transition-all ${confirmDeleteId === t.id ? 'bg-danger/20 text-danger opacity-100' : 'opacity-0 group-hover:opacity-100 text-muted hover:text-danger'}`}
                      title={confirmDeleteId === t.id ? 'Click again to confirm' : 'Delete'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted text-xs py-6">No transactions</p>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'import' | 'transactions'

export default function Finance() {
  const { financeAccounts, financeImports, preferences } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const [tab, setTab] = useState<Tab>('overview')
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => financeAccounts[0]?.id ?? '')
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FinanceAccount | undefined>()
  const [selectedMonth, setSelectedMonth] = useState('')

  const account = financeAccounts.find(a => a.id === selectedAccountId)
  const accountImports = financeImports
    .filter(i => i.accountId === selectedAccountId)
    .sort((a, b) => b.month.localeCompare(a.month))

  const displayImport = selectedMonth
    ? accountImports.find(i => i.month === selectedMonth) ?? accountImports[0]
    : accountImports[0]

  const allTxns = displayImport?.transactions ?? []
  const prevImport = accountImports[1]

  const expenses = totalExpenses(allTxns)
  const income = totalIncome(allTxns)
  const net = income - expenses
  const prevExpenses = prevImport ? totalExpenses(prevImport.transactions) : null
  const expDelta = prevExpenses !== null ? expenses - prevExpenses : null

  const catBreakdown = expensesByCategory(allTxns)
  const sortedCats = (Object.entries(catBreakdown) as [TransactionCategory, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)

  const monthSummaries = monthlySummaries(accountImports)

  const pieData = sortedCats.map(([cat, amt]) => ({
    name: CAT_LABELS[cat],
    value: Math.round(amt * 100) / 100,
    color: CAT_COLORS[cat],
  }))

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'import', label: 'Import', icon: <Upload size={14} /> },
    { id: 'transactions', label: 'Transactions', icon: <List size={14} /> },
  ]

  if (financeAccounts.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-20 text-center space-y-4">
        <Wallet className="mx-auto text-muted" size={48} />
        <h2 className="text-xl font-display font-bold text-white">No accounts</h2>
        <p className="text-muted text-sm">Start by adding a bank account.</p>
        <button onClick={() => setShowAccountModal(true)}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
          Add account
        </button>
        {showAccountModal && <AccountModal isOpen onClose={() => setShowAccountModal(false)} />}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Finance</h1>
          <p className="text-muted text-sm mt-0.5">Track your expenses and income</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedAccountId}
            onChange={e => { setSelectedAccountId(e.target.value); setSelectedMonth('') }}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent transition-colors">
            {financeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => { setEditingAccount(account); setShowAccountModal(true) }}
            className="p-2 rounded-lg bg-white/5 text-muted hover:text-white hover:bg-white/10 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => { setEditingAccount(undefined); setShowAccountModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
            <Plus size={14} /> Account
          </button>
        </div>
      </div>

      {/* Month filter chips */}
      {accountImports.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setSelectedMonth('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!selectedMonth ? 'bg-accent/30 text-accent' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
            Latest
          </button>
          {accountImports.map(imp => (
            <button key={imp.id} onClick={() => setSelectedMonth(imp.month)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedMonth === imp.month ? 'bg-accent/30 text-accent' : 'bg-white/5 text-muted hover:bg-white/10'}`}>
              {imp.month}
            </button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-card text-white shadow' : 'text-muted hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {!displayImport ? (
            <div className="text-center py-16 text-muted">
              <p className="text-sm mb-3">No imports available.</p>
              <button onClick={() => setTab('import')} className="text-accent text-sm hover:underline">
                Import a statement →
              </button>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-danger/15"><TrendingDown size={20} className="text-danger" /></div>
                    <div>
                      <p className="text-xs text-muted">Expenses</p>
                      <p className="text-xl font-mono font-bold text-white">{fmt(expenses)}</p>
                      {expDelta !== null && (
                        <p className={`text-xs font-mono ${expDelta > 0 ? 'text-danger' : 'text-success'}`}>
                          {expDelta > 0 ? '+' : ''}{fmt(expDelta)} vs prev. month
                        </p>
                      )}
                    </div>
                  </div>
                  {expDelta !== null && prevExpenses !== null && expDelta > prevExpenses * 0.2 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-warning">
                      <AlertTriangle size={12} />
                      Expenses up +{((expDelta / prevExpenses) * 100).toFixed(0)}%
                    </div>
                  )}
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-success/15"><TrendingUp size={20} className="text-success" /></div>
                    <div>
                      <p className="text-xs text-muted">Income</p>
                      <p className="text-xl font-mono font-bold text-white">{fmt(income)}</p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${net >= 0 ? 'bg-success/15' : 'bg-danger/15'}`}>
                      <DollarSign size={20} className={net >= 0 ? 'text-success' : 'text-danger'} />
                    </div>
                    <div>
                      <p className="text-xs text-muted">Net</p>
                      <p className={`text-xl font-mono font-bold ${net >= 0 ? 'text-success' : 'text-danger'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {monthSummaries.length > 1 && (
                  <Card>
                    <CardHeader icon={BarChart2} title="Monthly trend" />
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthSummaries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                        <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                {pieData.length > 0 && (
                  <Card>
                    <CardHeader icon={DollarSign} title={`Par catégorie — ${displayImport.month}`} />
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `${v.toFixed(2)} €`}
                          contentStyle={{ background: '#1a2235', border: '1px solid #1e2d45', borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              {/* Category breakdown */}
              <Card>
                <CardHeader icon={List} title="Category breakdown" />
                <div className="space-y-2 mt-2">
                  {sortedCats.map(([cat, amt]) => {
                    const pct = expenses > 0 ? (amt / expenses) * 100 : 0
                    const prevCatAmt = prevImport ? (expensesByCategory(prevImport.transactions)[cat] ?? 0) : 0
                    const overspend = prevCatAmt > 0 && amt > prevCatAmt * 1.2
                    const limit = preferences.budgetLimits[cat]
                    const limitPct = limit ? (amt / limit) * 100 : null
                    const limitColor = limitPct === null ? null : limitPct > 100 ? 'text-danger' : limitPct >= 80 ? 'text-warning' : 'text-success'
                    const limitBarColor = limitPct === null ? null : limitPct > 100 ? '#ef4444' : limitPct >= 80 ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[cat] }} />
                            <span className="text-white">{CAT_LABELS[cat]}</span>
                            {overspend && !limit && <AlertTriangle size={10} className="text-warning" />}
                            {limit && limitPct !== null && limitPct > 100 && <AlertTriangle size={10} className="text-danger" />}
                          </div>
                          <span className="font-mono text-muted">
                            {limit ? (
                              <span className={limitColor ?? ''}>{fmt(amt)} / {fmt(limit)}</span>
                            ) : (
                              <span>{fmt(amt)} · {pct.toFixed(1)}%</span>
                            )}
                          </span>
                        </div>
                        {limit && limitPct !== null ? (
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(limitPct, 100)}%`, background: limitBarColor ?? CAT_COLORS[cat] }} />
                          </div>
                        ) : (
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CAT_COLORS[cat] }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {sortedCats.length === 0 && <p className="text-xs text-muted text-center py-4">No expenses</p>}
                </div>
              </Card>

              {/* Import history */}
              <Card>
                <CardHeader icon={Upload} title="Imports" action={
                  <button onClick={() => setTab('import')}
                    className="flex items-center gap-1 text-xs text-accent hover:underline">
                    <Plus size={12} /> New
                  </button>
                } />
                <div className="space-y-2 mt-2">
                  {accountImports.map(imp => (
                    <div key={imp.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-sm">
                      <div>
                        <span className="text-white font-semibold">{imp.month}</span>
                        <span className="text-muted ml-2 text-xs">{imp.transactions.length} transactions</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setSelectedMonth(imp.month); setTab('transactions') }}
                          className="text-xs text-accent hover:underline transition-colors">
                          Edit transactions
                        </button>
                        <span className="font-mono text-xs text-danger">−{fmt(totalExpenses(imp.transactions))}</span>
                        <button onClick={() => { dispatch({ type: 'DELETE_FINANCE_IMPORT', payload: { id: imp.id } }); toast('Import deleted', 'success') }}
                          className="text-muted hover:text-danger transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {accountImports.length === 0 && <p className="text-xs text-muted text-center py-4">No imports</p>}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Import ── */}
      {tab === 'import' && (
        <Card>
          <CardHeader icon={Upload} title={`Import — ${account?.name ?? ''}`} />
          <div className="mt-4">
            <ImportWizard accountId={selectedAccountId} onDone={() => setTab('overview')} />
          </div>
        </Card>
      )}

      {/* ── Transactions ── */}
      {tab === 'transactions' && (
        <Card>
          {!displayImport ? (
            <div className="text-center py-12 text-muted text-sm">
              <p>No imports available.</p>
              <button onClick={() => setTab('import')} className="mt-2 text-accent hover:underline">
                Import a statement →
              </button>
            </div>
          ) : (
            <TransactionList transactions={allTxns} currency={account?.currency ?? '€'} importId={displayImport?.id ?? ''} />
          )}
        </Card>
      )}

      {showAccountModal && (
        <AccountModal
          isOpen={showAccountModal}
          onClose={() => { setShowAccountModal(false); setEditingAccount(undefined) }}
          initial={editingAccount}
        />
      )}
    </div>
  )
}
