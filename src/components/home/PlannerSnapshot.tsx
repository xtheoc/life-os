import { Link } from 'react-router-dom'
import { CalendarClock, ArrowRight, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import type { PlannerBlock } from '../../types'

const BLOCK_COLORS: Record<string, string> = {
  study: 'bg-accent/20 text-accent border-accent/30',
  workout: 'bg-success/20 text-success border-success/30',
  class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  chore: 'bg-muted/20 text-slate-400 border-muted/30',
  break: 'bg-white/5 text-slate-500 border-white/10',
  free: 'bg-white/5 text-slate-500 border-white/10',
  morning: 'bg-warning/20 text-warning border-warning/30',
  personal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  admin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  custom: 'bg-white/10 text-slate-300 border-white/20',
}

function BlockRow({ block }: { block: PlannerBlock }) {
  const color = BLOCK_COLORS[block.type] ?? BLOCK_COLORS.custom
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${color}`}>
      <span className="font-mono text-xs shrink-0 w-20 opacity-70">
        {block.startTime} – {block.endTime}
      </span>
      <span className="text-sm font-display font-medium truncate">{block.title}</span>
      {block.completed && (
        <span className="ml-auto text-[10px] text-success shrink-0">Done</span>
      )}
    </div>
  )
}

export default function PlannerSnapshot() {
  const { plannerBlocks } = useAppState()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayBlocks = plannerBlocks
    .filter(b => b.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const now = format(new Date(), 'HH:mm')
  const nextBlock = todayBlocks.find(b => b.startTime >= now && !b.completed)

  return (
    <Card>
      <CardHeader
        title="Planning du jour"
        icon={CalendarClock}
        action={
          <Link
            to="/planner"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            Voir tout <ArrowRight size={11} />
          </Link>
        }
      />

      {todayBlocks.length === 0 ? (
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <CalendarClock size={22} className="text-muted" />
          </div>
          <div>
            <p className="font-display font-semibold text-slate-300 text-sm mb-0.5">
              Aucun planning généré
            </p>
            <p className="text-muted text-xs">
              Programme ta journée automatiquement selon tes cours, devoirs et objectifs.
            </p>
          </div>
          <Link
            to="/planner"
            className="mt-1 flex items-center gap-2 bg-accent/20 hover:bg-accent/30 text-accent px-4 py-2 rounded-lg text-sm font-display font-semibold transition-colors"
          >
            <Zap size={14} />
            Générer le planning
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-2">
          {nextBlock && (
            <div className="mb-3 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2">
              <Zap size={13} className="text-accent shrink-0" />
              <span className="text-xs text-accent font-display font-medium">
                Next: {nextBlock.title} at {nextBlock.startTime}
              </span>
            </div>
          )}
          {todayBlocks.slice(0, 5).map(block => (
            <BlockRow key={block.id} block={block} />
          ))}
          {todayBlocks.length > 5 && (
            <Link
              to="/planner"
              className="block text-center text-xs text-muted hover:text-slate-300 transition-colors pt-1 font-display"
            >
              +{todayBlocks.length - 5} more blocks →
            </Link>
          )}
        </div>
      )}
    </Card>
  )
}
