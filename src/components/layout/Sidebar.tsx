import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, GraduationCap, ListChecks, TrendingUp, CalendarDays,
  Dumbbell, Moon, Settings, LayoutDashboard, Sparkles,
  ChevronDown, ChevronRight, ClipboardList,
} from 'lucide-react'

function NavItem({
  to, icon: Icon, label, end = false,
}: {
  to: string; icon: React.ElementType; label: string; end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      <Icon size={18} />
      <span className="font-display">{label}</span>
    </NavLink>
  )
}

function Group({
  label, children, defaultOpen = true,
}: {
  label: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="pt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-display font-semibold text-muted uppercase tracking-wider hover:text-slate-300 transition-colors"
      >
        <span>{label}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="pl-2 space-y-0.5 mt-0.5">{children}</div>}
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-surface border-r border-border h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
          <LayoutDashboard size={16} className="text-accent" />
        </div>
        <span className="font-display text-base font-bold text-white tracking-tight">Life OS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <NavItem to="/" icon={Home} label="Home" end />
        <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
        <NavItem to="/school" icon={GraduationCap} label="School" />

        <Group label="To-Do">
          <NavItem to="/tasks" icon={ListChecks} label="Tasks" />
          <NavItem to="/chores" icon={Sparkles} label="Chores" />
        </Group>

        <Group label="Trackers">
          <NavItem to="/finance" icon={TrendingUp} label="Finance" />
          <NavItem to="/workout" icon={Dumbbell} label="Workout" />
          <NavItem to="/sleep" icon={Moon} label="Sleep" />
        </Group>
      </nav>

      {/* Weekly Review + Settings pinned at bottom */}
      <div className="p-3 border-t border-border space-y-0.5">
        <NavItem to="/review" icon={ClipboardList} label="Weekly Review" />
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}
