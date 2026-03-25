import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, GraduationCap, ListChecks, TrendingUp, CalendarDays,
  Dumbbell, Moon, Settings, LayoutDashboard, Sparkles, ChevronDown, ChevronRight, ClipboardList,
} from 'lucide-react'

const SINGLE_NAV = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/school', icon: GraduationCap, label: 'School', end: false },
]

const TODO_NAV = [
  { to: '/tasks', icon: ListChecks, label: 'Tasks', end: false },
  { to: '/chores', icon: Sparkles, label: 'Chores', end: false },
]

const BOTTOM_NAV = [
  { to: '/finance', icon: TrendingUp, label: 'Finance', end: false },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar', end: false },
  { to: '/review', icon: ClipboardList, label: 'Weekly Review', end: false },
  { to: '/workout', icon: Dumbbell, label: 'Workout', end: false },
  { to: '/sleep', icon: Moon, label: 'Sleep', end: false },
]

function NavItem({
  to,
  icon: Icon,
  label,
  end,
}: {
  to: string
  icon: React.ElementType
  label: string
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-accent/15 text-accent'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      <Icon size={18} />
      <span className="font-display">{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const [todoOpen, setTodoOpen] = useState(true)

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-surface border-r border-border h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
          <LayoutDashboard size={16} className="text-accent" />
        </div>
        <span className="font-display text-base font-bold text-white tracking-tight">
          Life OS
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {SINGLE_NAV.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* To-Do group */}
        <div className="pt-1">
          <button
            onClick={() => setTodoOpen(o => !o)}
            className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-display font-semibold text-muted uppercase tracking-wider hover:text-slate-300 transition-colors"
          >
            <span>To-Do</span>
            {todoOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {todoOpen && (
            <div className="pl-2 space-y-0.5 mt-0.5">
              {TODO_NAV.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-1 space-y-0.5">
          {BOTTOM_NAV.map(item => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      {/* Settings pinned at bottom */}
      <div className="p-3 border-t border-border">
        <NavItem to="/settings" icon={Settings} label="Settings" end={false} />
      </div>
    </aside>
  )
}
