import { format, subDays } from 'date-fns'
import type { WorkoutSession, WorkoutPlan, DayOfWeek } from '../types'

/** Epley estimated 1-rep max */
export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/** Best estimated 1RM for a named exercise in one session */
export function sessionBest1RM(session: WorkoutSession, exercise: string): number | null {
  const ex = session.exercises.find(e => e.name.toLowerCase() === exercise.toLowerCase())
  if (!ex || ex.sets.length === 0) return null
  return Math.max(...ex.sets.map(s => estimated1RM(s.weight, s.reps)))
}

/** Total volume (kg × reps) for a session, optionally filtered to one exercise */
export function sessionVolume(session: WorkoutSession, exercise?: string): number {
  const exs = exercise
    ? session.exercises.filter(e => e.name.toLowerCase() === exercise.toLowerCase())
    : session.exercises
  return Math.round(exs.reduce((t, e) => t + e.sets.reduce((s, set) => s + set.weight * set.reps, 0), 0))
}

/** Unique exercise names across all sessions, sorted */
export function allExerciseNames(sessions: WorkoutSession[]): string[] {
  const names = new Set<string>()
  sessions.forEach(s => s.exercises.forEach(e => names.add(e.name)))
  return Array.from(names).sort()
}

/**
 * True when the 3 most recent sessions containing the exercise show
 * no meaningful 1RM improvement (< threshold kg between max and min).
 */
export function isStagnating(sessions: WorkoutSession[], exercise: string, threshold = 2.5): boolean {
  const relevant = [...sessions]
    .filter(s => s.exercises.some(e => e.name.toLowerCase() === exercise.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (relevant.length < 3) return false
  const rms = relevant.slice(-3)
    .map(s => sessionBest1RM(s, exercise))
    .filter((x): x is number => x !== null)
  if (rms.length < 3) return false
  return Math.max(...rms) - Math.min(...rms) < threshold
}

/** Streak = consecutive planned-workout days (backwards from today) with a logged session */
export function computeStreak(sessions: WorkoutSession[], plan: WorkoutPlan): number {
  const sessionDates = new Set(sessions.map(s => s.date))
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayDow = today.getDay() as DayOfWeek
  const todayPlan = plan.days.find(d => d.dayOfWeek === todayDow)
  let streak = todayPlan && !todayPlan.isRest && sessionDates.has(todayStr) ? 1 : 0
  for (let i = 1; i <= 365; i++) {
    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as DayOfWeek
    const planDay = plan.days.find(d => d.dayOfWeek === dow)
    if (!planDay || planDay.isRest) continue
    if (sessionDates.has(dateStr)) streak++
    else break
  }
  return streak
}
