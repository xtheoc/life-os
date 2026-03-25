import { describe, it, expect, vi, afterEach } from 'vitest'
import { format, subDays } from 'date-fns'
import {
  estimated1RM, sessionBest1RM, sessionVolume,
  allExerciseNames, isStagnating, computeStreak,
} from '../lib/workoutUtils'
import type { WorkoutSession, WorkoutPlan, ExerciseSet } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSession(date: string, exercises: { name: string; sets: ExerciseSet[] }[]): WorkoutSession {
  return { id: date, date, label: 'Session', exercises, durationMinutes: 60 }
}

function sets(...pairs: [number, number][]): ExerciseSet[] {
  return pairs.map(([weight, reps]) => ({ weight, reps, unit: 'kg' as const }))
}

// Mon/Wed/Fri plan
const plan: WorkoutPlan = {
  days: [
    { dayOfWeek: 0, label: '', isRest: true },   // Sun
    { dayOfWeek: 1, label: 'Push', isRest: false }, // Mon
    { dayOfWeek: 2, label: '', isRest: true },   // Tue
    { dayOfWeek: 3, label: 'Pull', isRest: false }, // Wed
    { dayOfWeek: 4, label: '', isRest: true },   // Thu
    { dayOfWeek: 5, label: 'Legs', isRest: false }, // Fri
    { dayOfWeek: 6, label: '', isRest: true },   // Sat
  ],
}

// ─── estimated1RM ─────────────────────────────────────────────────────────────

describe('estimated1RM', () => {
  it('returns weight directly for 1 rep', () => {
    expect(estimated1RM(100, 1)).toBe(100)
  })

  it('applies Epley formula', () => {
    // 80kg × (1 + 8/30) = 80 * 1.2667 = 101.3
    expect(estimated1RM(80, 8)).toBeCloseTo(101.3, 0)
  })

  it('returns 0 for zero weight or reps', () => {
    expect(estimated1RM(0, 5)).toBe(0)
    expect(estimated1RM(80, 0)).toBe(0)
  })

  it('increases with reps for same weight', () => {
    expect(estimated1RM(60, 5)).toBeLessThan(estimated1RM(60, 10))
  })
})

// ─── sessionBest1RM ───────────────────────────────────────────────────────────

describe('sessionBest1RM', () => {
  it('returns null when exercise not in session', () => {
    const s = makeSession('2026-01-01', [{ name: 'Squat', sets: sets([100, 5]) }])
    expect(sessionBest1RM(s, 'Bench')).toBeNull()
  })

  it('returns best 1RM across all sets', () => {
    const s = makeSession('2026-01-01', [
      { name: 'Bench', sets: sets([80, 5], [85, 3], [70, 8]) },
    ])
    const rm85 = estimated1RM(85, 3)
    const rm80 = estimated1RM(80, 5)
    const rm70 = estimated1RM(70, 8)
    expect(sessionBest1RM(s, 'Bench')).toBe(Math.max(rm85, rm80, rm70))
  })

  it('is case-insensitive', () => {
    const s = makeSession('2026-01-01', [{ name: 'bench press', sets: sets([100, 1]) }])
    expect(sessionBest1RM(s, 'Bench Press')).toBe(100)
  })
})

// ─── sessionVolume ────────────────────────────────────────────────────────────

describe('sessionVolume', () => {
  it('calculates total volume (kg × reps)', () => {
    const s = makeSession('2026-01-01', [
      { name: 'Squat', sets: sets([100, 5], [100, 5]) },  // 1000
      { name: 'Bench', sets: sets([80, 8]) },              // 640
    ])
    expect(sessionVolume(s)).toBe(1640)
  })

  it('filters to one exercise when name provided', () => {
    const s = makeSession('2026-01-01', [
      { name: 'Squat', sets: sets([100, 5]) },
      { name: 'Bench', sets: sets([80, 8]) },
    ])
    expect(sessionVolume(s, 'Squat')).toBe(500)
    expect(sessionVolume(s, 'Bench')).toBe(640)
  })
})

// ─── allExerciseNames ─────────────────────────────────────────────────────────

describe('allExerciseNames', () => {
  it('returns sorted unique names', () => {
    const sessions = [
      makeSession('2026-01-01', [{ name: 'Squat', sets: [] }, { name: 'Bench', sets: [] }]),
      makeSession('2026-01-03', [{ name: 'Squat', sets: [] }, { name: 'Deadlift', sets: [] }]),
    ]
    expect(allExerciseNames(sessions)).toEqual(['Bench', 'Deadlift', 'Squat'])
  })

  it('returns empty array for no sessions', () => {
    expect(allExerciseNames([])).toEqual([])
  })
})

// ─── isStagnating ─────────────────────────────────────────────────────────────

describe('isStagnating', () => {
  it('returns false when fewer than 3 sessions', () => {
    const sessions = [
      makeSession('2026-01-01', [{ name: 'Bench', sets: sets([80, 5]) }]),
      makeSession('2026-01-03', [{ name: 'Bench', sets: sets([82, 5]) }]),
    ]
    expect(isStagnating(sessions, 'Bench')).toBe(false)
  })

  it('detects stagnation when 1RM range < threshold', () => {
    const sessions = [
      makeSession('2026-01-01', [{ name: 'Bench', sets: sets([80, 5]) }]),
      makeSession('2026-01-03', [{ name: 'Bench', sets: sets([80, 5]) }]),
      makeSession('2026-01-05', [{ name: 'Bench', sets: sets([81, 5]) }]),
    ]
    // 1RMs are very close, < 2.5kg range
    expect(isStagnating(sessions, 'Bench', 2.5)).toBe(true)
  })

  it('returns false when 1RM is improving beyond threshold', () => {
    const sessions = [
      makeSession('2026-01-01', [{ name: 'Bench', sets: sets([80, 5]) }]),
      makeSession('2026-01-03', [{ name: 'Bench', sets: sets([85, 5]) }]),
      makeSession('2026-01-05', [{ name: 'Bench', sets: sets([90, 5]) }]),
    ]
    expect(isStagnating(sessions, 'Bench', 2.5)).toBe(false)
  })

  it('returns false when exercise not found', () => {
    const sessions = [
      makeSession('2026-01-01', [{ name: 'Squat', sets: sets([100, 5]) }]),
      makeSession('2026-01-03', [{ name: 'Squat', sets: sets([100, 5]) }]),
      makeSession('2026-01-05', [{ name: 'Squat', sets: sets([100, 5]) }]),
    ]
    expect(isStagnating(sessions, 'Bench')).toBe(false)
  })
})

// ─── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  afterEach(() => vi.useRealTimers())

  function fakeToday(isoDate: string) {
    // pin "today" to a specific date via fake timers
    vi.useFakeTimers()
    vi.setSystemTime(new Date(isoDate + 'T12:00:00'))
  }

  it('returns 0 when no sessions', () => {
    fakeToday('2026-03-24') // Monday
    expect(computeStreak([], plan)).toBe(0)
  })

  it('counts streak from last planned workout day backwards', () => {
    // Today = Wednesday 2026-03-25 (planned workout day)
    fakeToday('2026-03-25')
    const mon = format(subDays(new Date('2026-03-25'), 2), 'yyyy-MM-dd') // 2026-03-23
    const wed = '2026-03-25'
    const sessions = [
      makeSession(mon, [{ name: 'Push', sets: sets([80, 5]) }]),
      makeSession(wed, [{ name: 'Pull', sets: sets([60, 8]) }]),
    ]
    // Wed (today, planned) = 1, Mon (planned, 2 days ago) = +1, streak = 2
    expect(computeStreak(sessions, plan)).toBe(2)
  })

  it('breaks streak on a missed planned day', () => {
    // Today = Friday 2026-03-27 (Legs day)
    fakeToday('2026-03-27')
    const fri = '2026-03-27'
    // Wed was missed, Mon logged
    const mon = '2026-03-23'
    const sessions = [
      makeSession(mon, [{ name: 'Push', sets: sets([80, 5]) }]),
      makeSession(fri, [{ name: 'Legs', sets: sets([100, 5]) }]),
    ]
    // Fri (today, logged) = 1; Wed is planned but missed → break
    expect(computeStreak(sessions, plan)).toBe(1)
  })

  it('skips rest days transparently', () => {
    // Today = Wednesday 2026-03-25
    fakeToday('2026-03-25')
    const mon = '2026-03-23'
    const wed = '2026-03-25'
    // Tue is a rest day — should be transparent
    const sessions = [
      makeSession(mon, [{ name: 'Push', sets: sets([80, 5]) }]),
      makeSession(wed, [{ name: 'Pull', sets: sets([60, 8]) }]),
    ]
    expect(computeStreak(sessions, plan)).toBe(2)
  })

  it('returns 0 when today is a rest day with no prior streak', () => {
    fakeToday('2026-03-24') // Tuesday — rest day
    const sessions = [
      makeSession('2026-03-23', [{ name: 'Push', sets: sets([80, 5]) }]),
    ]
    // Today is rest, Mon logged → streak should still count Mon
    expect(computeStreak(sessions, plan)).toBe(1)
  })
})
