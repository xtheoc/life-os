import { supabase } from './supabase'
import type { AppState } from '../types'

const TABLE = 'life_os_state'

async function getSession() {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function loadFromCloud(): Promise<AppState | null> {
  if (!supabase) return null
  try {
    const session = await getSession()
    if (!session?.user) return null
    const { data, error } = await supabase
      .from(TABLE)
      .select('state')
      .eq('user_id', session.user.id)
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
    console.log('[cloudSync] getting session...')
    const session = await getSession()
    console.log('[cloudSync] session user:', session?.user?.email ?? 'null')
    if (!session?.user) return false
    console.log('[cloudSync] upserting...')
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { user_id: session.user.id, state, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    console.log('[cloudSync] upsert done, error:', error?.message ?? 'none')
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
