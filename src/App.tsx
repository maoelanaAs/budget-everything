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
import Accounts from './pages/Accounts'
import Settings from './pages/Settings'
import CategorySettings from './pages/CategorySettings'
import AccountSettings from './pages/AccountSettings'
import { Icon, PrivacyCtx, usePrivacyState } from './components'
import Stats from './pages/Stats'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const qc = useQueryClient()
  const privacy = usePrivacyState()

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
    <PrivacyCtx.Provider value={privacy}>
    <div className="app">
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transaksi" element={<Transactions />} />
          <Route path="/tambah" element={<AddEntry key="new" />} />
          <Route path="/ubah/:table/:id" element={<AddEntry key="edit" />} />
          <Route path="/statistik" element={<Stats />} />
          <Route path="/akun" element={<Accounts />} />
          <Route path="/pengaturan" element={<Settings />} />
          <Route path="/pengaturan/kategori/pengeluaran" element={<CategorySettings key="expense" />} />
          <Route path="/pengaturan/kategori/pemasukan" element={<CategorySettings key="income" />} />
          <Route path="/pengaturan/akun" element={<AccountSettings />} />
          <Route path="/pengaturan/anggaran" element={<Budgets />} />
          <Route path="/anggaran" element={<Navigate to="/pengaturan/anggaran" replace />} />
          <Route path="/profil" element={<Navigate to="/pengaturan" replace />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Menu utama">
        <NavLink to="/" end><Icon name="home" /><span>Ringkasan</span></NavLink>
        <NavLink to="/transaksi"><Icon name="list" /><span>Transaksi</span></NavLink>
        <NavLink to="/tambah" className="add"><Icon name="plus" /><span>Catat</span></NavLink>
        <NavLink to="/akun"><Icon name="wallet" /><span>Akun</span></NavLink>
        <NavLink to="/pengaturan"><Icon name="settings" /><span>Pengaturan</span></NavLink>
      </nav>
    </div>
    </PrivacyCtx.Provider>
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
