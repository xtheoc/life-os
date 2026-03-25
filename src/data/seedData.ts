// Realistic demo data seeded on first run.
// All dates are relative to today so the data stays fresh.

import { addDays, subDays, format, subMonths, type Day } from 'date-fns'
import { uid } from '../lib/utils'
import type {
  AppState,
  UE,
  Course,
  Assignment,
  Grade,
  Task,
  RecurringEvent,
  ChoreSchedule,
  WorkoutPlan,
  WorkoutProgram,
  WorkoutSession,
  BodyweightLog,
  FinanceAccount,
  FinanceImport,
  Transaction,
  SleepLog,
  CalendarEvent,
  UserPreferences,
} from '../types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

const today = new Date()
const d = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd')
const ds = (offset: number) => format(subDays(today, offset), 'yyyy-MM-dd')
const monthStr = (monthOffset: number) =>
  format(subMonths(today, monthOffset), 'yyyy-MM')

/**
 * Returns the date string of the nth-most-recent occurrence of a given day of
 * week. nth=1 means the most recent (could be today), nth=2 means one week
 * before that, etc.
 */
function lastOccurrence(dow: Day, nth: number): string {
  const currentDow = today.getDay()
  let daysBack = currentDow - dow
  if (daysBack < 0) daysBack += 7
  return format(subDays(today, daysBack + (nth - 1) * 7), 'yyyy-MM-dd')
}

// ─── User preferences ────────────────────────────────────────────────────────

const preferences: UserPreferences = {
  wakeTime: '07:00',
  sleepTime: '23:30',
  studyBlockMinutes: 50,
  breakMinutes: 10,
  maxStudyHoursPerDay: 6,
  weightUnit: 'kg',
  weeklyWeighInDay: 1, // Monday
  currency: 'EUR',
  semesterTargets: { 1: 10, 2: 10 },
  budgetLimits: {},
}

// ─── UEs ──────────────────────────────────────────────────────────────────────

const ues: UE[] = [
  { id: uid(), name: 'Mathématiques', code: 'UE-MATH', credits: 6, semester: 1 },
  { id: uid(), name: 'Informatique', code: 'UE-INFO', credits: 6, semester: 1 },
  { id: uid(), name: 'Physique', code: 'UE-PHY', credits: 6, semester: 2 },
  { id: uid(), name: 'Langues Vivantes', code: 'UE-LV', credits: 6, semester: 2 },
]

const [mathUeId, infoUeId, phyUeId, lvUeId] = ues.map(u => u.id)

// ─── Courses ─────────────────────────────────────────────────────────────────

const courses: Course[] = [
  {
    id: uid(),
    ueId: mathUeId,
    name: 'Mathématiques',
    code: 'MATH301',
    coefficient: 1,
    continuousWeight: 0.4,
    finalWeight: 0.6,
    color: '#3b82f6',
  },
  {
    id: uid(),
    ueId: infoUeId,
    name: 'Informatique',
    code: 'INFO201',
    coefficient: 1,
    continuousWeight: 0.5,
    finalWeight: 0.5,
    color: '#22c55e',
  },
  {
    id: uid(),
    ueId: lvUeId,
    name: 'Anglais',
    code: 'ANG102',
    coefficient: 1,
    continuousWeight: 0.6,
    finalWeight: 0.4,
    color: '#f59e0b',
  },
  {
    id: uid(),
    ueId: phyUeId,
    name: 'Physique',
    code: 'PHY201',
    coefficient: 1,
    continuousWeight: 0.3,
    finalWeight: 0.7,
    color: '#a855f7',
  },
]

const [mathId, infoId, anglaisId, physiqueId] = courses.map(c => c.id)

// ─── Assignments ──────────────────────────────────────────────────────────────

const assignments: Assignment[] = [
  {
    id: uid(),
    courseId: mathId,
    title: 'Partiel de Mathématiques',
    type: 'exam',
    dueDate: d(3),
    priority: 'urgent',
    status: 'todo',
    estimatedHours: 4,
    description: 'Chapitres 4–7: intégrales, séries, équations différentielles.',
  },
  {
    id: uid(),
    courseId: mathId,
    title: 'TD Séries entières',
    type: 'assignment',
    dueDate: ds(2),
    priority: 'urgent',
    status: 'done',
    estimatedHours: 2,
  },
  {
    id: uid(),
    courseId: infoId,
    title: 'Projet Algorithmes',
    type: 'project',
    dueDate: d(8),
    priority: 'high',
    status: 'in-progress',
    estimatedHours: 12,
    description: "Implémentation et analyse d'un algorithme de tri avancé.",
  },
  {
    id: uid(),
    courseId: infoId,
    title: 'TP Structures de données',
    type: 'assignment',
    dueDate: d(14),
    priority: 'medium',
    status: 'todo',
    estimatedHours: 3,
  },
  {
    id: uid(),
    courseId: anglaisId,
    title: 'Présentation orale',
    type: 'assignment',
    dueDate: ds(1),
    priority: 'urgent',
    status: 'todo',
    estimatedHours: 2,
    description: 'Présentation 5 min sur un sujet technologique.',
  },
  {
    id: uid(),
    courseId: anglaisId,
    title: 'Essay: Technology & Society',
    type: 'assignment',
    dueDate: d(18),
    priority: 'low',
    status: 'todo',
    estimatedHours: 3,
  },
  {
    id: uid(),
    courseId: physiqueId,
    title: 'Rapport TP Optique',
    type: 'project',
    dueDate: d(10),
    priority: 'medium',
    status: 'todo',
    estimatedHours: 4,
  },
  {
    id: uid(),
    courseId: physiqueId,
    title: 'DS Mécanique quantique',
    type: 'exam',
    dueDate: d(22),
    priority: 'medium',
    status: 'todo',
    estimatedHours: 5,
  },
]

// ─── Grades ───────────────────────────────────────────────────────────────────

const grades: Grade[] = [
  {
    id: uid(),
    courseId: mathId,
    title: 'CC1 – Analyse',
    score: 14,
    maxScore: 20,
    category: 'continuous',
    date: ds(45),
  },
  {
    id: uid(),
    courseId: mathId,
    title: 'CC2 – Algèbre',
    score: 12,
    maxScore: 20,
    category: 'continuous',
    date: ds(21),
  },
  {
    id: uid(),
    courseId: infoId,
    title: 'CC1 – Algo & Structures',
    score: 16,
    maxScore: 20,
    category: 'continuous',
    date: ds(30),
  },
  {
    id: uid(),
    courseId: infoId,
    title: 'Projet midterm',
    score: 15,
    maxScore: 20,
    category: 'continuous',
    date: ds(14),
  },
  {
    id: uid(),
    courseId: anglaisId,
    title: 'CC Oral – Presentation skills',
    score: 15,
    maxScore: 20,
    category: 'continuous',
    date: ds(28),
  },
  {
    id: uid(),
    courseId: physiqueId,
    title: 'TP Mécanique',
    score: 10,
    maxScore: 20,
    category: 'continuous',
    date: ds(35),
  },
  {
    id: uid(),
    courseId: physiqueId,
    title: 'CC1 – Thermodynamique',
    score: 11,
    maxScore: 20,
    category: 'continuous',
    date: ds(20),
  },
]

// ─── Tasks ────────────────────────────────────────────────────────────────────

const tasks: Task[] = [
  {
    id: uid(),
    title: 'Pay electricity bill',
    category: 'admin',
    priority: 'urgent',
    dueDate: d(1),
    estimatedMinutes: 15,
    completed: false,
    createdAt: ds(3),
  },
  {
    id: uid(),
    title: 'Buy groceries',
    category: 'errand',
    priority: 'high',
    dueDate: d(0),
    estimatedMinutes: 45,
    completed: false,
    createdAt: ds(1),
  },
  {
    id: uid(),
    title: 'Clean bathroom',
    category: 'chore',
    priority: 'medium',
    dueDate: d(2),
    estimatedMinutes: 30,
    completed: false,
    createdAt: ds(2),
  },
  {
    id: uid(),
    title: 'Return library books',
    category: 'errand',
    priority: 'urgent',
    dueDate: ds(1),
    estimatedMinutes: 20,
    completed: false,
    createdAt: ds(7),
  },
  {
    id: uid(),
    title: 'Renew student card',
    category: 'admin',
    priority: 'high',
    dueDate: d(5),
    estimatedMinutes: 30,
    completed: false,
    createdAt: ds(5),
    notes: 'Must go to student services office (09:00–12:00)',
  },
  {
    id: uid(),
    title: 'Do laundry',
    category: 'chore',
    priority: 'medium',
    estimatedMinutes: 60,
    completed: false,
    createdAt: ds(4),
  },
  {
    id: uid(),
    title: 'Call insurance about refund',
    category: 'admin',
    priority: 'medium',
    dueDate: d(7),
    estimatedMinutes: 20,
    completed: false,
    createdAt: ds(6),
  },
  {
    id: uid(),
    title: 'Vacuum and mop apartment',
    category: 'chore',
    priority: 'low',
    estimatedMinutes: 45,
    completed: false,
    createdAt: ds(3),
  },
  {
    id: uid(),
    title: 'Doctor appointment booking',
    category: 'personal',
    priority: 'medium',
    dueDate: d(10),
    estimatedMinutes: 15,
    completed: false,
    createdAt: ds(8),
  },
  {
    id: uid(),
    title: 'Read chapter 5 – Physics',
    category: 'school',
    priority: 'high',
    dueDate: d(2),
    estimatedMinutes: 60,
    completed: false,
    createdAt: ds(1),
  },
  {
    id: uid(),
    title: 'Fix bike brakes',
    category: 'chore',
    priority: 'low',
    estimatedMinutes: 40,
    completed: false,
    createdAt: ds(10),
  },
  {
    id: uid(),
    title: 'Buy birthday gift for mum',
    category: 'personal',
    priority: 'high',
    dueDate: d(6),
    estimatedMinutes: 30,
    completed: false,
    createdAt: ds(2),
  },
  {
    id: uid(),
    title: 'Take out recycling',
    category: 'chore',
    priority: 'low',
    completed: true,
    completedAt: ds(1),
    createdAt: ds(3),
  },
  {
    id: uid(),
    title: 'Submit housing aid renewal',
    category: 'admin',
    priority: 'urgent',
    dueDate: ds(1),
    estimatedMinutes: 30,
    completed: true,
    completedAt: ds(1),
    createdAt: ds(5),
  },
]

// ─── Recurring events ────────────────────────────────────────────────────────

const recurringEvents: RecurringEvent[] = [
  {
    id: uid(),
    title: 'Mathématiques – CM',
    category: 'class',
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    startTime: '09:00',
    endTime: '10:30',
    color: '#3b82f6',
    active: true,
  },
  {
    id: uid(),
    title: 'Physique – CM',
    category: 'class',
    daysOfWeek: [2, 5], // Tue, Fri
    startTime: '10:30',
    endTime: '12:00',
    color: '#a855f7',
    active: true,
  },
  {
    id: uid(),
    title: 'Informatique – TP',
    category: 'class',
    daysOfWeek: [3, 4], // Wed, Thu
    startTime: '14:00',
    endTime: '16:00',
    color: '#22c55e',
    active: true,
  },
  {
    id: uid(),
    title: 'Anglais',
    category: 'class',
    daysOfWeek: [2, 4], // Tue, Thu
    startTime: '14:00',
    endTime: '15:30',
    color: '#f59e0b',
    active: true,
  },
  {
    id: uid(),
    title: 'Weekly deep clean',
    category: 'chore',
    daysOfWeek: [0], // Sunday
    startTime: '10:00',
    endTime: '12:00',
    color: '#64748b',
    active: true,
  },
]

// ─── Workout plan ────────────────────────────────────────────────────────────
// Mon = Push, Wed = Pull, Fri = Legs. All other days = rest.
// This keeps the streak logic clean regardless of what day the app is opened.

const workoutPlan: WorkoutPlan = {
  days: [
    { dayOfWeek: 0, label: 'Full Rest', isRest: true },
    { dayOfWeek: 1, label: 'Push – Chest / Shoulders / Triceps', isRest: false },
    { dayOfWeek: 2, label: 'Rest', isRest: true },
    { dayOfWeek: 3, label: 'Pull – Back / Biceps', isRest: false },
    { dayOfWeek: 4, label: 'Rest', isRest: true },
    { dayOfWeek: 5, label: 'Legs – Quads / Hamstrings / Glutes', isRest: false },
    { dayOfWeek: 6, label: 'Rest', isRest: true },
  ],
}

// ─── Workout sessions aligned to Mon/Wed/Fri regardless of today's weekday ───

const workoutSessions: WorkoutSession[] = [
  {
    id: uid(),
    date: lastOccurrence(1, 1), // Most recent Monday
    label: 'Push',
    durationMinutes: 65,
    exercises: [
      { name: 'Bench Press', sets: [{ weight: 75, reps: 5, unit: 'kg' }, { weight: 75, reps: 5, unit: 'kg' }, { weight: 75, reps: 5, unit: 'kg' }] },
      { name: 'Overhead Press', sets: [{ weight: 50, reps: 7, unit: 'kg' }, { weight: 50, reps: 7, unit: 'kg' }] },
      { name: 'Incline DB Press', sets: [{ weight: 24, reps: 9, unit: 'kg' }, { weight: 24, reps: 9, unit: 'kg' }] },
      { name: 'Lateral Raises', sets: [{ weight: 10, reps: 15, unit: 'kg' }, { weight: 10, reps: 14, unit: 'kg' }] },
    ],
  },
  {
    id: uid(),
    date: lastOccurrence(3, 1), // Most recent Wednesday
    label: 'Pull',
    durationMinutes: 62,
    exercises: [
      { name: 'Barbell Row', sets: [{ weight: 65, reps: 6, unit: 'kg' }, { weight: 65, reps: 6, unit: 'kg' }, { weight: 65, reps: 6, unit: 'kg' }] },
      { name: 'Pull-ups', sets: [{ weight: 0, reps: 8, unit: 'kg' }, { weight: 0, reps: 7, unit: 'kg' }] },
      { name: 'Barbell Curl', sets: [{ weight: 32.5, reps: 9, unit: 'kg' }, { weight: 32.5, reps: 8, unit: 'kg' }] },
    ],
  },
  {
    id: uid(),
    date: lastOccurrence(5, 1), // Most recent Friday
    label: 'Legs',
    durationMinutes: 72,
    exercises: [
      { name: 'Back Squat', sets: [{ weight: 85, reps: 5, unit: 'kg' }, { weight: 85, reps: 5, unit: 'kg' }, { weight: 85, reps: 4, unit: 'kg' }] },
      { name: 'Deadlift', sets: [{ weight: 100, reps: 4, unit: 'kg' }, { weight: 100, reps: 4, unit: 'kg' }] },
      { name: 'Leg Press', sets: [{ weight: 125, reps: 10, unit: 'kg' }, { weight: 125, reps: 9, unit: 'kg' }] },
      { name: 'Calf Raises', sets: [{ weight: 65, reps: 15, unit: 'kg' }, { weight: 65, reps: 14, unit: 'kg' }] },
    ],
  },
  {
    id: uid(),
    date: lastOccurrence(1, 2), // Monday last week
    label: 'Push',
    durationMinutes: 68,
    exercises: [
      { name: 'Bench Press', sets: [{ weight: 72.5, reps: 5, unit: 'kg' }, { weight: 72.5, reps: 5, unit: 'kg' }, { weight: 72.5, reps: 4, unit: 'kg' }] },
      { name: 'Overhead Press', sets: [{ weight: 47.5, reps: 8, unit: 'kg' }, { weight: 47.5, reps: 7, unit: 'kg' }] },
      { name: 'Incline DB Press', sets: [{ weight: 22, reps: 10, unit: 'kg' }, { weight: 22, reps: 9, unit: 'kg' }] },
      { name: 'Lateral Raises', sets: [{ weight: 10, reps: 15, unit: 'kg' }, { weight: 10, reps: 12, unit: 'kg' }] },
    ],
  },
  {
    id: uid(),
    date: lastOccurrence(3, 2), // Wednesday last week
    label: 'Pull',
    durationMinutes: 60,
    exercises: [
      { name: 'Barbell Row', sets: [{ weight: 62.5, reps: 6, unit: 'kg' }, { weight: 62.5, reps: 6, unit: 'kg' }, { weight: 62.5, reps: 5, unit: 'kg' }] },
      { name: 'Pull-ups', sets: [{ weight: 0, reps: 7, unit: 'kg' }, { weight: 0, reps: 6, unit: 'kg' }] },
      { name: 'Barbell Curl', sets: [{ weight: 30, reps: 10, unit: 'kg' }, { weight: 30, reps: 9, unit: 'kg' }] },
    ],
  },
  {
    id: uid(),
    date: lastOccurrence(5, 2), // Friday last week
    label: 'Legs',
    durationMinutes: 70,
    exercises: [
      { name: 'Back Squat', sets: [{ weight: 82.5, reps: 5, unit: 'kg' }, { weight: 82.5, reps: 5, unit: 'kg' }, { weight: 82.5, reps: 4, unit: 'kg' }] },
      { name: 'Romanian Deadlift', sets: [{ weight: 70, reps: 8, unit: 'kg' }, { weight: 70, reps: 7, unit: 'kg' }] },
      { name: 'Leg Press', sets: [{ weight: 120, reps: 10, unit: 'kg' }, { weight: 120, reps: 10, unit: 'kg' }] },
      { name: 'Calf Raises', sets: [{ weight: 60, reps: 15, unit: 'kg' }, { weight: 60, reps: 15, unit: 'kg' }] },
    ],
  },
]

// ─── Workout programs (A/B alternating) ──────────────────────────────────────

const workoutPrograms: WorkoutProgram[] = [
  {
    id: uid(),
    name: 'A – Push',
    exercises: [
      { name: 'Bench Press', sets: 3, reps: '5', notes: 'Focus on full ROM' },
      { name: 'Overhead Press', sets: 3, reps: '5' },
      { name: 'Incline DB Press', sets: 3, reps: '8–12' },
      { name: 'Lateral Raises', sets: 3, reps: '15–20' },
      { name: 'Tricep Pushdown', sets: 3, reps: '12–15' },
    ],
  },
  {
    id: uid(),
    name: 'B – Pull + Legs',
    exercises: [
      { name: 'Back Squat', sets: 3, reps: '5' },
      { name: 'Deadlift', sets: 2, reps: '4' },
      { name: 'Barbell Row', sets: 3, reps: '6–8' },
      { name: 'Pull-ups', sets: 3, reps: '6–10' },
      { name: 'Barbell Curl', sets: 3, reps: '8–12' },
      { name: 'Leg Press', sets: 3, reps: '10' },
    ],
  },
]

// ─── Bodyweight logs (Monday weigh-ins, aligned to weekday) ──────────────────

const bodyweightLogs: BodyweightLog[] = [
  { id: uid(), date: lastOccurrence(1, 1), weight: 73.1, unit: 'kg' },
  { id: uid(), date: lastOccurrence(1, 2), weight: 72.9, unit: 'kg' },
  { id: uid(), date: lastOccurrence(1, 3), weight: 73.2, unit: 'kg' },
  { id: uid(), date: lastOccurrence(1, 4), weight: 73.8, unit: 'kg' },
  { id: uid(), date: lastOccurrence(1, 5), weight: 74.2, unit: 'kg' },
]

// ─── Finance ──────────────────────────────────────────────────────────────────

const account: FinanceAccount = {
  id: uid(),
  name: 'CIC – Compte courant',
  type: 'checking',
  currency: 'EUR',
}

function tx(
  accountMonth: string,
  dayStr: string,
  description: string,
  amount: number,
  category: Transaction['category'],
  rawDescription?: string
): Transaction {
  return {
    id: uid(),
    date: `${accountMonth}-${dayStr}`,
    description,
    amount,
    category,
    rawDescription,
  }
}

const month1 = monthStr(2) // 2 months ago
const month2 = monthStr(1) // last month

const import1: FinanceImport = {
  id: uid(),
  accountId: account.id,
  month: month1,
  importedAt: new Date().toISOString(),
  transactions: [
    tx(month1, '01', 'Virement loyer', -750, 'housing', 'VIR LOYER JAN'),
    tx(month1, '03', 'Carrefour Market', -54.3, 'food', 'CB CARREFOUR 03/01'),
    tx(month1, '05', 'SNCF', -32.5, 'transport', 'CB SNCF BOUTIQUE'),
    tx(month1, '07', 'Netflix', -15.99, 'entertainment', 'NETFLIX.COM'),
    tx(month1, '08', 'Pharmacie Centrale', -18.4, 'health', 'CB PHARMACIE'),
    tx(month1, '10', 'Fnac', -49.9, 'shopping', 'CB FNAC'),
    tx(month1, '12', 'Lidl', -38.6, 'food', 'CB LIDL'),
    tx(month1, '15', 'EDF – Électricité', -48.2, 'utilities', 'PRELEVEMENT EDF'),
    tx(month1, '18', 'Spotify', -9.99, 'entertainment', 'SPOTIFY AB'),
    tx(month1, '20', 'Resto U', -22.5, 'food', 'CB RESTO UNIV'),
    tx(month1, '22', 'Intermarché', -61.2, 'food', 'CB INTERMARCHE'),
    tx(month1, '25', 'H&M', -42.0, 'shopping', 'CB H&M'),
    tx(month1, '28', 'Salaire job étudiant', 450, 'income', 'VIREMENT SALAIRE'),
    tx(month1, '28', 'Virement parents', 600, 'income', 'VIREMENT FAMILLE'),
  ],
}

const import2: FinanceImport = {
  id: uid(),
  accountId: account.id,
  month: month2,
  importedAt: new Date().toISOString(),
  transactions: [
    tx(month2, '01', 'Virement loyer', -750, 'housing', 'VIR LOYER'),
    tx(month2, '02', 'Carrefour Market', -67.5, 'food', 'CB CARREFOUR 02'),
    tx(month2, '04', 'Navigo mensuel', -49.0, 'transport', 'CB RATP NAVIGO'),
    tx(month2, '07', 'Netflix', -15.99, 'entertainment', 'NETFLIX.COM'),
    tx(month2, '09', 'Pharmacie', -12.8, 'health', 'CB PHARMACIE'),
    tx(month2, '11', 'Amazon', -34.99, 'shopping', 'AMAZON MKTPL'),
    tx(month2, '13', 'Aldi', -29.4, 'food', 'CB ALDI'),
    tx(month2, '15', 'EDF – Électricité', -45.2, 'utilities', 'PRELEVEMENT EDF'),
    tx(month2, '16', 'Resto Le Zinc', -23.5, 'food', 'CB RESTAURANT'),
    tx(month2, '18', 'Spotify', -9.99, 'entertainment', 'SPOTIFY AB'),
    tx(month2, '20', 'Monoprix', -55.8, 'food', 'CB MONOPRIX'),
    tx(month2, '23', 'Zara', -85.0, 'shopping', 'CB ZARA'),
    tx(month2, '25', 'Cinéma MK2', -11.0, 'entertainment', 'CB MK2'),
    tx(month2, '28', 'Salaire job étudiant', 450, 'income', 'VIREMENT SALAIRE'),
    tx(month2, '28', 'Virement parents', 600, 'income', 'VIREMENT FAMILLE'),
  ],
}

// ─── Sleep logs (past 8 nights) ─────────────────────────────────────────────

function sleep(
  sleepDayOffset: number,
  sleepTime: string,
  wakeTime: string,
  quality: 1 | 2 | 3 | 4 | 5
): SleepLog {
  const sleepDate = ds(sleepDayOffset)
  const wakeDate = ds(sleepDayOffset - 1)
  const [sh, sm] = sleepTime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  const sleepMins = (sh ?? 0) * 60 + (sm ?? 0)
  const wakeMins = (wh ?? 0) * 60 + (wm ?? 0)
  const duration = wakeMins + (24 * 60 - sleepMins)
  return {
    id: uid(),
    sleepDate,
    sleepTime,
    wakeDate,
    wakeTime,
    durationMinutes: duration,
    quality,
  }
}

const sleepLogs: SleepLog[] = [
  sleep(8, '23:15', '07:20', 4),
  sleep(7, '00:30', '07:45', 3),
  sleep(6, '22:55', '06:50', 5),
  sleep(5, '01:00', '08:00', 2),
  sleep(4, '23:00', '07:10', 4),
  sleep(3, '23:45', '07:30', 4),
  sleep(2, '00:10', '08:05', 3),
  sleep(1, '23:20', '07:00', 4),
]

// ─── Calendar events ──────────────────────────────────────────────────────────

const calendarEvents: CalendarEvent[] = []

// ─── Chore schedules ─────────────────────────────────────────────────────────

const choreSchedules: ChoreSchedule[] = [
  { id: uid(), title: 'Passer l\'aspirateur', frequencyDays: 7, durationMinutes: 20, active: true },
  { id: uid(), title: 'Laver le sol', frequencyDays: 3, durationMinutes: 15, active: true },
  { id: uid(), title: 'Nettoyer les toilettes', frequencyDays: 7, durationMinutes: 10, active: true },
  { id: uid(), title: 'Faire la vaisselle', frequencyDays: 1, durationMinutes: 15, active: true },
  { id: uid(), title: 'Changer les draps', frequencyDays: 14, durationMinutes: 20, active: true },
  { id: uid(), title: 'Nettoyer la cuisine', frequencyDays: 4, durationMinutes: 25, active: true },
]

// ─── Assemble and export ──────────────────────────────────────────────────────

export function createSeedData(): AppState {
  return {
    ues,
    courses,
    assignments,
    grades,
    tasks,
    recurringEvents,
    choreSchedules,
    workoutPlan,
    workoutPrograms,
    workoutSessions,
    bodyweightLogs,
    financeAccounts: [account],
    financeImports: [import1, import2],
    plannerBlocks: [],
    sleepLogs,
    calendarEvents,
    preferences,
    initialized: true,
  }
}
