import { Link } from 'react-router-dom'
import { GraduationCap, ArrowRight, AlertTriangle } from 'lucide-react'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { Priority } from '../../types'

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: 'bg-danger/20 text-danger',
  high: 'bg-warning/20 text-warning',
  medium: 'bg-accent/20 text-accent',
  low: 'bg-muted/20 text-muted',
}

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function dueLabel(dueDate: string): { text: string; className: string } {
  const today = format(new Date(), 'yyyy-MM-dd')
  const diff = differenceInCalendarDays(parseISO(dueDate), new Date())

  if (dueDate < today)
    return { text: `${Math.abs(diff)}d overdue`, className: 'text-danger font-semibold' }
  if (diff === 0) return { text: 'Due today', className: 'text-warning font-semibold' }
  if (diff === 1) return { text: 'Tomorrow', className: 'text-warning' }
  if (diff <= 7) return { text: `In ${diff} days`, className: 'text-slate-400' }
  return { text: format(parseISO(dueDate), 'dd/MM'), className: 'text-muted' }
}

export default function SchoolWidget() {
  const { assignments, courses } = useAppState()
  const today = format(new Date(), 'yyyy-MM-dd')

  const pending = [...assignments]
    .filter(a => a.status !== 'done')
    .sort((a, b) => {
      const aOv = a.dueDate < today ? -1 : 0
      const bOv = b.dueDate < today ? -1 : 0
      if (aOv !== bOv) return aOv - bOv
      const pDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (pDiff !== 0) return pDiff
      return a.dueDate.localeCompare(b.dueDate)
    })
    .slice(0, 4)

  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))

  return (
    <Card>
      <CardHeader
        title="Upcoming Work"
        icon={GraduationCap}
        action={
          <Link
            to="/school"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            All <ArrowRight size={11} />
          </Link>
        }
      />

      {pending.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="font-display font-semibold text-success text-sm mb-1">All caught up!</p>
          <p className="text-muted text-xs">No pending assignments.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pending.map(a => {
            const course = courseMap[a.courseId]
            const due = dueLabel(a.dueDate)
            const isOverdue = a.dueDate < today
            return (
              <li key={a.id} className="px-4 py-3 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  {isOverdue && (
                    <AlertTriangle size={12} className="text-danger shrink-0" />
                  )}
                  <span className="text-sm font-display text-slate-200 leading-snug flex-1 min-w-0 truncate">
                    {a.title}
                  </span>
                  <Badge
                    label={a.priority}
                    className={PRIORITY_BADGE[a.priority]}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {course && (
                    <span
                      className="text-[10px] font-display font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: course.color + '25', color: course.color }}
                    >
                      {course.code}
                    </span>
                  )}
                  <span className={`text-[11px] font-mono ml-auto ${due.className}`}>
                    {due.text}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
