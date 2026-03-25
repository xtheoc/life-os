import type { ReactNode, ElementType } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  icon?: ElementType
  action?: ReactNode
}

export function CardHeader({ title, icon: Icon, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={14} className="text-muted shrink-0" />}
        <span className="text-[11px] font-display font-semibold text-muted uppercase tracking-widest">
          {title}
        </span>
      </div>
      {action}
    </div>
  )
}
