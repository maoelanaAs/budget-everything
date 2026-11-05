import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components'
import { supabase } from '../supabase'

type IconName = 'plus' | 'wallet' | 'target' | 'tag'

function Item({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <Link className="menu-item" to={to}>
      <span className="emo" aria-hidden="true">{icon}</span>
      <span className="menu-text"><b>{title}</b><small className="muted">{hint}</small></span>
      <span className="menu-go" aria-hidden="true"><Icon name="chevron" /></span>
    </Link>
  )
}

export default function Settings() {
  const [email, setEmail] = useState('')
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')) }, [])
  const ic = (name: IconName) => <Icon name={name} />

  return (
    <>
      <header className="head"><h1>Pengaturan</h1></header>

      <section className="sheet">
        <div className="sheet-head">
          <div><h3>Akun masuk</h3><span className="muted small">{email || 'Memuat…'}</span></div>
          <button className="ghost small-btn" onClick={() => confirm('Keluar dari akun ini?') && supabase.auth.signOut()}>Keluar</button>
        </div>
      </section>

      <h2 className="section">Kategori</h2>
      <section className="sheet menu">
        <Item to="/pengaturan/kategori/pengeluaran" icon={ic('tag')} title="Kategori pengeluaran" hint="Tambah, ubah, atau hapus kategori dan kelompoknya" />
        <Item to="/pengaturan/kategori/pemasukan" icon={ic('plus')} title="Kategori pemasukan" hint="Gaji, bonus, dan sumber pemasukan lain" />
      </section>

      <h2 className="section">Keuangan</h2>
      <section className="sheet menu">
        <Item to="/pengaturan/akun" icon={ic('wallet')} title="Manajemen akun" hint="Tambah akun, ubah saldo, pilih ikut total atau tidak" />
        <Item to="/pengaturan/anggaran" icon={ic('target')} title="Anggaran" hint="Atur kategori dan nominal anggaran per bulan" />
      </section>
    </>
  )
}
