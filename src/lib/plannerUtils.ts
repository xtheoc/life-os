import { timeToMinutes, minutesToTime } from './utils'
import { uid } from './utils'
import type {
  PlannerBlock, BlockType, UserPreferences,
  RecurringEvent, Assignment, Task, WorkoutPlan, DayOfWeek, ChoreSchedule,
} from '../types'

// ─── Block colour map ─────────────────────────────────────────────────────────

export const BLOCK_COLORS: Record<BlockType, string> = {
  morning:  '#f59e0b',
  study:    '#3b82f6',
  class:    '#06b6d4',
  workout:  '#22c55e',
  chore:    '#64748b',
  break:    '#475569',
  free:     '#1e2d45',
  personal: '#8b5cf6',
  admin:    '#f97316',
  custom:   '#94a3b8',
}

// ─── Auto-scheduler ───────────────────────────────────────────────────────────

interface ScheduleInput {
  date: string  // yyyy-MM-dd
  prefs: UserPreferences
  recurringEvents: RecurringEvent[]
  assignments: Assignment[]
  tasks: Task[]
  workoutPlan: WorkoutPlan
  choreSchedules: ChoreSchedule[]
}

interface Slot { start: number; end: number }  // minutes from midnight

function overlaps(a: Slot, b: Slot): boolean {
  return a.start < b.end && b.start < a.end
}

function findFreeSlot(
  occupied: Slot[],
  duration: number,
  earliest: number,
  latest: number,
): number | null {
  let cursor = earliest
  while (cursor + duration <= latest) {
    const slot: Slot = { start: cursor, end: cursor + duration }
    const conflict = occupied.find(o => overlaps(slot, o))
    if (!conflict) return cursor
    cursor = conflict.end
  }
  return null
}

export function generateDayPlan(input: ScheduleInput): PlannerBlock[] {
  const { date, prefs, recurringEvents, assignments, tasks, workoutPlan, choreSchedules } = input
  const blocks: PlannerBlock[] = []
  const occupied: Slot[] = []

  const wake = timeToMinutes(prefs.wakeTime)
  const bedtime = timeToMinutes(prefs.sleepTime) || 1440
  const sleepEnd = bedtime < wake ? bedtime + 1440 : bedtime

  const dateObj = new Date(date + 'T12:00:00')
  const dow = dateObj.getDay() as DayOfWeek
  const isWeekend = dow === 0 || dow === 6  // 0=Sunday, 6=Saturday
  const today = new Date(date)

  function addBlock(startMin: number, endMin: number, title: string, type: BlockType, extras: Partial<PlannerBlock> = {}) {
    if (endMin <= startMin) return
    blocks.push({ id: uid(), date, startTime: minutesToTime(startMin), endTime: minutesToTime(endMin), title, type, completed: false, color: BLOCK_COLORS[type], ...extras })
    occupied.push({ start: startMin, end: endMin })
  }

  // 1. Morning routine (30 min after wake)
  addBlock(wake, wake + 30, 'Morning routine', 'morning')

  // 2. Fixed recurring events (classes — always scheduled at their fixed times)
  for (const re of recurringEvents) {
    if (!re.active || !re.daysOfWeek.includes(dow)) continue
    const start = timeToMinutes(re.startTime)
    const end = timeToMinutes(re.endTime)
    const type: BlockType = re.category === 'class' ? 'class' : 'chore'
    addBlock(start, end, re.title, type)
  }

  // 3. Workout (if workout day) — schedule before noon if possible, else mid-afternoon
  const planDay = workoutPlan.days.find(d => d.dayOfWeek === dow)
  if (planDay && !planDay.isRest) {
    const dur = 75  // slightly longer for warmup/cooldown
    // Prefer 10:00–12:00 window, or 16:00–18:00 fallback
    let slot = findFreeSlot(occupied, dur, 10 * 60, 12 * 60)
    if (slot === null) slot = findFreeSlot(occupied, dur, 16 * 60, 18 * 60)
    if (slot === null) slot = findFreeSlot(occupied, dur, wake + 30, sleepEnd - 90)
    if (slot !== null) addBlock(slot, slot + dur, planDay.label || 'Workout', 'workout')
  }

  // 4. Lunch (always 12:30–13:15 if free, expand window if needed)
  {
    const lunchDur = 45
    let lSlot = findFreeSlot(occupied, lunchDur, 12 * 60, 13 * 60 + 30)
    if (lSlot === null) lSlot = findFreeSlot(occupied, lunchDur, 11 * 60 + 30, 14 * 60)
    if (lSlot !== null) addBlock(lSlot, lSlot + lunchDur, 'Lunch', 'break')
  }

  // 5. Study blocks for assignments due within 7 days (weekday) or 3 days (weekend)
  const assignmentDayLimit = isWeekend ? 3 : 7
  const dueAssignments = assignments
    .filter(a => a.status !== 'done' && a.dueDate)
    .filter(a => {
      const diff = (new Date(a.dueDate).getTime() - today.getTime()) / 86400000
      return diff >= -1 && diff <= assignmentDayLimit
    })
    .sort((a, b) => {
      const p: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
      return p[a.priority] - p[b.priority]
    })

  const maxStudyBlocks = isWeekend ? 2 : 3  // fewer on weekends
  const studyBlockDur = prefs.studyBlockMinutes
  let studyBlocksAdded = 0
  let studyMinLeft = prefs.maxStudyHoursPerDay * 60

  for (const asgn of dueAssignments) {
    if (studyBlocksAdded >= maxStudyBlocks || studyMinLeft <= 0) break
    const dur = Math.min(studyBlockDur, studyMinLeft)
    // Prefer afternoon study on weekdays (after 14:00), morning on weekends
    const studyEarliest = isWeekend ? wake + 60 : 14 * 60
    const slot = findFreeSlot(occupied, dur, studyEarliest, sleepEnd - 120)
      ?? findFreeSlot(occupied, dur, wake + 60, sleepEnd - 120)  // fallback
    if (slot !== null) {
      addBlock(slot, slot + dur, `Study: ${asgn.title}`, 'study', { assignmentId: asgn.id })
      studyMinLeft -= dur
      studyBlocksAdded++
      // Break after each study block
      const breakSlot = findFreeSlot(occupied, prefs.breakMinutes, slot + dur, sleepEnd)
      if (breakSlot !== null) addBlock(breakSlot, breakSlot + prefs.breakMinutes, 'Break', 'break')
    }
  }

  // 6. Chore blocks — calculate due chores for this date
  // On weekends: include overdue + due today + due within 4 days (proactive)
  // On weekdays: only overdue (must do today) + due today
  function nextDue(c: ChoreSchedule): string {
    if (c.lastDone) {
      const base = new Date(c.lastDone + 'T12:00:00')
      base.setDate(base.getDate() + c.frequencyDays)
      return base.toISOString().slice(0, 10)
    }
    return date  // if never done, it's due today
  }

  const activeDueChores = choreSchedules.filter(c => {
    if (!c.active) return false
    const nd = nextDue(c)
    if (isWeekend) {
      // On weekends, schedule overdue + due within 4 days
      const diff = (new Date(nd + 'T12:00:00').getTime() - today.getTime()) / 86400000
      return diff <= 4
    } else {
      // Weekdays: only overdue or due today
      return nd <= date
    }
  }).sort((a, b) => {
    const da = nextDue(a)
    const db = nextDue(b)
    return da.localeCompare(db)  // most overdue first
  })

  const maxChoreBlocks = isWeekend ? 4 : 2
  let choreBlocksAdded = 0
  for (const chore of activeDueChores) {
    if (choreBlocksAdded >= maxChoreBlocks) break
    const dur = chore.durationMinutes ?? 20
    // Prefer morning for chores on weekends (10:00+), mid-morning on weekdays
    const choreEarliest = isWeekend ? 9 * 60 : 10 * 60
    const slot = findFreeSlot(occupied, dur, choreEarliest, 18 * 60)
      ?? findFreeSlot(occupied, dur, wake + 30, sleepEnd - 120)
    if (slot !== null) {
      addBlock(slot, slot + dur, chore.title, 'chore')
      choreBlocksAdded++
    }
  }

  // 7. Tasks — sorted by priority, includes medium when due soon
  const PRANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const schedulableTasks = tasks
    .filter(t => !t.completed && t.category !== 'chore')
    .filter(t => {
      if (t.priority === 'urgent' || t.priority === 'high') return true
      // Include medium if due within 3 days
      if (t.priority === 'medium' && t.dueDate) {
        const diff = (new Date(t.dueDate + 'T12:00:00').getTime() - today.getTime()) / 86400000
        return diff <= 3
      }
      return false
    })
    .sort((a, b) => {
      const pd = PRANK[a.priority] - PRANK[b.priority]
      if (pd !== 0) return pd
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return 0
    })
    .slice(0, isWeekend ? 2 : 3)

  const typeMap: Record<string, BlockType> = {
    personal: 'personal', admin: 'admin', errand: 'admin', school: 'study',
  }

  for (const task of schedulableTasks) {
    const dur = task.estimatedMinutes ?? 30
    // No preferred window — fit it anywhere in the day
    const slot = findFreeSlot(occupied, dur, wake + 30, sleepEnd - 90)
    if (slot !== null) {
      addBlock(slot, slot + dur, task.title, typeMap[task.category] ?? 'personal', { taskId: task.id })
    }
  }

  // 8. Dinner (19:00 for 45 min)
  {
    const dinnerStart = 19 * 60
    const dinnerDur = 45
    const slot = findFreeSlot(occupied, dinnerDur, dinnerStart, 20 * 60 + 30)
    if (slot !== null) addBlock(slot, slot + dinnerDur, 'Dinner', 'break')
  }

  // 9. Evening wind-down (30 min before bed)
  const windStart = sleepEnd - 30
  const windSlot = findFreeSlot(occupied, 30, windStart - 15, sleepEnd)
  if (windSlot !== null) addBlock(windSlot, windSlot + 30, 'Wind down', 'free')

  return blocks.sort((a, b) => a.startTime.localeCompare(b.startTime))
}
