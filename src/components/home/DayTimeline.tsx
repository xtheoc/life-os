import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ArrowRight, Check } from 'lucide-react'
import { format } from 'date-fns'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { generateDayPlan, BLOCK_COLORS } from '../../lib/plannerUtils'
import type { PlannerBlock } from '../../types'

interface BlockRowProps {
  block: PlannerBlock
  isCurrent: boolean
  isDone: boolean
  isPast: boolean
  onToggle: (id: string) => void
  isSaved: boolean
}

function BlockRow({ block, isCurrent, isDone, isPast, onToggle, isSaved }: BlockRowProps) {
  const color = BLOCK_COLORS[block.type] ?? BLOCK_COLORS.custom

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isCurrent
          ? 'bg-accent/10 ring-1 ring-accent/30'
          : isDone
          ? 'opacity-40'
          : isPast
          ? 'opacity-60'
          : 'hover:bg-white/4'
      }`}
    >
      {/* Left accent bar / pulse indicator */}
      <div
        className={`w-0.5 h-8 rounded-full shrink-0 ${isCurrent ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color, opacity: isDone ? 0.4 : 1 }}
      />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-display font-medium truncate ${
          isCurrent ? 'text-white' : isDone ? 'text-muted line-through' : 'text-slate-300'
        }`}>
          {block.title}
        </p>
        <p className="font-mono text-[11px] text-muted mt-0.5">
          {block.startTime} – {block.endTime}
        </p>
      </div>

      {isCurrent && !isDone && (
        <span className="text-[10px] font-display font-semibold text-accent bg-accent/15 px-2 py-0.5 rounded-full shrink-0">
          Now
        </span>
      )}

      {/* Tick-off button — only for saved blocks */}
      {isSaved && (
        <button
          onClick={() => onToggle(block.id)}
          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
            isDone
              ? 'border-success/50 bg-success/15'
              : 'border-border hover:border-success'
          }`}
          aria-label={isDone ? 'Mark incomplete' : 'Mark done'}
        >
          {isDone && <Check size={10} className="text-success" />}
        </button>
      )}
    </div>
  )
}

export default function DayTimeline() {
  const { plannerBlocks, preferences, recurringEvents, assignments, tasks, workoutPlan, choreSchedules } = useAppState()
  const dispatch = useAppDispatch()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const savedBlocks = plannerBlocks
    .filter(b => b.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const autoBlocks = useMemo(() => {
    if (savedBlocks.length > 0) return []
    return generateDayPlan({
      date: todayStr,
      prefs: preferences,
      recurringEvents,
      assignments,
      tasks,
      workoutPlan,
      choreSchedules,
    })
  }, [savedBlocks.length, todayStr, preferences, recurringEvents, assignments, tasks, workoutPlan, choreSchedules])

  const blocks = savedBlocks.length > 0 ? savedBlocks : autoBlocks
  const isSaved = savedBlocks.length > 0
  const nowStr = format(new Date(), 'HH:mm')
  const MAX = 7

  const currentIdx = blocks.findIndex(b => b.startTime <= nowStr && nowStr < b.endTime)

  function toggleBlock(id: string) {
    const block = savedBlocks.find(b => b.id === id)
    if (!block) return
    dispatch({ type: 'UPDATE_PLANNER_BLOCK', payload: { ...block, completed: !block.completed } })
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarClock size={15} className="text-muted" />
          <span className="font-display font-semibold text-sm text-slate-200">Today's plan</span>
          {autoBlocks.length > 0 && (
            <span className="text-[10px] text-muted font-display bg-white/5 px-2 py-0.5 rounded-full">auto</span>
          )}
        </div>
        <Link
          to="/calendar"
          className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
        >
          Calendar <ArrowRight size={11} />
        </Link>
      </div>

      {blocks.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-muted text-sm font-display">No plan for today</p>
        </div>
      ) : (
        <div className="px-2 py-2 space-y-0.5">
          {blocks.slice(0, MAX).map((block, i) => (
            <BlockRow
              key={block.id}
              block={block}
              isCurrent={i === currentIdx}
              isDone={!!block.completed}
              isPast={block.endTime < nowStr}
              onToggle={toggleBlock}
              isSaved={isSaved}
            />
          ))}
          {blocks.length > MAX && (
            <Link
              to="/calendar"
              className="block text-center text-xs text-muted hover:text-slate-300 transition-colors py-1.5 font-display"
            >
              +{blocks.length - MAX} more →
            </Link>
          )}
          {!isSaved && blocks.length > 0 && (
            <p className="text-center text-[10px] text-muted font-display py-1">
              Save plan in Calendar to tick off items
            </p>
          )}
        </div>
      )}
    </div>
  )
}
