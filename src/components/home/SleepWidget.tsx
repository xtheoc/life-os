import { Link } from 'react-router-dom'
import { Moon, ArrowRight, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAppState } from '../../context/AppContext'
import { Card, CardHeader } from '../ui/Card'
import { formatDuration } from '../../lib/utils'

function qualityDots(quality?: number) {
  if (!quality) return null
  return (
    <div className="flex gap-0.5 mt-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= quality ? 'bg-accent' : 'bg-border'
          }`}
        />
      ))}
    </div>
  )
}

export default function SleepWidget() {
  const { sleepLogs } = useAppState()

  const sorted = [...sleepLogs].sort((a, b) => {
    const da = `${a.wakeDate} ${a.wakeTime}`
    const db = `${b.wakeDate} ${b.wakeTime}`
    return db.localeCompare(da)
  })

  const latest = sorted[0] ?? null

  const avg7 =
    sorted.length > 0
      ? Math.round(
          sorted.slice(0, 7).reduce((s, l) => s + l.durationMinutes, 0) /
            Math.min(sorted.length, 7)
        )
      : null

  return (
    <Card>
      <CardHeader
        title="Sleep"
        icon={Moon}
        action={
          <Link
            to="/sleep"
            className="text-[11px] text-accent hover:text-blue-400 font-display flex items-center gap-1 transition-colors"
          >
            Log <ArrowRight size={11} />
          </Link>
        }
      />

      {!latest ? (
        <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
          <Moon size={26} className="text-muted" />
          <p className="text-muted text-xs">No sleep logged yet.</p>
          <Link
            to="/sleep"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-blue-400 font-display transition-colors"
          >
            <Plus size={12} /> Log last night
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Last sleep */}
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-mono text-2xl font-semibold text-white">
                {formatDuration(latest.durationMinutes)}
              </span>
              {qualityDots(latest.quality)}
            </div>
            <div className="font-mono text-xs text-muted">
              {latest.sleepTime}
              <span className="mx-1 text-border">→</span>
              {latest.wakeTime}
              <span className="ml-1 text-slate-500">
                ({format(new Date(latest.wakeDate + 'T00:00'), 'EEE dd/MM')})
              </span>
            </div>
          </div>

          {/* 7-day average */}
          {avg7 !== null && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-display">7-day avg</span>
                <span className="font-mono text-sm text-slate-300">
                  {formatDuration(avg7)}
                </span>
              </div>
              {avg7 < 7 * 60 && (
                <p className="text-[11px] text-warning mt-1">
                  Below 7h average — aim for more rest.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
