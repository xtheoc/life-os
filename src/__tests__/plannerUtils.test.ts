import { describe, it, expect, afterEach, vi } from 'vitest'
import { generateDayPlan } from '../lib/plannerUtils'
import type { UserPreferences, WorkoutPlan, RecurringEvent, Assignment, Task } from '../types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const prefs: UserPreferences = {
  wakeTime: '07:00',
  sleepTime: '23:00',
  studyBlockMinutes: 90,
  breakMinutes: 15,
  maxStudyHoursPerDay: 4,
  weightUnit: 'kg',
  weeklyWeighInDay: 1,
  currency: '€',
  semesterTargets: { 1: 10, 2: 10 },
  budgetLimits: {},
}

// Mon/Wed/Fri plan
const workoutPlan: WorkoutPlan = {
  days: [
    { dayOfWeek: 0, label: '', isRest: true },
    { dayOfWeek: 1, label: 'Push', isRest: false },
    { dayOfWeek: 2, label: '', isRest: true },
    { dayOfWeek: 3, label: 'Pull', isRest: false },
    { dayOfWeek: 4, label: '', isRest: true },
    { dayOfWeek: 5, label: 'Legs', isRest: false },
    { dayOfWeek: 6, label: '', isRest: true },
  ],
}

const classEvent: RecurringEvent = {
  id: 're1',
  title: 'Maths',
  category: 'class',
  daysOfWeek: [1, 3],  // Mon + Wed
  startTime: '09:00',
  endTime: '11:00',
  active: true,
}

const urgentAssignment: Assignment = {
  id: 'a1',
  courseId: 'c1',
  title: 'Devoir rendu demain',
  type: 'assignment',
  dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  priority: 'urgent',
  status: 'todo',
  estimatedHours: 2,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fakeMonday() {
  vi.useFakeTimers()
  // 2026-03-23 is a Monday
  vi.setSystemTime(new Date('2026-03-23T12:00:00'))
  return '2026-03-23'
}

function fakeTuesday() {
  vi.useFakeTimers()
  // 2026-03-24 is a Tuesday (rest day)
  vi.setSystemTime(new Date('2026-03-24T12:00:00'))
  return '2026-03-24'
}

afterEach(() => vi.useRealTimers())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateDayPlan', () => {
  it('always includes a morning routine block', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    const morning = blocks.find(b => b.type === 'morning')
    expect(morning).toBeDefined()
    expect(morning!.startTime).toBe('07:00')
    expect(morning!.endTime).toBe('07:30')
  })

  it('includes class blocks for recurring events on that day', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [classEvent], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    const classBlock = blocks.find(b => b.type === 'class')
    expect(classBlock).toBeDefined()
    expect(classBlock!.title).toBe('Maths')
    expect(classBlock!.startTime).toBe('09:00')
  })

  it('does not include class block when event is on a different day', () => {
    const date = fakeTuesday()  // Tuesday, classEvent is Mon+Wed only
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [classEvent], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    expect(blocks.find(b => b.type === 'class')).toBeUndefined()
  })

  it('includes workout block on a workout day', () => {
    const date = fakeMonday()  // Monday = Push day
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    const workout = blocks.find(b => b.type === 'workout')
    expect(workout).toBeDefined()
    expect(workout!.title).toBe('Push')
  })

  it('does not include workout block on a rest day', () => {
    const date = fakeTuesday()  // Tuesday = rest
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    expect(blocks.find(b => b.type === 'workout')).toBeUndefined()
  })

  it('adds study block for urgent assignments due within 3 days', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [urgentAssignment], tasks: [], workoutPlan, choreSchedules: [] })
    const study = blocks.find(b => b.type === 'study')
    expect(study).toBeDefined()
    expect(study!.assignmentId).toBe('a1')
  })

  it('does not add study block for done assignments', () => {
    const date = fakeMonday()
    const done: Assignment = { ...urgentAssignment, status: 'done' }
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [done], tasks: [], workoutPlan, choreSchedules: [] })
    expect(blocks.find(b => b.type === 'study')).toBeUndefined()
  })

  it('returns blocks sorted by startTime', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [classEvent], assignments: [urgentAssignment], tasks: [], workoutPlan, choreSchedules: [] })
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].startTime >= blocks[i - 1].startTime).toBe(true)
    }
  })

  it('blocks do not overlap', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [classEvent], assignments: [urgentAssignment], tasks: [], workoutPlan, choreSchedules: [] })
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i]
        const b = blocks[j]
        const overlap = a.startTime < b.endTime && b.startTime < a.endTime
        expect(overlap).toBe(false)
      }
    }
  })

  it('all blocks have valid startTime < endTime', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [classEvent], assignments: [urgentAssignment], tasks: [], workoutPlan, choreSchedules: [] })
    for (const b of blocks) {
      expect(b.startTime < b.endTime).toBe(true)
    }
  })

  it('all blocks include required fields', () => {
    const date = fakeMonday()
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [], tasks: [], workoutPlan, choreSchedules: [] })
    for (const b of blocks) {
      expect(b.id).toBeTruthy()
      expect(b.date).toBe(date)
      expect(b.title).toBeTruthy()
      expect(b.type).toBeTruthy()
      expect(typeof b.completed).toBe('boolean')
    }
  })

  it('respects high-priority task block', () => {
    const date = fakeTuesday()
    const task: Task = {
      id: 't1',
      title: 'Lettre de motivation',
      category: 'admin',
      priority: 'high',
      estimatedMinutes: 45,
      completed: false,
      createdAt: '2026-01-01',
    }
    const blocks = generateDayPlan({ date, prefs, recurringEvents: [], assignments: [], tasks: [task], workoutPlan, choreSchedules: [] })
    const taskBlock = blocks.find(b => b.taskId === 't1')
    expect(taskBlock).toBeDefined()
    expect(taskBlock!.type).toBe('admin')
  })
})
