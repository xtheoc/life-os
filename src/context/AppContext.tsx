import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useRef,
  useMemo,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { storage } from '../lib/storage'
import { createSeedData } from '../data/seedData'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { loadFromCloud, saveToCloud, signInWithOtp, verifyOtp as verifySupabaseOtp, signOut as supabaseSignOut } from '../lib/cloudSync'
import type { AppState, AppAction, UserPreferences } from '../types'

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'life-os-v1'

// ─── Default preferences (safe fallback) ─────────────────────────────────────

export const DEFAULT_PREFERENCES: UserPreferences = {
  wakeTime: '07:00',
  sleepTime: '23:30',
  studyBlockMinutes: 50,
  breakMinutes: 10,
  maxStudyHoursPerDay: 6,
  weightUnit: 'kg',
  weeklyWeighInDay: 1,
  currency: 'EUR',
  semesterTargets: { 1: 10, 2: 10 },
  budgetLimits: {},
}

// ─── Empty state (after Clear All) ───────────────────────────────────────────

export function emptyState(prefs?: UserPreferences): AppState {
  return {
    ues: [],
    courses: [],
    assignments: [],
    grades: [],
    tasks: [],
    recurringEvents: [],
    choreSchedules: [],
    workoutPlan: { days: [] },
    workoutPrograms: [],
    workoutSessions: [],
    bodyweightLogs: [],
    financeAccounts: [],
    financeImports: [],
    plannerBlocks: [],
    sleepLogs: [],
    calendarEvents: [],
    preferences: prefs ?? DEFAULT_PREFERENCES,
    initialized: true,
  }
}

// ─── Safe load (validates shape, fills missing fields) ───────────────────────

function safeLoad(raw: unknown): AppState {
  try {
    const s = raw as Partial<AppState>
    if (typeof s !== 'object' || s === null) throw new Error('not an object')
    return {
      ues: Array.isArray(s.ues) ? s.ues : [],
      courses: Array.isArray(s.courses) ? s.courses : [],
      assignments: Array.isArray(s.assignments) ? s.assignments : [],
      grades: Array.isArray(s.grades) ? s.grades : [],
      tasks: Array.isArray(s.tasks) ? s.tasks : [],
      recurringEvents: Array.isArray(s.recurringEvents) ? s.recurringEvents : [],
      choreSchedules: Array.isArray(s.choreSchedules) ? s.choreSchedules : [],
      workoutPlan: s.workoutPlan ?? { days: [] },
      workoutPrograms: Array.isArray(s.workoutPrograms) ? s.workoutPrograms : [],
      workoutSessions: Array.isArray(s.workoutSessions) ? s.workoutSessions : [],
      bodyweightLogs: Array.isArray(s.bodyweightLogs) ? s.bodyweightLogs : [],
      financeAccounts: Array.isArray(s.financeAccounts) ? s.financeAccounts : [],
      financeImports: Array.isArray(s.financeImports) ? s.financeImports : [],
      plannerBlocks: Array.isArray(s.plannerBlocks) ? s.plannerBlocks : [],
      sleepLogs: Array.isArray(s.sleepLogs) ? s.sleepLogs : [],
      calendarEvents: Array.isArray(s.calendarEvents) ? s.calendarEvents : [],
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...(s.preferences ?? {}),
        semesterTargets: (s.preferences as UserPreferences | undefined)?.semesterTargets ?? { 1: 10, 2: 10 },
        budgetLimits: (s.preferences as UserPreferences | undefined)?.budgetLimits ?? {},
      },
      initialized: true,
    }
  } catch {
    console.warn('[AppContext] Corrupt state in storage — resetting to demo data')
    return createSeedData()
  }
}

// ─── Lazy initializer (synchronous, avoids flash of empty state) ──────────────

function init(): AppState {
  const saved = storage.get<AppState>(STORAGE_KEY)
  if (saved?.initialized) return safeLoad(saved)
  return createSeedData()
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ── System ──────────────────────────────────────────────────────────────
    case 'LOAD_STATE':
      return safeLoad(action.payload)
    case 'RESET_DEMO_DATA':
      return { ...action.payload, initialized: true }
    case 'CLEAR_ALL_DATA':
      return emptyState(state.preferences)

    // ── UEs ──────────────────────────────────────────────────────────────────
    case 'ADD_UE':
      return { ...state, ues: [...state.ues, action.payload] }
    case 'UPDATE_UE':
      return { ...state, ues: state.ues.map(u => u.id === action.payload.id ? action.payload : u) }
    case 'DELETE_UE': {
      const deletedCourseIds = state.courses
        .filter(c => c.ueId === action.payload.id)
        .map(c => c.id)
      return {
        ...state,
        ues: state.ues.filter(u => u.id !== action.payload.id),
        courses: state.courses.filter(c => c.ueId !== action.payload.id),
        assignments: state.assignments.filter(a => !deletedCourseIds.includes(a.courseId)),
        grades: state.grades.filter(g => !deletedCourseIds.includes(g.courseId)),
      }
    }

    // ── Courses ──────────────────────────────────────────────────────────────
    case 'ADD_COURSE':
      return { ...state, courses: [...state.courses, action.payload] }
    case 'UPDATE_COURSE':
      return {
        ...state,
        courses: state.courses.map(c =>
          c.id === action.payload.id ? action.payload : c
        ),
      }
    case 'DELETE_COURSE':
      return {
        ...state,
        courses: state.courses.filter(c => c.id !== action.payload.id),
        // Cascade delete
        assignments: state.assignments.filter(a => a.courseId !== action.payload.id),
        grades: state.grades.filter(g => g.courseId !== action.payload.id),
      }

    // ── Assignments ──────────────────────────────────────────────────────────
    case 'ADD_ASSIGNMENT':
      return { ...state, assignments: [...state.assignments, action.payload] }
    case 'UPDATE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      }
    case 'DELETE_ASSIGNMENT':
      return {
        ...state,
        assignments: state.assignments.filter(a => a.id !== action.payload.id),
        grades: state.grades.filter(g => g.assignmentId !== action.payload.id),
      }

    // ── Grades ───────────────────────────────────────────────────────────────
    case 'ADD_GRADE':
      return { ...state, grades: [...state.grades, action.payload] }
    case 'UPDATE_GRADE':
      return {
        ...state,
        grades: state.grades.map(g =>
          g.id === action.payload.id ? action.payload : g
        ),
      }
    case 'DELETE_GRADE':
      return {
        ...state,
        grades: state.grades.filter(g => g.id !== action.payload.id),
      }

    // ── Tasks ────────────────────────────────────────────────────────────────
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] }
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id ? action.payload : t
        ),
      }
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload.id),
      }
    case 'TOGGLE_TASK': {
      const now = new Date().toISOString()
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? now : undefined,
              }
            : t
        ),
      }
    }

    // ── Recurring events ─────────────────────────────────────────────────────
    case 'ADD_RECURRING':
      return { ...state, recurringEvents: [...state.recurringEvents, action.payload] }
    case 'UPDATE_RECURRING':
      return {
        ...state,
        recurringEvents: state.recurringEvents.map(e =>
          e.id === action.payload.id ? action.payload : e
        ),
      }
    case 'DELETE_RECURRING':
      return {
        ...state,
        recurringEvents: state.recurringEvents.filter(e => e.id !== action.payload.id),
      }

    // ── Chore schedules ──────────────────────────────────────────────────────
    case 'ADD_CHORE_SCHEDULE':
      return { ...state, choreSchedules: [...state.choreSchedules, action.payload] }
    case 'UPDATE_CHORE_SCHEDULE':
      return { ...state, choreSchedules: state.choreSchedules.map(c => c.id === action.payload.id ? action.payload : c) }
    case 'DELETE_CHORE_SCHEDULE':
      return { ...state, choreSchedules: state.choreSchedules.filter(c => c.id !== action.payload.id) }
    case 'MARK_CHORE_DONE':
      return { ...state, choreSchedules: state.choreSchedules.map(c => c.id === action.payload.id ? { ...c, lastDone: action.payload.date } : c) }

    // ── Workout plan ─────────────────────────────────────────────────────────
    case 'SET_WORKOUT_PLAN':
      return { ...state, workoutPlan: action.payload }
    case 'SET_WORKOUT_PROGRAMS':
      return { ...state, workoutPrograms: action.payload }
    case 'UPDATE_WORKOUT_PROGRAM':
      return { ...state, workoutPrograms: state.workoutPrograms.map(p => p.id === action.payload.id ? action.payload : p) }
    case 'ADD_WORKOUT_SESSION':
      return { ...state, workoutSessions: [...state.workoutSessions, action.payload] }
    case 'UPDATE_WORKOUT_SESSION':
      return {
        ...state,
        workoutSessions: state.workoutSessions.map(s =>
          s.id === action.payload.id ? action.payload : s
        ),
      }
    case 'DELETE_WORKOUT_SESSION':
      return {
        ...state,
        workoutSessions: state.workoutSessions.filter(s => s.id !== action.payload.id),
      }
    case 'ADD_BODYWEIGHT_LOG':
      return { ...state, bodyweightLogs: [...state.bodyweightLogs, action.payload] }
    case 'UPDATE_BODYWEIGHT_LOG':
      return {
        ...state,
        bodyweightLogs: state.bodyweightLogs.map(b =>
          b.id === action.payload.id ? action.payload : b
        ),
      }
    case 'DELETE_BODYWEIGHT_LOG':
      return {
        ...state,
        bodyweightLogs: state.bodyweightLogs.filter(b => b.id !== action.payload.id),
      }

    // ── Finance ──────────────────────────────────────────────────────────────
    case 'ADD_FINANCE_ACCOUNT':
      return { ...state, financeAccounts: [...state.financeAccounts, action.payload] }
    case 'UPDATE_FINANCE_ACCOUNT':
      return {
        ...state,
        financeAccounts: state.financeAccounts.map(a =>
          a.id === action.payload.id ? action.payload : a
        ),
      }
    case 'DELETE_FINANCE_ACCOUNT':
      return {
        ...state,
        financeAccounts: state.financeAccounts.filter(a => a.id !== action.payload.id),
        financeImports: state.financeImports.filter(
          i => i.accountId !== action.payload.id
        ),
      }
    case 'ADD_FINANCE_IMPORT':
      return { ...state, financeImports: [...state.financeImports, action.payload] }
    case 'DELETE_FINANCE_IMPORT':
      return {
        ...state,
        financeImports: state.financeImports.filter(i => i.id !== action.payload.id),
      }
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        financeImports: state.financeImports.map(imp =>
          imp.id === action.payload.importId
            ? { ...imp, transactions: imp.transactions.map(t => t.id === action.payload.transaction.id ? action.payload.transaction : t) }
            : imp
        ),
      }
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        financeImports: state.financeImports.map(imp =>
          imp.id === action.payload.importId
            ? { ...imp, transactions: imp.transactions.filter(t => t.id !== action.payload.transactionId) }
            : imp
        ),
      }
    case 'ADD_TRANSACTION':
      return {
        ...state,
        financeImports: state.financeImports.map(imp =>
          imp.id === action.payload.importId
            ? { ...imp, transactions: [...imp.transactions, action.payload.transaction] }
            : imp
        ),
      }

    // ── Planner ──────────────────────────────────────────────────────────────
    case 'SET_PLANNER_BLOCKS':
      return {
        ...state,
        plannerBlocks: [
          ...state.plannerBlocks.filter(b => b.date !== action.payload.date),
          ...action.payload.blocks,
        ],
      }
    case 'UPDATE_PLANNER_BLOCK':
      return {
        ...state,
        plannerBlocks: state.plannerBlocks.map(b =>
          b.id === action.payload.id ? action.payload : b
        ),
      }
    case 'DELETE_PLANNER_BLOCK':
      return {
        ...state,
        plannerBlocks: state.plannerBlocks.filter(b => b.id !== action.payload.id),
      }

    // ── Sleep ────────────────────────────────────────────────────────────────
    case 'ADD_SLEEP_LOG':
      return { ...state, sleepLogs: [...state.sleepLogs, action.payload] }
    case 'UPDATE_SLEEP_LOG':
      return {
        ...state,
        sleepLogs: state.sleepLogs.map(s =>
          s.id === action.payload.id ? action.payload : s
        ),
      }
    case 'DELETE_SLEEP_LOG':
      return {
        ...state,
        sleepLogs: state.sleepLogs.filter(s => s.id !== action.payload.id),
      }

    // ── Calendar events ───────────────────────────────────────────────────────
    case 'ADD_CALENDAR_EVENT':
      return { ...state, calendarEvents: [...state.calendarEvents, action.payload] }
    case 'UPDATE_CALENDAR_EVENT':
      return { ...state, calendarEvents: state.calendarEvents.map(e => e.id === action.payload.id ? action.payload : e) }
    case 'DELETE_CALENDAR_EVENT':
      return { ...state, calendarEvents: state.calendarEvents.filter(e => e.id !== action.payload.id) }

    // ── Preferences ──────────────────────────────────────────────────────────
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      }

    default:
      return state
  }
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppState | null>(null)
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null)

// ─── Sync types & contexts ────────────────────────────────────────────────────

export interface SyncStatus {
  configured: boolean
  user: User | null
  syncing: boolean
  lastSynced: Date | null
  error: string | null
}

interface SyncActions {
  signIn: (email: string) => Promise<{ error?: string }>
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const SyncStatusContext = createContext<SyncStatus>({
  configured: false, user: null, syncing: false, lastSynced: null, error: null,
})
const SyncActionsContext = createContext<SyncActions>({
  signIn: async () => ({}),
  verifyOtp: async () => ({}),
  signOut: async () => {},
  syncNow: async () => {},
})

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside <AppProvider>')
  return ctx
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(AppDispatchContext)
  if (!ctx) throw new Error('useAppDispatch must be used inside <AppProvider>')
  return ctx
}

export function useSyncStatus(): SyncStatus {
  return useContext(SyncStatusContext)
}

export function useSyncActions(): SyncActions {
  return useContext(SyncActionsContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // `init` runs once synchronously — no flash of empty state
  const [state, dispatch] = useReducer(reducer, undefined, init)

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    configured: isSupabaseConfigured,
    user: null,
    syncing: false,
    lastSynced: null,
    error: null,
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stateRef = useRef<AppState>(state)
  const userRef = useRef<User | null>(null)
  stateRef.current = state

  // Save to localStorage immediately + cloud sync (debounced)
  useEffect(() => {
    storage.set(STORAGE_KEY, state)

    if (!isSupabaseConfigured || !userRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSyncStatus(s => ({ ...s, syncing: true, error: null }))
      const ok = await saveToCloud(state)
      setSyncStatus(s => ({
        ...s,
        syncing: false,
        lastSynced: ok ? new Date() : s.lastSynced,
        error: ok ? null : 'Sync failed — check your connection',
      }))
    }, 3000)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auth subscription — runs once on mount
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return

    // Get current session on mount
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      userRef.current = user
      setSyncStatus(s => ({ ...s, user }))
      if (user) {
        const cloudState = await loadFromCloud()
        if (cloudState?.initialized) {
          dispatch({ type: 'LOAD_STATE', payload: cloudState })
        }
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null
      userRef.current = user
      setSyncStatus(s => ({ ...s, user }))
      if (event === 'SIGNED_IN' && user) {
        const cloudState = await loadFromCloud()
        if (cloudState?.initialized) {
          dispatch({ type: 'LOAD_STATE', payload: cloudState })
        }
      }
      if (event === 'SIGNED_OUT') {
        userRef.current = null
        setSyncStatus(s => ({ ...s, lastSynced: null, error: null }))
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncActions = useMemo<SyncActions>(() => ({
    signIn: signInWithOtp,
    verifyOtp: verifySupabaseOtp,
    signOut: async () => {
      await supabaseSignOut()
      setSyncStatus(s => ({ ...s, user: null, lastSynced: null }))
    },
    syncNow: async () => {
      setSyncStatus(s => ({ ...s, syncing: true, error: null }))
      const ok = await saveToCloud(stateRef.current)
      setSyncStatus(s => ({
        ...s,
        syncing: false,
        lastSynced: ok ? new Date() : s.lastSynced,
        error: ok ? null : 'Sync failed',
      }))
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        <SyncStatusContext.Provider value={syncStatus}>
          <SyncActionsContext.Provider value={syncActions}>
            {children}
          </SyncActionsContext.Provider>
        </SyncStatusContext.Provider>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  )
}
