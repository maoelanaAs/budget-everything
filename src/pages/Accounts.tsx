import { Link } from 'react-router-dom'
import { Icon, Loading, PrivacyButton } from '../components'
import { useBalances } from '../data'
import { rp } from '../format'

export default function Accounts() {
  const balances = useBalances()
  const bal = balances.data ?? []
  const counted = bal.filter((b) => b.include_in_total)
  const excluded = bal.filter((b) => !b.include_in_total)
  const total = counted.reduce((s, b) => s + b.balance, 0)
  const held = bal.reduce((s, b) => s + b.min_balance, 0)
  const usable = total - held

  const row = (b: (typeof bal)[number]) => (
    <div key={b.account_id} className="acct">
      <div>
        <span>{b.name}</span>
        {b.min_balance > 0 && <small className="muted">Ditahan {rp(b.min_balance)}</small>}
      </div>
      <b className={b.balance < 0 ? 'neg' : ''}>{rp(b.balance)}</b>
    </div>
  )

  return (
    <>
      <header className="head"><h1>Akun</h1></header>
      <Loading q={balances} />

      <section className="hero"><PrivacyButton />
        <p className="hero-label">Total saldo</p>
        <p className="hero-num">{rp(total)}</p>
        <p className="hero-sub">Bisa dipakai {rp(usable)}</p>
        {held > 0 && <p className="hero-foot">Saldo ditahan {rp(held)} tidak dihitung sebagai saldo yang bisa dipakai.</p>}
      </section>

      {!balances.isLoading && bal.length === 0 && <p className="empty">Belum ada akun. Tambahkan di Pengaturan → Manajemen akun.</p>}

      {counted.length > 0 && (
        <section className="sheet">
          <div className="sheet-head"><div><h3>Dihitung di total</h3><span className="muted small">{counted.length} akun</span></div><b>{rp(total)}</b></div>
          {counted.map(row)}
        </section>
      )}
      {excluded.length > 0 && (
        <section className="sheet">
          <div className="sheet-head"><div><h3>Tidak dihitung di total</h3><span className="muted small">{excluded.length} akun</span></div><b>{rp(excluded.reduce((s, b) => s + b.balance, 0))}</b></div>
          {excluded.map(row)}
        </section>
      )}

      <Link className="ghost addcat" to="/pengaturan/akun"><Icon name="settings" />Kelola akun</Link>
    </>
  )
}
