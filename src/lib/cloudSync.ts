import { supabase, isSupabaseConfigured } from './supabase'
import type { AppState } from '../types'

const TABLE = 'life_os_state'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Read access token directly from localStorage — avoids Supabase JS client lock
function getStoredToken(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) ?? '')
        return data?.access_token ?? null
      } catch { return null }
    }
  }
  return null
}

async function dbFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken()
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
    })
  } finally {
    clearTimeout(t)
  }
}

export async function loadFromCloud(userId: string): Promise<AppState | null> {
  if (!isSupabaseConfigured) return null
  try {
    const res = await dbFetch(`${TABLE}?user_id=eq.${userId}&select=state`)
    if (!res.ok) return null
    const data = await res.json()
    return (data[0]?.state as AppState) ?? null
  } catch {
    return null
  }
}

export async function saveToCloud(state: AppState, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  try {
    const res = await dbFetch(TABLE, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, state, updated_at: new Date().toISOString() }),
    })
    if (!res.ok) console.error('[cloudSync] save error:', res.status, await res.text())
    return res.ok
  } catch (e) {
    console.error('[cloudSync] save exception:', e)
    return false
  }
}

export async function signInWithOtp(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  return { error: error?.message }
}

export async function verifyOtp(email: string, token: string): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Supabase not configured' }
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  return { error: error?.message }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}
