import { useState } from 'react'
import { format, subDays } from 'date-fns'
import Modal from '../ui/Modal'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { useToast } from '../ui/Toast'
import { calcSleepDuration, uid } from '../../lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function QuickSleepModal({ isOpen, onClose }: Props) {
  const { preferences } = useAppState()
  const dispatch = useAppDispatch()
  const { toast } = useToast()

  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const [sleepDate, setSleepDate] = useState(yesterday)
  const [sleepTime, setSleepTime] = useState(preferences.sleepTime)
  const [wakeDate, setWakeDate] = useState(today)
  const [wakeTime, setWakeTime] = useState(preferences.wakeTime)
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const durationMinutes = calcSleepDuration(sleepDate, sleepTime, wakeDate, wakeTime)
    if (durationMinutes <= 0) {
      toast('Wake time must be after sleep time', 'error')
      return
    }
    dispatch({
      type: 'ADD_SLEEP_LOG',
      payload: { id: uid(), sleepDate, sleepTime, wakeDate, wakeTime, durationMinutes, quality },
    })
    toast('Sleep logged', 'success')
    onClose()
  }

  const inputClass = 'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-slate-200 font-display outline-none focus:border-accent/60 transition-colors'
  const labelClass = 'block text-xs font-display font-semibold text-muted mb-1.5'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Sleep" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Sleep date</label>
            <input type="date" value={sleepDate} onChange={e => setSleepDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Sleep time</label>
            <input type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Wake date</label>
            <input type="date" value={wakeDate} onChange={e => setWakeDate(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Wake time</label>
            <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Quality</label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(quality === q ? undefined : q)}
                className={`flex-1 py-2 rounded-lg text-sm font-display font-semibold transition-colors border ${
                  quality === q
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-surface border-border text-muted hover:text-slate-300 hover:border-white/20'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-display font-semibold text-sm hover:bg-purple-500/30 transition-colors"
        >
          Log sleep
        </button>
      </form>
    </Modal>
  )
}
