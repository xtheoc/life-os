import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-display font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

const BASE =
  'w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-muted outline-none focus:border-accent transition-colors font-display'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${BASE} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', rows = 3, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${BASE} resize-none ${className}`} rows={rows} {...props} />
}

export function SubmitRow({ onCancel, submitLabel = 'Save' }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm font-display text-muted hover:text-slate-200 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-5 py-2 bg-accent hover:bg-blue-500 text-white text-sm font-display font-semibold rounded-lg transition-colors"
      >
        {submitLabel}
      </button>
    </div>
  )
}
