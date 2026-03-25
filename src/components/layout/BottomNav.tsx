import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  GraduationCap,
  ListChecks,
  Dumbbell,
  MoreHorizontal,
  TrendingUp,
  CalendarDays,
  Moon,
  Settings,
  X,
  Sparkles,
  ClipboardList,
} from 'lucide-react'

const PRIMARY_NAV = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/school', icon: GraduationCap, label: 'School', end: false },
  { to: '/tasks', icon: ListChecks, label: 'Tasks', end: false },
  { to: '/workout', icon: Dumbbell, label: 'Workout', end: false },
]

const MORE_NAV = [
  { to: '/chores', icon: Sparkles, label: 'Chores' },
  { to: '/finance', icon: TrendingUp, label: 'Finance' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/review', icon: ClipboardList, label: 'Review' },
  { to: '/sleep', icon: Moon, label: 'Sleep' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  function handleMore(to: string) {
    setMoreOpen(false)
    navigate(to)
  }

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-50 lg:hidden bg-surface border-t border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-display font-semibold text-muted uppercase tracking-wider">
              More
            </span>
            <button
              onClick={() => setMoreOpen(false)}
              className="text-muted hover:text-slate-300"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {MORE_NAV.map(({ to, icon: Icon, label }) => (
              <button
                key={to}
                onClick={() => handleMore(to)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
              >
                <Icon size={20} />
                <span className="text-[10px] font-display">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-surface border-t border-border flex">
        {PRIMARY_NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-display transition-colors ${
                isActive ? 'text-accent' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-display transition-colors ${
            moreOpen ? 'text-accent' : 'text-slate-500'
          }`}
        >
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
