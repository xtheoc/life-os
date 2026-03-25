interface BadgeProps {
  label: string
  className?: string
}

export function Badge({ label, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-display font-semibold leading-none ${className}`}
    >
      {label}
    </span>
  )
}
