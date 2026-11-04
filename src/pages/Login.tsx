import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'Email atau kata sandi salah.' : error.message)
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
      if (error) setError(error.message.includes('rate limit') ? 'Batas pengiriman email tercapai. Coba lagi sekitar satu jam lagi atau masuk dengan kata sandi.' : error.message)
      else setSent(true)
    }
    setBusy(false)
  }

  return (
    <div className="center">
      <form className="login" onSubmit={submit}>
        <img className="brand-logo" src="/logo.png" alt="" width="76" height="76" />
        <div>
          <h1 className="wordmark"><span>Budget</span><span>Everything</span></h1>
          <p className="tagline">Take Control of Your Money</p>
        </div>
        {sent ? (
          <p>Tautan masuk sudah dikirim ke <b>{email}</b>. Buka email di perangkat ini lalu ketuk tautannya.</p>
        ) : (
          <div className="stack">
            <p className="muted">
              {mode === 'password' ? 'Masuk dengan email dan kata sandi.' : 'Anda akan menerima tautan sekali pakai lewat email.'}
            </p>
            <label className="field">Email
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {mode === 'password' && (
              <label className="field">Kata sandi
                <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={busy}>
              {busy ? 'Memproses…' : mode === 'password' ? 'Masuk' : 'Kirim tautan masuk'}
            </button>
            <button type="button" className="link" onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setError('') }}>
              {mode === 'password' ? 'Masuk dengan tautan email' : 'Masuk dengan kata sandi'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
