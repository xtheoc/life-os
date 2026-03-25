import type { FinanceImport, Transaction, TransactionCategory } from '../types'

// ─── Category auto-detection keywords ────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<TransactionCategory, string[]> = {
  food: ['supermarché', 'supermarch', 'carrefour', 'leclerc', 'monoprix', 'lidl', 'aldi', 'casino',
         'restaurant', 'resto', 'brasserie', 'café', 'cafe', 'mcdonald', 'mcdo', 'kebab',
         'boulangerie', 'pâtisserie', 'patisserie', 'épicerie', 'epicerie', 'pizza', 'sushi',
         'uber eats', 'deliveroo', 'just eat', 'franprix', 'picard'],
  transport: ['sncf', 'ratp', 'navigo', 'vélib', 'velib', 'vinci', 'autoroute', 'péage', 'peage',
              'uber', 'blablacar', 'taxi', 'flixbus', 'ouigo', 'tgv', 'eurostar', 'total',
              'shell', 'bp', 'essence', 'carburant', 'parking', 'tramway'],
  housing: ['loyer', 'charges', 'syndic', 'eau', 'gaz', 'electricité', 'electricite', 'engie',
            'edf', 'free', 'orange', 'sfr', 'bouygues', 'internet', 'assurance', 'maaf',
            'allianz', 'axa', 'mutuelle'],
  utilities: ['edf', 'engie', 'veolia', 'suez', 'free mobile', 'sfr', 'orange mobile'],
  entertainment: ['netflix', 'spotify', 'amazon prime', 'disney', 'fnac', 'cultura', 'cinema',
                  'cine', 'jeu', 'game', 'steam', 'playstation', 'xbox', 'concert', 'théâtre',
                  'theatre', 'musée', 'musee', 'sport', 'salle de sport', 'abonnement'],
  health: ['pharmacie', 'médecin', 'medecin', 'docteur', 'dentiste', 'opticien', 'hopital',
           'clinique', 'sécu', 'secu', 'cpam', 'mutuelle santé', 'laboratoire'],
  shopping: ['amazon', 'zalando', 'asos', 'h&m', 'zara', 'primark', 'decathlon', 'ikea',
             'darty', 'boulanger', 'fnac', 'apple', 'samsung', 'vêtement', 'vetement',
             'chaussure', 'librairie'],
  education: ['université', 'universite', 'école', 'ecole', 'cours', 'formation', 'livre',
              'manuel', 'crous', 'bourse', 'tutorat'],
  income: ['salaire', 'virement reçu', 'virement recu', 'remboursement', 'bourse', 'caf',
           'allocation', 'prime', 'freelance', 'facture client'],
  transfer: ['virement', 'transfer', 'prelevement', 'prélèvement', 'cotisation'],
  other: [],
}

export function detectCategory(description: string): TransactionCategory {
  const lower = description.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [TransactionCategory, string[]][]) {
    if (cat === 'other') continue
    if (keywords.some(k => lower.includes(k))) return cat
  }
  return 'other'
}

// ─── Amount normalization (handles French "," decimal separator) ──────────────

export function parseAmount(raw: string): number {
  if (typeof raw !== 'string') return Number(raw) || 0
  // Replace comma decimal separator, strip whitespace/currency symbols
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[€$£]/g, '')
  return parseFloat(cleaned) || 0
}

// ─── XLSX column detection ────────────────────────────────────────────────────

export interface ColumnMap {
  date: number
  description: number
  amount: number
  /** Some banks have separate debit/credit columns */
  debit?: number
  credit?: number
}

const DATE_HEADERS = ['date', 'date opération', 'date operation', 'date valeur', 'date de valeur', 'jour']
const DESC_HEADERS = ['libellé', 'libelle', 'description', 'motif', 'intitulé', 'intitule', 'label', 'details']
const AMOUNT_HEADERS = ['montant', 'amount', 'solde', 'total', 'valeur']
const DEBIT_HEADERS = ['débit', 'debit', 'dépense', 'depense', 'retrait']
const CREDIT_HEADERS = ['crédit', 'credit', 'recette', 'versement', 'dépôt', 'depot']

function matchHeader(header: string, candidates: string[]): boolean {
  const h = header.toLowerCase().trim()
  return candidates.some(c => h.includes(c))
}

export function detectColumns(cols: string[]): ColumnMap | null {
  const dateCol = cols.findIndex(h => matchHeader(h, DATE_HEADERS))
  const descCol = cols.findIndex(h => matchHeader(h, DESC_HEADERS))
  const amountCol = cols.findIndex(h => matchHeader(h, AMOUNT_HEADERS))
  const debitCol = cols.findIndex(h => matchHeader(h, DEBIT_HEADERS))
  const creditCol = cols.findIndex(h => matchHeader(h, CREDIT_HEADERS))

  if (dateCol === -1 || descCol === -1) return null
  if (amountCol === -1 && (debitCol === -1 || creditCol === -1)) return null

  return {
    date: dateCol,
    description: descCol,
    amount: amountCol !== -1 ? amountCol : -1,
    debit: debitCol !== -1 ? debitCol : undefined,
    credit: creditCol !== -1 ? creditCol : undefined,
  }
}

// ─── Parse date strings ───────────────────────────────────────────────────────

function parseDate(raw: string | number): string {
  if (typeof raw === 'number') {
    // Excel serial date
    const date = new Date((raw - 25569) * 86400 * 1000)
    return date.toISOString().slice(0, 10)
  }
  const s = String(raw).trim()
  // DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmyMatch) return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  // DD-MM-YYYY
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dmyDash) return `${dmyDash[3]}-${dmyDash[2].padStart(2, '0')}-${dmyDash[1].padStart(2, '0')}`
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

// ─── Parse raw rows into transactions ────────────────────────────────────────

export interface RawRow {
  [key: string]: string | number
}

export function rowsToTransactions(rows: RawRow[], colMap: ColumnMap): Transaction[] {
  const txns: Transaction[] = []

  for (const row of rows) {
    const values = Object.values(row)
    const rawDate = values[colMap.date]
    const rawDesc = String(values[colMap.description] ?? '').trim()
    if (!rawDate || !rawDesc) continue

    let amount: number
    if (colMap.amount !== -1 && colMap.amount !== undefined) {
      amount = parseAmount(String(values[colMap.amount] ?? '0'))
    } else {
      const debit = colMap.debit !== undefined ? parseAmount(String(values[colMap.debit] ?? '0')) : 0
      const credit = colMap.credit !== undefined ? parseAmount(String(values[colMap.credit] ?? '0')) : 0
      // debit is outflow (negative), credit is inflow (positive)
      amount = credit - Math.abs(debit)
    }

    if (amount === 0 && rawDesc === '') continue

    txns.push({
      id: `txn-${Date.now()}-${txns.length}`,
      date: parseDate(rawDate as string | number),
      description: rawDesc,
      amount: Math.round(amount * 100) / 100,
      category: detectCategory(rawDesc),
      rawDescription: rawDesc,
    })
  }

  // Deduplicate by (date, description, amount)
  const seen = new Set<string>()
  return txns.filter(t => {
    const key = `${t.date}|${t.description}|${t.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ─── Finance analytics ────────────────────────────────────────────────────────

export function importMonthLabel(imp: FinanceImport): string {
  const [year, month] = imp.month.split('-')
  const d = new Date(Number(year), Number(month) - 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function totalExpenses(transactions: Transaction[]): number {
  return Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0))
}

export function totalIncome(transactions: Transaction[]): number {
  return transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
}

export function expensesByCategory(transactions: Transaction[]): Record<TransactionCategory, number> {
  const result = {} as Record<TransactionCategory, number>
  for (const t of transactions) {
    if (t.amount < 0) {
      result[t.category] = (result[t.category] ?? 0) + Math.abs(t.amount)
    }
  }
  return result
}

export interface MonthlySummary {
  month: string // YYYY-MM
  expenses: number
  income: number
  net: number
}

export function monthlySummaries(imports: FinanceImport[]): MonthlySummary[] {
  return imports
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(imp => ({
      month: imp.month,
      expenses: totalExpenses(imp.transactions),
      income: totalIncome(imp.transactions),
      net: totalIncome(imp.transactions) - totalExpenses(imp.transactions),
    }))
}

export const CAT_LABELS: Record<TransactionCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  housing: 'Housing',
  utilities: 'Subscriptions',
  entertainment: 'Entertainment',
  health: 'Health',
  shopping: 'Shopping',
  education: 'Education',
  income: 'Income',
  transfer: 'Transfers',
  other: 'Other',
}

export const CAT_COLORS: Record<TransactionCategory, string> = {
  food: '#f59e0b',
  transport: '#3b82f6',
  housing: '#8b5cf6',
  utilities: '#06b6d4',
  entertainment: '#ec4899',
  health: '#22c55e',
  shopping: '#f97316',
  education: '#6366f1',
  income: '#10b981',
  transfer: '#64748b',
  other: '#94a3b8',
}
