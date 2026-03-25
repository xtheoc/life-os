import { supabase } from './supabase'
import type { AppState } from '../types'

const TABLE = 'life_os_state'

export async function loadFromCloud(userId: string): Promise<AppState | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('state')
      .eq('user_id', userId)
      .single()
    if (error || !data) return null
    return data.state as AppState
  } catch {
    return null
  }
}

export async function saveToCloud(state: AppState, userId: string): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: userId, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('[cloudSync] save error:', error.message)
    return !error
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
