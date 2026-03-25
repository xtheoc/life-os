import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Plus, Moon, Dumbbell } from 'lucide-react'

function getGreeting(hour: number): { greeting: string; sub: string } {
  if (hour >= 5 && hour < 12) return { greeting: 'Good morning', sub: 'Make today count.' }
  if (hour >= 12 && hour < 18) return { greeting: 'Good afternoon', sub: 'Stay focused.' }
  if (hour >= 18 && hour < 22) return { greeting: 'Good evening', sub: 'Wind down soon.' }
  return { greeting: 'Late night', sub: 'You should be sleeping.' }
}

interface Props {
  onAddTask: () => void
  onLogSleep: () => void
}

export default function HeroBar({ onAddTask, onLogSleep }: Props) {
  const now = new Date()
  const { greeting, sub } = getGreeting(now.getHours())

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-white leading-tight">{greeting}</h1>
        <p className="text-muted text-sm mt-0.5">
          {format(now, 'EEE dd/MM/yy')} · {sub}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-semibold transition-colors bg-accent/15 border-accent/30 text-accent hover:bg-accent/25"
        >
          <Plus size={13} /> Task
        </button>
        <button
          onClick={onLogSleep}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-semibold transition-colors bg-purple-500/15 border-purple-500/30 text-purple-400 hover:bg-purple-500/25"
        >
          <Moon size={13} /> Log Sleep
        </button>
        <Link
          to="/workout"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-display font-semibold transition-colors bg-success/15 border-success/30 text-success hover:bg-success/25"
        >
          <Dumbbell size={13} /> Workout
        </Link>
      </div>
    </div>
  )
}
