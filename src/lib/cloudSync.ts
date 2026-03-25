import { supabase } from './supabase'
import type { AppState } from '../types'

const TABLE = 'life_os_state'

export async function loadFromCloud(): Promise<AppState | null> {
  if (!supabase) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from(TABLE)
      .select('state')
      .eq('user_id', user.id)
      .single()
    if (error || !data) return null
    return data.state as AppState
  } catch {
    return null
  }
}

export async function saveToCloud(state: AppState): Promise<boolean> {
  if (!supabase) return false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: user.id, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    return !error
  } catch {
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
