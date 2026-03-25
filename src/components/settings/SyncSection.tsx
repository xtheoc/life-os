import { useState } from 'react'
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle, LogOut, RefreshCw } from 'lucide-react'
import { useSyncStatus, useSyncActions } from '../../context/AppContext'

export default function SyncSection() {
  const sync = useSyncStatus()
  const actions = useSyncActions()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setAuthError('')
    const { error } = await actions.signIn(email.trim())
    setLoading(false)
    if (error) { setAuthError(error); return }
    setSent(true)
  }

  if (!sync.configured) {
    return (
      <div className="flex items-start gap-3 p-4 bg-white/3 rounded-xl border border-border">
        <CloudOff size={18} className="text-muted mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-white font-semibold">Cloud sync not configured</p>
          <p className="text-xs text-muted mt-1">
            Add <code className="bg-white/10 px-1 rounded text-accent">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-white/10 px-1 rounded text-accent">VITE_SUPABASE_ANON_KEY</code> to a{' '}
            <code className="bg-white/10 px-1 rounded text-accent">.env.local</code> file, then restart the dev server.
          </p>
          <p className="text-xs text-muted mt-2">
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Create a free Supabase project →
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (sync.user) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-success/10 border border-success/30 rounded-xl">
          <CheckCircle2 size={16} className="text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-semibold">Synced across devices</p>
            <p className="text-xs text-muted truncate">{sync.user.email}</p>
            {sync.lastSynced && (
              <p className="text-xs text-muted">Last synced: {sync.lastSynced.toLocaleTimeString()}</p>
            )}
          </div>
          {sync.syncing && <Loader2 size={14} className="text-accent animate-spin shrink-0" />}
          {!sync.syncing && sync.lastSynced && <Cloud size={14} className="text-success shrink-0" />}
        </div>

        {sync.error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/30 rounded-lg">
            <AlertCircle size={14} className="text-danger shrink-0" />
            <p className="text-xs text-danger">{sync.error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={actions.syncNow}
            disabled={sync.syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-muted hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={sync.syncing ? 'animate-spin' : ''} />
            Sync now
          </button>
          <button
            onClick={actions.signOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 text-muted hover:bg-danger/20 hover:text-danger transition-colors"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Not signed in
  if (sent) {
    return (
      <div className="flex items-start gap-3 p-4 bg-accent/10 border border-accent/30 rounded-xl">
        <CheckCircle2 size={16} className="text-accent mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-white font-semibold">Check your email</p>
          <p className="text-xs text-muted mt-1">
            We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in — no password needed.
          </p>
          <button onClick={() => setSent(false)} className="text-xs text-accent hover:underline mt-2">
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-3">
      <p className="text-xs text-muted">
        Sign in with your email to sync your data across all your devices. We'll send you a magic link — no password needed.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {loading ? 'Sending…' : 'Send link'}
        </button>
      </div>
      {authError && <p className="text-xs text-danger">{authError}</p>}
    </form>
  )
}
