import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD'; toast: ToastItem }
  | { type: 'REMOVE'; id: string }

function reducer(state: ToastItem[], action: Action): ToastItem[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'REMOVE':
      return state.filter(t => t.id !== action.id)
    default:
      return state
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3500) => {
      const id = `${Date.now()}-${Math.random()}`
      dispatch({ type: 'ADD', toast: { id, type, message, duration } })
    },
    []
  )

  const remove = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-success shrink-0" />,
  error: <XCircle size={16} className="text-danger shrink-0" />,
  warning: <AlertTriangle size={16} className="text-warning shrink-0" />,
  info: <Info size={16} className="text-accent shrink-0" />,
}

const BORDER: Record<ToastType, string> = {
  success: 'border-success/30',
  error: 'border-danger/30',
  warning: 'border-warning/30',
  info: 'border-accent/30',
}

function ToastEntry({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(toast.id), toast.duration)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, toast.duration, onRemove])

  return (
    <div
      className={`flex items-start gap-3 bg-card border ${BORDER[toast.type]} rounded-lg px-4 py-3 shadow-lg min-w-[260px] max-w-sm animate-in slide-in-from-right-4 fade-in duration-200`}
    >
      {ICONS[toast.type]}
      <p className="flex-1 text-sm text-slate-200 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted hover:text-slate-300 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[]
  onRemove: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 lg:bottom-6"
    >
      {toasts.map(t => (
        <ToastEntry key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
