import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, ArrowRight, Upload } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import type { FinanceImport, TransactionCategory } from '../../types'

const CATEGORY_LABELS: Partial<Record<TransactionCategory, string>> = {
  food: 'Food',
  transport: 'Transport',
  housing: 'Housing',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  education: 'Education',
  other: 'Other',
}

function totalExpenses(imp: FinanceImport): number {
  return imp.transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
}

function topCategories(imp: FinanceImport, n = 3) {
  const cats: Partial<Record<TransactionCategory, number>> = {}
  imp.transactions
    .filter(t => t.amount < 0 && t.category !== 'transfer')
    .forEach(t => {
      cats[t.category] = (cats[t.category] ?? 0) + Math.abs(t.amount)
    })
  return Object.entries(cats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n) as [TransactionCategory, number][]
}

export default function FinanceWidget() {
  const { financeImports, preferences } = useAppState()
  const currency = preferences.currency

  const sorted = [...financeImports].sort((a, b) => b.month.localeCompare(a.month))
  const latest = sorted[0] ?? null
  const previous = sorted[1] ?? null

  if (!latest) {
    return (
      <Card>
        <CardHeader title="Finance" icon={TrendingUp} />
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <TrendingUp size={26} className="text-muted" />
          <p className="text-muted text-xs">No bank statements imported yet.</p>
          <Link
            to="/finance"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-blue-400 font-display transition-colors"
          >
            <Upload size={12} /> Import statement
          </Link>
        </div>
      </Card>
    )
  }

  const latestTotal = totalExpenses(latest)
  const prevTotal = previous ? totalExpenses(previous) : null
  const delta = prevTotal ? ((latestTotal - prevTotal) / prevTotal) * 100 : null
  const cats = topCategories(latest)
  const maxCat = cats[0]?.[1] ?? 1

  const monthName = format(parseISO(latest.month + '-01'), 'MMMM yyyy')

  return (
    <Card>
      <CardHeader
        title={`Finance — ${monthName}`}
        icon={TrendingUp}
        action={
          <Link
            to="/finance"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            Details <ArrowRight size={11} />
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        {/* Total */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted font-display uppercase tracking-wider mb-0.5">
              Total spend
            </p>
            <span className="font-mono text-2xl font-bold text-white">
              {latestTotal.toFixed(0)}
              <span className="text-sm text-muted ml-1">{currency}</span>
            </span>
          </div>
          {delta !== null && (
            <div
              className={`flex items-center gap-1 text-sm font-mono font-semibold ${
                delta > 0 ? 'text-danger' : 'text-success'
              }`}
            >
              {delta > 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(delta).toFixed(1)}%
              <span className="text-[10px] text-muted font-display ml-0.5">vs prev</span>
            </div>
          )}
        </div>

        {/* Top categories */}
        <div className="space-y-2">
          {cats.map(([cat, amount]) => (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-display text-slate-400">
                  {CATEGORY_LABELS[cat] ?? cat}
                </span>
                <span className="font-mono text-xs text-slate-300">
                  {amount.toFixed(0)} {currency}
                </span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent/60 rounded-full"
                  style={{ width: `${(amount / maxCat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
