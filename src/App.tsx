import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { configured, supabase } from './supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import AddEntry from './pages/AddEntry'
import Budgets from './pages/Budgets'
import { Icon } from './components'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const qc = useQueryClient()

  useEffect(() => {
    if (!configured) return setSession(null)
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  if (session === undefined) return <div className="center muted">Memuat…</div>
  if (!configured) return <Setup />
  if (!session) return <Login />

  return (
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transaksi" element={<Transactions />} />
          <Route path="/tambah" element={<AddEntry key="new" />} />
          <Route path="/ubah/:table/:id" element={<AddEntry key="edit" />} />
          <Route path="/anggaran" element={<Budgets />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Menu utama">
        <NavLink to="/" end><Icon name="home" /><span>Ringkasan</span></NavLink>
        <NavLink to="/transaksi"><Icon name="list" /><span>Transaksi</span></NavLink>
        <NavLink to="/tambah" className="add"><Icon name="plus" /><span>Catat</span></NavLink>
        <NavLink to="/anggaran"><Icon name="target" /><span>Anggaran</span></NavLink>
        <button onClick={() => confirm('Keluar dari akun ini?') && supabase.auth.signOut()}><Icon name="logout" /><span>Keluar</span></button>
      </nav>
    </div>
  )
}

function Setup() {
  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 420 }}>
        <h1>Konfigurasi belum diisi</h1>
        <p className="muted">
          Salin <code>.env.example</code> menjadi <code>.env</code>, isi <code>VITE_SUPABASE_URL</code> dan{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> dari Supabase (Project Settings → API), lalu jalankan ulang <code>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}
