// ─────────────────────────────────────────────────────────────────────────────
// Shared primitive types
// ─────────────────────────────────────────────────────────────────────────────

/** 0 = Sunday … 6 = Saturday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

// ─────────────────────────────────────────────────────────────────────────────
// School
// ─────────────────────────────────────────────────────────────────────────────

/** Unité d'Enseignement (UE) — groups courses, carries ECTS credits */
export interface UE {
  id: string
  name: string
  code: string
  /** ECTS credits for this UE */
  credits: number
  /** Academic semester (1 or 2) */
  semester: 1 | 2
}

export interface Course {
  id: string
  /** UE this course belongs to */
  ueId: string
  name: string
  code: string
  /** Coefficient within the UE (used to weight this course's grade inside the UE) */
  coefficient: number
  /** Fraction of the course grade from continuous assessment (0–1) */
  continuousWeight: number
  /** Fraction of the course grade from final exam (0–1) */
  finalWeight: number
  color: string
}

export type AssignmentType = 'exam' | 'assignment' | 'project' | 'quiz'
export type AssignmentStatus = 'todo' | 'in-progress' | 'done'

export interface Assignment {
  id: string
  courseId: string
  title: string
  type: AssignmentType
  /** ISO date string yyyy-MM-dd */
  dueDate: string
  priority: Priority
  status: AssignmentStatus
  estimatedHours: number
  description?: string
}

export type GradeCategory = 'continuous' | 'final'

export interface Grade {
  id: string
  courseId: string
  assignmentId?: string
  title: string
  /** Raw score (e.g. 14) */
  score: number
  /** Max possible score (e.g. 20) */
  maxScore: number
  category: GradeCategory
  /** ISO date yyyy-MM-dd */
  date: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks
// ─────────────────────────────────────────────────────────────────────────────

export type TaskCategory = 'school' | 'personal' | 'chore' | 'admin' | 'errand'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  priority: Priority
  /** ISO date yyyy-MM-dd, omitted if no deadline */
  dueDate?: string
  /** Estimated time in minutes, omitted if unknown */
  estimatedMinutes?: number
  completed: boolean
  completedAt?: string
  createdAt: string
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Recurring events (classes, chores, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecurringEvent {
  id: string
  title: string
  category: 'class' | 'chore' | 'other'
  daysOfWeek: DayOfWeek[]
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
  color?: string
  active: boolean
}

export interface ChoreSchedule {
  id: string
  title: string
  /** Repeat every N days (1 = daily, 7 = weekly, 14 = biweekly…) */
  frequencyDays: number
  /** Estimated duration in minutes */
  durationMinutes?: number
  /** ISO yyyy-MM-dd — when last marked done */
  lastDone?: string
  active: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkoutDay {
  dayOfWeek: DayOfWeek
  label: string
  isRest: boolean
}

export interface WorkoutPlan {
  days: WorkoutDay[]
}

export interface WorkoutExerciseTarget {
  name: string
  /** Number of sets */
  sets: number
  /** Rep target: "5", "8–12", "30s" */
  reps: string
  /** Optional coaching note */
  notes?: string
}

export interface WorkoutProgram {
  id: string
  /** Display name, e.g. "A – Push" */
  name: string
  exercises: WorkoutExerciseTarget[]
}

export interface ExerciseSet {
  weight: number
  reps: number
  unit: 'kg' | 'lb'
}

export interface Exercise {
  name: string
  sets: ExerciseSet[]
  notes?: string
}

export interface WorkoutSession {
  id: string
  /** ISO date yyyy-MM-dd */
  date: string
  label: string
  exercises: Exercise[]
  durationMinutes?: number
  notes?: string
  program?: 'A' | 'B'
}

export interface BodyweightLog {
  id: string
  /** ISO date yyyy-MM-dd */
  date: string
  weight: number
  unit: 'kg' | 'lb'
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance
// ─────────────────────────────────────────────────────────────────────────────

export interface FinanceAccount {
  id: string
  name: string
  type: 'checking' | 'savings' | 'credit' | 'other'
  currency: string
}

export type TransactionCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'education'
  | 'income'
  | 'transfer'
  | 'other'

export interface Transaction {
  id: string
  /** ISO date yyyy-MM-dd */
  date: string
  description: string
  /** Negative = debit/expense, Positive = credit/income */
  amount: number
  category: TransactionCategory
  rawDescription?: string
}

export interface FinanceImport {
  id: string
  accountId: string
  /** YYYY-MM */
  month: string
  importedAt: string
  transactions: Transaction[]
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Planner
// ─────────────────────────────────────────────────────────────────────────────

export type BlockType =
  | 'study'
  | 'workout'
  | 'class'
  | 'chore'
  | 'break'
  | 'free'
  | 'morning'
  | 'personal'
  | 'admin'
  | 'custom'

export interface PlannerBlock {
  id: string
  /** ISO date yyyy-MM-dd */
  date: string
  /** HH:mm */
  startTime: string
  /** HH:mm */
  endTime: string
  title: string
  type: BlockType
  taskId?: string
  assignmentId?: string
  color?: string
  completed: boolean
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep
// ─────────────────────────────────────────────────────────────────────────────

export interface SleepLog {
  id: string
  /** Date the user went to sleep (ISO yyyy-MM-dd) */
  sleepDate: string
  /** HH:mm */
  sleepTime: string
  /** Date the user woke up — may differ from sleepDate for overnight sleep */
  wakeDate: string
  /** HH:mm */
  wakeTime: string
  /** Auto-calculated duration in minutes */
  durationMinutes: number
  /** 1–5, optional subjective quality rating */
  quality?: 1 | 2 | 3 | 4 | 5
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar events
// ─────────────────────────────────────────────────────────────────────────────

export type CalEventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: string
  title: string
  /** ISO yyyy-MM-dd */
  date: string
  /** HH:mm, omit for all-day */
  startTime?: string
  /** HH:mm */
  endTime?: string
  allDay: boolean
  color: string
  notes?: string
  recurrence: CalEventRecurrence
}

// ─────────────────────────────────────────────────────────────────────────────
// User preferences
// ─────────────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  wakeTime: string
  sleepTime: string
  studyBlockMinutes: number
  breakMinutes: number
  maxStudyHoursPerDay: number
  weightUnit: 'kg' | 'lb'
  weeklyWeighInDay: DayOfWeek
  currency: string
  /** Grade target per semester (default 10). Key is 1 or 2. */
  semesterTargets: Record<1 | 2, number>
  /** Monthly budget limits per category (optional, €) */
  budgetLimits: Partial<Record<TransactionCategory, number>>
}

// ─────────────────────────────────────────────────────────────────────────────
// Root app state
// ─────────────────────────────────────────────────────────────────────────────

export interface AppState {
  ues: UE[]
  courses: Course[]
  assignments: Assignment[]
  grades: Grade[]
  tasks: Task[]
  recurringEvents: RecurringEvent[]
  choreSchedules: ChoreSchedule[]
  workoutPlan: WorkoutPlan
  workoutPrograms: WorkoutProgram[]
  workoutSessions: WorkoutSession[]
  bodyweightLogs: BodyweightLog[]
  financeAccounts: FinanceAccount[]
  financeImports: FinanceImport[]
  plannerBlocks: PlannerBlock[]
  sleepLogs: SleepLog[]
  calendarEvents: CalendarEvent[]
  preferences: UserPreferences
  initialized: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type AppAction =
  // System
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'RESET_DEMO_DATA'; payload: AppState }
  | { type: 'CLEAR_ALL_DATA' }
  // UEs
  | { type: 'ADD_UE'; payload: UE }
  | { type: 'UPDATE_UE'; payload: UE }
  | { type: 'DELETE_UE'; payload: { id: string } }
  // Courses
  | { type: 'ADD_COURSE'; payload: Course }
  | { type: 'UPDATE_COURSE'; payload: Course }
  | { type: 'DELETE_COURSE'; payload: { id: string } }
  // Assignments
  | { type: 'ADD_ASSIGNMENT'; payload: Assignment }
  | { type: 'UPDATE_ASSIGNMENT'; payload: Assignment }
  | { type: 'DELETE_ASSIGNMENT'; payload: { id: string } }
  // Grades
  | { type: 'ADD_GRADE'; payload: Grade }
  | { type: 'UPDATE_GRADE'; payload: Grade }
  | { type: 'DELETE_GRADE'; payload: { id: string } }
  // Tasks
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: { id: string } }
  | { type: 'TOGGLE_TASK'; payload: { id: string } }
  // Recurring events
  | { type: 'ADD_RECURRING'; payload: RecurringEvent }
  | { type: 'UPDATE_RECURRING'; payload: RecurringEvent }
  | { type: 'DELETE_RECURRING'; payload: { id: string } }
  // Chore schedules
  | { type: 'ADD_CHORE_SCHEDULE'; payload: ChoreSchedule }
  | { type: 'UPDATE_CHORE_SCHEDULE'; payload: ChoreSchedule }
  | { type: 'DELETE_CHORE_SCHEDULE'; payload: { id: string } }
  | { type: 'MARK_CHORE_DONE'; payload: { id: string; date: string } }
  // Workout plan
  | { type: 'SET_WORKOUT_PLAN'; payload: WorkoutPlan }
  | { type: 'SET_WORKOUT_PROGRAMS'; payload: WorkoutProgram[] }
  | { type: 'UPDATE_WORKOUT_PROGRAM'; payload: WorkoutProgram }
  | { type: 'ADD_WORKOUT_SESSION'; payload: WorkoutSession }
  | { type: 'UPDATE_WORKOUT_SESSION'; payload: WorkoutSession }
  | { type: 'DELETE_WORKOUT_SESSION'; payload: { id: string } }
  | { type: 'ADD_BODYWEIGHT_LOG'; payload: BodyweightLog }
  | { type: 'UPDATE_BODYWEIGHT_LOG'; payload: BodyweightLog }
  | { type: 'DELETE_BODYWEIGHT_LOG'; payload: { id: string } }
  // Finance
  | { type: 'ADD_FINANCE_ACCOUNT'; payload: FinanceAccount }
  | { type: 'UPDATE_FINANCE_ACCOUNT'; payload: FinanceAccount }
  | { type: 'DELETE_FINANCE_ACCOUNT'; payload: { id: string } }
  | { type: 'ADD_FINANCE_IMPORT'; payload: FinanceImport }
  | { type: 'DELETE_FINANCE_IMPORT'; payload: { id: string } }
  | { type: 'UPDATE_TRANSACTION'; payload: { importId: string; transaction: Transaction } }
  | { type: 'DELETE_TRANSACTION'; payload: { importId: string; transactionId: string } }
  | { type: 'ADD_TRANSACTION'; payload: { importId: string; transaction: Transaction } }
  // Planner
  | { type: 'SET_PLANNER_BLOCKS'; payload: { date: string; blocks: PlannerBlock[] } }
  | { type: 'UPDATE_PLANNER_BLOCK'; payload: PlannerBlock }
  | { type: 'DELETE_PLANNER_BLOCK'; payload: { id: string } }
  // Sleep
  | { type: 'ADD_SLEEP_LOG'; payload: SleepLog }
  | { type: 'UPDATE_SLEEP_LOG'; payload: SleepLog }
  | { type: 'DELETE_SLEEP_LOG'; payload: { id: string } }
  // Calendar events
  | { type: 'ADD_CALENDAR_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_CALENDAR_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_CALENDAR_EVENT'; payload: { id: string } }
  // Preferences
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
