import { useState, useMemo, useEffect, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO,
} from 'date-fns'
import { useAppState, useAppDispatch } from '../context/AppContext'
import { ChevronLeft, ChevronRight, X, RefreshCw, Check, Trash2, Plus, Upload, Edit2 } from 'lucide-react'
import { generateDayPlan, BLOCK_COLORS } from '../lib/plannerUtils'
import { timeToMinutes, uid } from '../lib/utils'
import type { DayOfWeek, PlannerBlock, BlockType, CalendarEvent, CalEventRecurrence } from '../types'
import Modal from '../components/ui/Modal'

// ─── Event colours ────────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  class:      '#3b82f6',
  assignment: '#f59e0b',
  task:       '#f97316',
  workout:    '#22c55e',
  sleep:      '#8b5cf6',
  chore:      '#64748b',
  event:      '#a78bfa',
}

// ─── Unified event type ───────────────────────────────────────────────────────

interface CalEvent {
  id: string
  date: string        // yyyy-MM-dd
  title: string
  kind: keyof typeof DOT
  time?: string       // HH:mm
  endTime?: string    // HH:mm (for timed events with known duration)
  sub?: string
}

// ─── Block type labels ────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  morning:  'Routine',
  study:    'Study',
  class:    'Class',
  workout:  'Workout',
  chore:    'Chore',
  break:    'Break',
  free:     'Free time',
  personal: 'Personal',
  admin:    'Admin',
  custom:   'Other',
}

// ─── .ics parser ──────────────────────────────────────────────────────────────

function parseICS(text: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const vevents = text.split('BEGIN:VEVENT').slice(1)
  for (const block of vevents) {
    const get = (key: string) => {
      const m = block.match(new RegExp(`(?:^|\\n)${key}[^:]*:([^\\r\\n]+)`, 'i'))
      return m?.[1]?.trim()
    }
    const summary = get('SUMMARY')
    const dtstart = get('DTSTART')
    const dtend = get('DTEND')
    const description = get('DESCRIPTION')
    if (!summary || !dtstart) continue

    const dateMatch = dtstart.replace(/[TZ]/g, '').match(/^(\d{4})(\d{2})(\d{2})/)
    if (!dateMatch) continue
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`

    const timeMatch = dtstart.match(/T(\d{2})(\d{2})/)
    const startTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : undefined

    const endTimeMatch = dtend?.match(/T(\d{2})(\d{2})/)
    const endTime = endTimeMatch ? `${endTimeMatch[1]}:${endTimeMatch[2]}` : undefined

    events.push({
      id: uid(),
      title: summary,
      date,
      startTime,
      endTime,
      allDay: !timeMatch,
      color: '#a78bfa',
      notes: description,
      recurrence: 'none',
    })
  }
  return events
}

// ─── Build calendar events from AppState ─────────────────────────────────────

function useCalEvents(): CalEvent[] {
  const { assignments, tasks, recurringEvents, workoutSessions, workoutPlan, sleepLogs, choreSchedules, calendarEvents } = useAppState()

  return useMemo(() => {
    const evs: CalEvent[] = []

    // Assignments with due dates
    for (const a of assignments) {
      if (a.dueDate) {
        evs.push({ id: `a-${a.id}`, date: a.dueDate, title: a.title, kind: 'assignment', sub: a.status })
      }
    }

    // Tasks with due dates
    for (const t of tasks) {
      if (t.dueDate && !t.completed) {
        evs.push({ id: `t-${t.id}`, date: t.dueDate, title: t.title, kind: 'task' })
      }
    }

    // Recurring events — expand over ±60 days
    const today = new Date()
    for (const re of recurringEvents) {
      if (!re.active) continue
      for (let offset = -30; offset <= 60; offset++) {
        const d = addDays(today, offset)
        const dow = d.getDay() as DayOfWeek
        if (re.daysOfWeek.includes(dow)) {
          const dateStr = format(d, 'yyyy-MM-dd')
          evs.push({
            id: `re-${re.id}-${dateStr}`,
            date: dateStr,
            title: re.title,
            kind: re.category === 'class' ? 'class' : 'chore',
            time: re.startTime,
            endTime: re.endTime,
          })
        }
      }
    }

    // Workout sessions
    for (const ws of workoutSessions) {
      evs.push({ id: `ws-${ws.id}`, date: ws.date, title: ws.label, kind: 'workout' })
    }

    // Planned workout days (from workoutPlan) — shown as all-day markers
    for (let offset = -30; offset <= 60; offset++) {
      const d = addDays(today, offset)
      const dow = d.getDay() as DayOfWeek
      const planDay = workoutPlan.days.find(pd => pd.dayOfWeek === dow)
      if (planDay && !planDay.isRest) {
        const dateStr = format(d, 'yyyy-MM-dd')
        // Only add if no logged session exists for that date
        const hasSession = workoutSessions.some(ws => ws.date === dateStr)
        if (!hasSession) {
          evs.push({
            id: `wp-${dateStr}-${dow}`,
            date: dateStr,
            title: planDay.label || 'Workout',
            kind: 'workout',
          })
        }
      }
    }

    // Sleep logs — show on wake date
    for (const sl of sleepLogs) {
      const h = Math.floor(sl.durationMinutes / 60)
      const m = sl.durationMinutes % 60
      evs.push({
        id: `sl-${sl.id}`,
        date: sl.wakeDate,
        title: `Sleep ${h}h${m > 0 ? m + 'm' : ''}`,
        kind: 'sleep',
      })
    }

    // Chore schedules — expand occurrences in a ±60 day window
    const todayDate = new Date()
    for (const cs of choreSchedules) {
      if (!cs.active) continue
      const anchor = cs.lastDone
        ? parseISO(cs.lastDone)
        : addDays(todayDate, -cs.frequencyDays)
      const windowStart = addDays(todayDate, -30)
      let n = Math.ceil((windowStart.getTime() - anchor.getTime()) / (cs.frequencyDays * 86400000))
      if (n < 1) n = 1
      let occ = addDays(anchor, n * cs.frequencyDays)
      const windowEnd = addDays(todayDate, 60)
      while (occ <= windowEnd) {
        const dateStr = format(occ, 'yyyy-MM-dd')
        evs.push({
          id: `cs-${cs.id}-${dateStr}`,
          date: dateStr,
          title: cs.title,
          kind: 'chore',
          sub: cs.durationMinutes ? `${cs.durationMinutes}min` : undefined,
        })
        occ = addDays(occ, cs.frequencyDays)
      }
    }

    // Manual calendar events — expand recurrences in ±60 day window
    const windowStart = addDays(today, -60)
    const windowEnd = addDays(today, 60)

    for (const ce of calendarEvents) {
      const baseDate = parseISO(ce.date)

      const emit = (d: Date) => {
        const dateStr = format(d, 'yyyy-MM-dd')
        evs.push({
          id: `cev-${ce.id}-${dateStr}`,
          date: dateStr,
          title: ce.title,
          kind: 'event',
          time: ce.startTime,
          endTime: ce.endTime,
          sub: ce.recurrence !== 'none' ? ce.recurrence : undefined,
        })
      }

      if (ce.recurrence === 'none') {
        emit(baseDate)
      } else if (ce.recurrence === 'daily') {
        let d = windowStart
        while (d <= windowEnd) {
          emit(d)
          d = addDays(d, 1)
        }
      } else if (ce.recurrence === 'weekly') {
        const dow = baseDate.getDay()
        let d = windowStart
        while (d <= windowEnd) {
          if (d.getDay() === dow) emit(d)
          d = addDays(d, 1)
        }
      } else if (ce.recurrence === 'monthly') {
        // Same day of month, ±2 months
        for (let mo = -2; mo <= 2; mo++) {
          const candidate = new Date(baseDate.getFullYear(), baseDate.getMonth() + mo, baseDate.getDate())
          if (candidate >= windowStart && candidate <= windowEnd) emit(candidate)
        }
      } else if (ce.recurrence === 'yearly') {
        // Same date ±1 year
        for (let yr = -1; yr <= 1; yr++) {
          const candidate = new Date(baseDate.getFullYear() + yr, baseDate.getMonth(), baseDate.getDate())
          if (candidate >= windowStart && candidate <= windowEnd) emit(candidate)
        }
      }
    }

    return evs
  }, [assignments, tasks, recurringEvents, workoutSessions, workoutPlan, sleepLogs, choreSchedules, calendarEvents])
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND: { kind: string; label: string }[] = [
  { kind: 'class', label: 'Class' },
  { kind: 'assignment', label: 'Assignment' },
  { kind: 'task', label: 'Task' },
  { kind: 'workout', label: 'Workout' },
  { kind: 'sleep', label: 'Sleep' },
  { kind: 'chore', label: 'Chore' },
  { kind: 'event', label: 'Event' },
]

// ─── EventModal ───────────────────────────────────────────────────────────────

const EVENT_COLORS = [
  { hex: '#a78bfa', label: 'Purple' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#22c55e', label: 'Green' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#ec4899', label: 'Pink' },
]

function EventModal({ initial, defaultDate, onClose }: {
  initial?: CalendarEvent
  defaultDate?: string
  onClose: () => void
}) {
  const dispatch = useAppDispatch()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [allDay, setAllDay] = useState(initial?.allDay ?? true)
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00')
  const [endTime, setEndTime] = useState(initial?.endTime ?? '10:00')
  const [color, setColor] = useState(initial?.color ?? '#a78bfa')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [recurrence, setRecurrence] = useState<CalEventRecurrence>(initial?.recurrence ?? 'none')

  function handleSave() {
    if (!title.trim() || !date) return
    const ev: CalendarEvent = {
      id: initial?.id ?? uid(),
      title: title.trim(),
      date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      color,
      notes: notes.trim() || undefined,
      recurrence,
    }
    if (initial) {
      dispatch({ type: 'UPDATE_CALENDAR_EVENT', payload: ev })
    } else {
      dispatch({ type: 'ADD_CALENDAR_EVENT', payload: ev })
    }
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    dispatch({ type: 'DELETE_CALENDAR_EVENT', payload: { id: initial.id } })
    onClose()
  }

  return (
    <Modal isOpen title={initial ? 'Edit Event' : 'Add Event'} onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="Event title"
            autoFocus
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Date *</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </div>

        {/* All day toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="allday"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          <label htmlFor="allday" className="text-sm text-white cursor-pointer">All day</label>
        </div>

        {/* Time fields */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {/* Color */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-2">Color</label>
          <div className="flex gap-2">
            {EVENT_COLORS.map(c => (
              <button
                key={c.hex}
                title={c.label}
                onClick={() => setColor(c.hex)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c.hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Recurrence</label>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as CalEventRecurrence)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-muted mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent resize-none"
            placeholder="Optional notes…"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          {initial ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-danger hover:bg-danger/10 text-sm transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white bg-card hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !date}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {initial ? 'Save' : 'Add Event'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── ICS Import Confirmation ──────────────────────────────────────────────────

function ICSImportConfirm({ events, onConfirm, onCancel }: {
  events: CalendarEvent[]
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal isOpen title="Import Calendar Events" onClose={onCancel} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-white">
          Found <span className="font-bold text-accent">{events.length}</span> event{events.length !== 1 ? 's' : ''} in the .ics file.
          Import all?
        </p>
        {events.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {events.slice(0, 10).map(e => (
              <div key={e.id} className="text-xs text-muted px-2 py-1 bg-card rounded">
                <span className="text-white font-medium">{e.title}</span> — {e.date}
              </div>
            ))}
            {events.length > 10 && (
              <div className="text-xs text-muted px-2">…and {events.length - 10} more</div>
            )}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white bg-card hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={events.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent/80 disabled:opacity-50 transition-colors"
          >
            Import {events.length} Event{events.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Day side panel ───────────────────────────────────────────────────────────

function DayPanel({ date, events, onClose, onAddEvent, onEditEvent }: {
  date: Date
  events: CalEvent[]
  onClose: () => void
  onAddEvent: (date: string) => void
  onEditEvent: (ev: CalendarEvent) => void
}) {
  const state = useAppState()
  const label = format(date, 'EEEE d MMMM yyyy')
  const ds = format(date, 'yyyy-MM-dd')

  const sorted = [...events].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  const dayBlocks = useMemo(
    () => state.plannerBlocks.filter(b => b.date === ds).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state.plannerBlocks, ds],
  )

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-surface border-l border-border z-40 flex flex-col shadow-2xl lg:relative lg:inset-auto lg:w-72 lg:shadow-none lg:border-l lg:rounded-xl lg:overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-display font-semibold text-white capitalize">{label}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddEvent(ds)}
            className="p-1 rounded text-muted hover:text-accent transition-colors"
            title="Add event"
          >
            <Plus size={15} />
          </button>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {/* Planner blocks section */}
        {dayBlocks.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 pt-1">Day Plan</p>
            {dayBlocks.map(block => {
              const color = block.color ?? BLOCK_COLORS[block.type]
              return (
                <div key={block.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-card">
                  <div className="mt-0.5 w-1 h-full min-h-[24px] rounded-full shrink-0" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium truncate ${block.completed ? 'line-through text-muted' : 'text-white'}`}>
                      {block.title}
                    </p>
                    <p className="text-xs text-muted">
                      {block.startTime}–{block.endTime} · {BLOCK_LABELS[block.type]}
                    </p>
                  </div>
                </div>
              )
            })}
            {sorted.length > 0 && <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 pt-2">Events</p>}
          </>
        )}

        {/* Calendar events */}
        {sorted.length === 0 && dayBlocks.length === 0 && (
          <p className="text-xs text-muted text-center py-8">No events</p>
        )}
        {sorted.map(ev => {
          const isManualEvent = ev.kind === 'event'
          const calEv = isManualEvent
            ? state.calendarEvents.find(e => `cev-${e.id}-${ev.date}` === ev.id)
            : undefined

          return (
            <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-card group">
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: DOT[ev.kind] }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white font-medium truncate">{ev.title}</p>
                <p className="text-xs text-muted">
                  {ev.time && <span>{ev.time} · </span>}
                  <span className="capitalize">{ev.kind}</span>
                  {ev.sub && <span> · {ev.sub}</span>}
                </p>
              </div>
              {isManualEvent && calEv && (
                <button
                  onClick={() => onEditEvent(calEv)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-white transition-all shrink-0"
                  title="Edit event"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  month, events, selected, onSelect,
}: {
  month: Date
  events: CalEvent[]
  selected: Date | null
  onSelect: (d: Date) => void
}) {
  const today = new Date()
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let cur = gridStart
  while (cur <= gridEnd) { days.push(cur); cur = addDays(cur, 1) }

  const byDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events])

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="flex-1 min-w-0">
      <div className="grid grid-cols-7 border-b border-border">
        {DOW.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1">
        {days.map(day => {
          const ds = format(day, 'yyyy-MM-dd')
          const dayEvs = byDate[ds] ?? []
          const isToday = isSameDay(day, today)
          const isSelected = selected && isSameDay(day, selected)
          const inMonth = isSameMonth(day, month)
          const kinds = Array.from(new Set(dayEvs.map(e => e.kind))).slice(0, 4)

          return (
            <button
              key={ds}
              onClick={() => onSelect(day)}
              className={`min-h-[72px] p-1.5 border-b border-r border-border/40 text-left flex flex-col transition-colors ${
                isSelected ? 'bg-accent/15' : 'hover:bg-white/5'
              } ${!inMonth ? 'opacity-30' : ''}`}>
              <span className={`text-xs font-mono w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                isToday ? 'bg-accent text-white font-bold' : 'text-muted'
              }`}>
                {format(day, 'd')}
              </span>
              <div className="flex flex-wrap gap-0.5">
                {kinds.map(k => (
                  <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: DOT[k] }} />
                ))}
              </div>
              {dayEvs[0] && (
                <p className="hidden sm:block text-[10px] leading-tight text-muted mt-0.5 truncate w-full">
                  {dayEvs[0].title}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week view ────────────────────────────────────────────────────────────────

// Grid covers hours 6–24 = 18 hours = 1080px (1px per minute)
const GRID_START_HOUR = 6
const GRID_TOTAL_MINUTES = 18 * 60  // 1080

const HOURS = Array.from({ length: 18 }, (_, i) => i + GRID_START_HOUR) // 06–23

/** Convert HH:mm to pixel offset from top of the grid */
function timeToPx(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h * 60 + m) - GRID_START_HOUR * 60
}

// Chip color classes for all-day chips
const CHIP_COLORS: Record<string, string> = {
  assignment: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  task:       'bg-orange-500/20 text-orange-300 border-orange-500/30',
  chore:      'bg-slate-500/20 text-slate-300 border-slate-500/30',
  workout:    'bg-green-500/20 text-green-300 border-green-500/30',
  sleep:      'bg-violet-500/20 text-violet-300 border-violet-500/30',
  class:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  event:      'bg-purple-400/20 text-purple-300 border-purple-400/30',
}

function WeekView({ weekStart, events, plannerBlocks }: {
  weekStart: Date
  events: CalEvent[]
  plannerBlocks: PlannerBlock[]
}) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Split events into all-day and timed
  const allDayEvs = events.filter(e => !e.time)
  const timedEvs  = events.filter(e => !!e.time)

  return (
    <div className="flex-1 min-w-0 overflow-x-auto">

      {/* ── Sticky header: day names + all-day row ── */}
      <div className="sticky top-0 bg-surface z-10 border-b border-border">

        {/* Day name headers */}
        <div className="grid grid-cols-8">
          <div className="py-2" />
          {days.map(d => {
            const isToday = isSameDay(d, today)
            return (
              <div key={d.toISOString()} className="py-2 text-center">
                <p className="text-xs text-muted">{format(d, 'EEE')}</p>
                <p className={`text-sm font-mono mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-accent text-white font-bold' : 'text-white'
                }`}>{format(d, 'd')}</p>
              </div>
            )
          })}
        </div>

        {/* All-day row */}
        <div className="grid grid-cols-8 border-t border-border/40">
          <div className="flex items-start pt-1.5 pr-2 justify-end">
            <span className="text-[9px] text-muted font-mono">All day</span>
          </div>
          {days.map(d => {
            const ds = format(d, 'yyyy-MM-dd')
            const chips = allDayEvs.filter(e =>
              e.date === ds && ['assignment', 'task', 'chore', 'workout', 'event'].includes(e.kind)
            )
            const visible = chips.slice(0, 3)
            const extra   = chips.length - visible.length

            return (
              <div key={ds} className="border-l border-border/30 px-0.5 py-1 min-h-[36px] flex flex-col gap-0.5">
                {visible.map(ev => (
                  <span
                    key={ev.id}
                    className={`text-[9px] leading-tight px-1 py-0.5 rounded border truncate ${CHIP_COLORS[ev.kind] ?? 'bg-white/10 text-white'}`}
                    title={ev.title}>
                    {ev.title}
                  </span>
                ))}
                {extra > 0 && (
                  <span className="text-[9px] text-muted pl-1">+{extra} more</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Time grid ── */}
      <div className="relative grid grid-cols-8" style={{ height: GRID_TOTAL_MINUTES }}>

        {/* Hour labels column */}
        <div className="col-span-1">
          {HOURS.map(h => (
            <div key={h} style={{ height: 60 }} className="border-b border-border/30 flex items-start pt-1 pr-2">
              <span className="text-[10px] text-muted font-mono ml-1">{String(h).padStart(2, '0')}h</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(d => {
          const ds = format(d, 'yyyy-MM-dd')
          const dayTimed  = timedEvs.filter(e => e.date === ds)
          const dayBlocks = plannerBlocks.filter(b => b.date === ds)

          return (
            <div key={ds} className="col-span-1 relative border-l border-border/30">
              {/* Hour grid lines */}
              {HOURS.map(h => (
                <div key={h} style={{ height: 60 }} className="border-b border-border/20" />
              ))}

              {/* Recurring / timed calendar events */}
              {dayTimed.map(ev => {
                const top    = timeToPx(ev.time!)
                const bottom = ev.endTime ? timeToPx(ev.endTime) : top + 60
                const height = Math.max(20, bottom - top)

                // Skip if out of grid range
                if (top >= GRID_TOTAL_MINUTES || top < 0) return null

                return (
                  <div
                    key={ev.id}
                    className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] leading-tight overflow-hidden z-10"
                    style={{
                      top,
                      height,
                      background: DOT[ev.kind] + '30',
                      borderLeft: `2px solid ${DOT[ev.kind]}`,
                      color: DOT[ev.kind],
                    }}>
                    <span className="font-semibold">{ev.title}</span>
                    {ev.time && <span className="opacity-70 block">{ev.time}</span>}
                  </div>
                )
              })}

              {/* Planner blocks — overlaid on top */}
              {dayBlocks.map(block => {
                const startMin = timeToMinutes(block.startTime)
                const endMin   = timeToMinutes(block.endTime)
                const dur      = endMin - startMin
                const top      = timeToPx(block.startTime)
                const height   = Math.max(20, dur)

                // Skip break/free if very short (< 15 min)
                if ((block.type === 'break' || block.type === 'free') && dur < 15) return null
                // Skip if out of grid range
                if (top >= GRID_TOTAL_MINUTES || top < 0) return null

                const color = block.color ?? BLOCK_COLORS[block.type]

                return (
                  <div
                    key={block.id}
                    className="absolute rounded px-1 py-0.5 text-[10px] leading-tight overflow-hidden z-20"
                    style={{
                      top,
                      height,
                      left: '2px',
                      right: '2px',
                      background: color + '25',
                      borderLeft: `2px solid ${color}`,
                      color,
                      opacity: block.completed ? 0.5 : 0.9,
                    }}>
                    <span className="font-semibold block truncate">{block.title}</span>
                    {height >= 28 && (
                      <span className="opacity-70">{BLOCK_LABELS[block.type]}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Today view (Day Planner) ─────────────────────────────────────────────────

function BlockRow({
  block,
  onToggle,
  onDelete,
}: {
  block: PlannerBlock
  onToggle: () => void
  onDelete: () => void
}) {
  const color = block.color ?? BLOCK_COLORS[block.type]
  const dur = timeToMinutes(block.endTime) - timeToMinutes(block.startTime)
  const durLabel = dur >= 60
    ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? (dur % 60) + 'm' : ''}`
    : `${dur}m`

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
      block.completed
        ? 'bg-card/40 border-border/30 opacity-60'
        : 'bg-card border-border'
    }`}>
      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: color }} />
      <div className="text-right shrink-0 w-20">
        <p className="text-xs font-mono text-white">{block.startTime}</p>
        <p className="text-xs font-mono text-muted">{block.endTime}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${block.completed ? 'line-through text-muted' : 'text-white'}`}>
          {block.title}
        </p>
        <p className="text-xs text-muted">
          {BLOCK_LABELS[block.type]} · {durLabel}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-all ${
          block.completed
            ? 'bg-success border-success text-white'
            : 'border-border hover:border-success hover:text-success text-transparent'
        }`}>
        <Check size={12} />
      </button>
      <button
        onClick={onDelete}
        className="text-muted hover:text-danger transition-colors shrink-0">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function TodayView() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const [confirmRegen, setConfirmRegen] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayBlocks = useMemo(
    () => state.plannerBlocks.filter(b => b.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state.plannerBlocks, todayStr],
  )

  // Auto-generate on first render if no blocks exist
  useEffect(() => {
    if (todayBlocks.length === 0) {
      const generated = generateDayPlan({
        date: todayStr,
        prefs: state.preferences,
        recurringEvents: state.recurringEvents,
        assignments: state.assignments,
        tasks: state.tasks,
        workoutPlan: state.workoutPlan,
        choreSchedules: state.choreSchedules,
      })
      dispatch({ type: 'SET_PLANNER_BLOCKS', payload: { date: todayStr, blocks: generated } })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function generate(force = false) {
    if (todayBlocks.length > 0 && !force) { setConfirmRegen(true); return }
    const generated = generateDayPlan({
      date: todayStr,
      prefs: state.preferences,
      recurringEvents: state.recurringEvents,
      assignments: state.assignments,
      tasks: state.tasks,
      workoutPlan: state.workoutPlan,
      choreSchedules: state.choreSchedules,
    })
    dispatch({ type: 'SET_PLANNER_BLOCKS', payload: { date: todayStr, blocks: generated } })
    setConfirmRegen(false)
  }

  function toggleBlock(id: string) {
    const block = todayBlocks.find(b => b.id === id)
    if (!block) return
    dispatch({ type: 'UPDATE_PLANNER_BLOCK', payload: { ...block, completed: !block.completed } })
  }

  function deleteBlock(id: string) {
    dispatch({ type: 'DELETE_PLANNER_BLOCK', payload: { id } })
  }

  const total = todayBlocks.length
  const done = todayBlocks.filter(b => b.completed).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  const dateLabel = format(new Date(), 'EEEE d MMMM yyyy')

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-display font-semibold text-white capitalize">{dateLabel}</p>
          <p className="text-xs text-muted">{done}/{total} blocks completed</p>
        </div>
        <button
          onClick={() => generate(false)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors">
          <RefreshCw size={14} />
          Regenerate
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Confirm regenerate */}
      {confirmRegen && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-warning">Replace the existing plan?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRegen(false)} className="text-xs text-muted hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-card">
              Cancel
            </button>
            <button onClick={() => generate(true)} className="text-xs text-white bg-warning rounded-lg px-3 py-1.5 hover:bg-warning/80 transition-colors">
              Replace
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center justify-center text-center">
          <p className="font-display font-semibold text-slate-300 mb-1">No plan yet</p>
          <p className="text-muted text-sm mb-4">Generate a schedule based on your classes, assignments and preferences.</p>
          <button
            onClick={() => generate(false)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/80 transition-colors">
            <RefreshCw size={14} />
            Generate plan
          </button>
        </div>
      )}

      {/* Block list */}
      {total > 0 && (
        <div className="space-y-2">
          {todayBlocks.map(block => (
            <BlockRow
              key={block.id}
              block={block}
              onToggle={() => toggleBlock(block.id)}
              onDelete={() => deleteBlock(block.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'today'>('month')
  const [month, setMonth] = useState(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selected, setSelected] = useState<Date | null>(null)

  // Event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined)
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined)

  // ICS import state
  const [icsEvents, setIcsEvents] = useState<CalendarEvent[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dispatch = useAppDispatch()

  const events = useCalEvents()
  const { plannerBlocks } = useAppState()

  function prevPeriod() {
    if (view === 'month') setMonth(m => subMonths(m, 1))
    else if (view === 'week') setWeekStart(w => addDays(w, -7))
  }
  function nextPeriod() {
    if (view === 'month') setMonth(m => addMonths(m, 1))
    else if (view === 'week') setWeekStart(w => addDays(w, 7))
  }
  function goToday() {
    setMonth(new Date())
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setSelected(new Date())
  }

  function openAddEvent(dateStr?: string) {
    setEditingEvent(undefined)
    setDefaultDate(dateStr)
    setEventModalOpen(true)
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev)
    setDefaultDate(undefined)
    setEventModalOpen(true)
  }

  function handleICSFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      const parsed = parseICS(text)
      setIcsEvents(parsed)
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  function confirmICSImport() {
    if (!icsEvents) return
    for (const ev of icsEvents) {
      dispatch({ type: 'ADD_CALENDAR_EVENT', payload: ev })
    }
    setIcsEvents(null)
  }

  const headerLabel = view === 'month'
    ? format(month, 'MMMM yyyy')
    : view === 'week'
    ? `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM yyyy')}`
    : format(new Date(), 'MMMM yyyy')

  const selectedEvents = selected
    ? events.filter(e => e.date === format(selected, 'yyyy-MM-dd'))
    : []

  const showNav = view !== 'today'

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-2">
          {showNav && (
            <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
          <h2 className="text-base font-display font-bold text-white capitalize w-44 text-center">{headerLabel}</h2>
          {showNav && (
            <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          )}
          {view !== 'today' && (
            <button onClick={goToday} className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors">
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          {view !== 'today' && (
            <div className="hidden md:flex items-center gap-3">
              {LEGEND.map(l => (
                <div key={l.kind} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: DOT[l.kind] }} />
                  <span className="text-xs text-muted">{l.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Import .ics */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleICSFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors"
            title="Import .ics calendar file"
          >
            <Upload size={13} />
            Import .ics
          </button>

          {/* Add event */}
          <button
            onClick={() => openAddEvent()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white hover:bg-accent/80 transition-colors"
          >
            <Plus size={13} />
            Event
          </button>

          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-card rounded-lg">
            {(['month', 'week', 'today'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${view === v ? 'bg-accent text-white' : 'text-muted hover:text-white'}`}>
                {v === 'month' ? 'Month' : v === 'week' ? 'Week' : 'Today'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'today' ? (
        <TodayView />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-auto bg-surface">
            {view === 'month'
              ? <MonthView month={month} events={events} selected={selected} onSelect={setSelected} />
              : <WeekView weekStart={weekStart} events={events} plannerBlocks={plannerBlocks} />
            }
          </div>

          {selected && (
            <DayPanel
              date={selected}
              events={selectedEvents}
              onClose={() => setSelected(null)}
              onAddEvent={openAddEvent}
              onEditEvent={openEditEvent}
            />
          )}
        </div>
      )}

      {/* Event modal */}
      {eventModalOpen && (
        <EventModal
          initial={editingEvent}
          defaultDate={defaultDate}
          onClose={() => setEventModalOpen(false)}
        />
      )}

      {/* ICS import confirmation */}
      {icsEvents !== null && (
        <ICSImportConfirm
          events={icsEvents}
          onConfirm={confirmICSImport}
          onCancel={() => setIcsEvents(null)}
        />
      )}
    </div>
  )
}
