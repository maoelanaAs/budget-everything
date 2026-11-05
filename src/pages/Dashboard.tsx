import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, Icon, Loading, MonthPicker, PrivacyButton, emoji } from '../components'
import { useAccounts, useBalances, useBudgets, useCategories, useTransactions, useTransfers } from '../data'
import { dayLabel, daysLeft, monthLabel, monthStart, rp } from '../format'
import { today } from '../format'
import { GRP_LABEL, type Grp } from '../types'

export default function Dashboard() {
  const thisMonth = monthStart(new Date())
  const [start, setStart] = useState(thisMonth)
  const cats = useCategories()
  const budgets = useBudgets(start)
  const txs = useTransactions(start)
  const balances = useBalances()
  const transfers = useTransfers(start)
  const accounts = useAccounts()
  const accName = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a.name])), [accounts.data])

  const d = useMemo(() => {
    const expense = (txs.data ?? []).filter((t) => t.type === 'expense')
    const income = (txs.data ?? []).filter((t) => t.type === 'income')
    const spent = new Map<string, number>()
    for (const t of expense) spent.set(t.category_id!, (spent.get(t.category_id!) ?? 0) + t.amount)
    const budget = new Map((budgets.data ?? []).map((b) => [b.category_id, b.amount]))
    const rows = (cats.data ?? [])
      .filter((c) => c.type === 'expense')
      .map((c) => ({ ...c, budget: budget.get(c.id) ?? 0, spent: spent.get(c.id) ?? 0, inBudget: budget.has(c.id) }))
      .filter((c) => c.inBudget || c.spent > 0)
    const groups = (['need', 'want', 'saving'] as Grp[]).map((g) => {
      const items = rows.filter((x) => x.grp === g)
      return { g, items, budget: items.reduce((s, x) => s + x.budget, 0), spent: items.reduce((s, x) => s + x.spent, 0) }
    })
    const incomeRows = (cats.data ?? [])
      .filter((c) => c.type === 'income')
      .map((c) => {
        const items = income.filter((t) => t.category_id === c.id)
        return { ...c, items, total: items.reduce((x, t) => x + t.amount, 0) }
      })
      .filter((r) => r.items.length > 0)
      .sort((x, y) => y.total - x.total)
    return {
      groups, incomeRows,
      totalBudget: rows.reduce((s, x) => s + x.budget, 0),
      totalSpent: rows.reduce((s, x) => s + x.spent, 0),
      totalIncome: income.reduce((s, t) => s + t.amount, 0),
      rows,
    }
  }, [txs.data, budgets.data, cats.data])

  const bal = balances.data ?? []
  const counted = new Set(bal.filter((b) => b.include_in_total).map((b) => b.account_id))
  const usable = bal.filter((b) => b.include_in_total).reduce((s, b) => s + b.balance, 0) - bal.reduce((s, b) => s + b.min_balance, 0)
  const left = daysLeft(start)
  const isCurrent = start === thisMonth && left > 0
  const remaining = d.totalBudget - d.totalSpent

  // Batas aman per hari dibuat TETAP sepanjang hari: dihitung dari sisa saldo di awal hari ini
  // (saldo sekarang ditambah pengeluaran & biaya admin hari ini), dibagi sisa hari termasuk hari ini.
  // Belanja hari ini tidak menggeser batasnya; sisa yang tidak terpakai otomatis terbawa ke besok.
  const t0 = today()
  const spentToday = (txs.data ?? []).filter((t) => t.type === 'expense' && t.tx_date === t0)
  const feesToday = (transfers.data ?? []).filter((t) => t.tx_date === t0)
  const todaySpent = spentToday.reduce((s, t) => s + t.amount, 0) + feesToday.reduce((s, t) => s + t.admin_fee, 0)
  const addBack =
    spentToday.filter((t) => counted.has(t.account_id)).reduce((s, t) => s + t.amount, 0) +
    feesToday.filter((t) => counted.has(t.from_account_id)).reduce((s, t) => s + t.admin_fee, 0)
  const startUsable = usable + addBack
  const perDay = left > 0 ? Math.max(0, Math.floor(startUsable / left / 500) * 500) : 0

  return (
    <>
      <header className="head"><h1>Ringkasan</h1><MonthPicker value={start} onChange={setStart} /></header>
      <Loading q={txs} />

      {isCurrent ? (
        <section className="hero"><PrivacyButton />
          <p className="hero-label">Batas aman per hari</p>
          <p className="hero-num">{rp(perDay)}</p>
          <Bar ratio={perDay ? todaySpent / perDay : todaySpent ? 2 : 0} tone="ink" />
          <p className="hero-sub">
            {todaySpent === 0
              ? 'Belum ada pengeluaran hari ini.'
              : todaySpent <= perDay
                ? `Hari ini terpakai ${rp(todaySpent)}, sisa ${rp(perDay - todaySpent)}.`
                : `Hari ini terpakai ${rp(todaySpent)}, lebih ${rp(todaySpent - perDay)} dari batas.`}
          </p>
          <p className="hero-foot">Saldo awal hari ini {rp(startUsable)} dibagi {left} hari (termasuk hari ini). Batas tetap seharian, sisa hari ini terbawa ke besok.</p>
        </section>
      ) : d.totalBudget === 0 ? (
        <section className="hero"><PrivacyButton />
          <p className="hero-label">Pengeluaran {monthLabel(start)}</p>
          <p className="hero-num">{rp(d.totalSpent)}</p>
          <p className="hero-sub">Belum ada anggaran untuk bulan ini.</p>
        </section>
      ) : (
        <section className="hero"><PrivacyButton />
          <p className="hero-label">Sisa anggaran {monthLabel(start)}</p>
          <p className="hero-num">{rp(remaining)}</p>
          <Bar ratio={d.totalBudget ? d.totalSpent / d.totalBudget : 0} tone="ink" />
          <p className="hero-sub">Terpakai {rp(d.totalSpent)} dari anggaran {rp(d.totalBudget)}.</p>
        </section>
      )}

      <section className="figures" aria-label="Ringkasan bulan ini">
        <div><span>Pemasukan</span><b>{rp(d.totalIncome)}</b></div>
        <div><span>Pengeluaran</span><b>{rp(d.totalSpent)}</b></div>
        <div><span>Sisa anggaran</span>{d.totalBudget === 0 ? <b className="muted">Belum diatur</b> : <b className={remaining < 0 ? 'neg' : ''}>{rp(remaining)}</b>}</div>
      </section>

      <Link className="sheet menu-item statlink" to="/statistik">
        <span className="emo" aria-hidden="true"><Icon name="chart" /></span>
        <span className="menu-text"><b>Statistik dan tren</b><small className="muted">Pengeluaran per kategori, 6 bulan terakhir, dan perbandingan bulan lalu</small></span>
        <span className="menu-go" aria-hidden="true"><Icon name="chevron" /></span>
      </Link>

      <section className="sheet" aria-label="Detail pendapatan">
        <div className="sheet-head">
          <div><h3>Detail pendapatan</h3><span className="muted small">{monthLabel(start)} · {d.incomeRows.reduce((s, r) => s + r.items.length, 0)} catatan</span></div>
          <b className="pos">{rp(d.totalIncome)}</b>
        </div>
        {d.incomeRows.length === 0 && !txs.isLoading && <p className="muted small pad">Belum ada pemasukan bulan ini.</p>}
        {d.incomeRows.map((r) => (
          <details key={r.id} className="inc">
            <summary>
              <span className="emo" aria-hidden="true">{emoji(r.name, r.icon)}</span>
              <div className="cat-body">
                <div className="line"><span>{r.name}</span><span>{rp(r.total)}</span></div>
                <Bar ratio={d.totalIncome ? r.total / d.totalIncome : 0} tone="ink" />
                <span className="muted small">{Math.round(d.totalIncome ? (r.total / d.totalIncome) * 100 : 0)}% dari pendapatan · {r.items.length} catatan · ketuk untuk rincian</span>
              </div>
            </summary>
            <ul className="inc-list">
              {r.items.map((t) => (
                <li key={t.id}>
                  <span>{dayLabel(t.tx_date)}<small className="muted">{[t.note, accName.get(t.account_id)].filter(Boolean).join(' · ')}</small></span>
                  <b>{rp(t.amount)}</b>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>

      <h2 className="section">Anggaran per kategori</h2>
      {d.totalBudget === 0 && !cats.isLoading && (
        <p className="empty">Belum ada kategori di anggaran {monthLabel(start)}. Pilih kategori dan atur nominalnya di Pengaturan → Anggaran.</p>
      )}
      {d.groups.map((g) => (
        <section key={g.g} className="sheet">
          <div className="sheet-head">
            <div>
              <h3>{GRP_LABEL[g.g]}</h3>
              <span className="muted small">Terpakai {rp(g.spent)} dari {rp(g.budget)}</span>
            </div>
            <b className={g.budget - g.spent < 0 ? 'neg' : ''}>{rp(g.budget - g.spent)}</b>
          </div>
          {g.items.map((c) => {
            const left = c.budget - c.spent
            const idle = c.budget === 0 && c.spent === 0
            return (
              <div key={c.id} className={'cat' + (idle ? ' idle' : '')}>
                <span className="emo" aria-hidden="true">{emoji(c.name, c.icon)}</span>
                <div className="cat-body">
                  <div className="line">
                    <span>{c.name}</span>
                    <span className={left < 0 ? 'neg' : ''}>{left < 0 ? 'Lebih ' + rp(-left) : 'Sisa ' + rp(left)}</span>
                  </div>
                  <Bar ratio={c.budget ? c.spent / c.budget : c.spent ? 2 : 0} />
                  <span className="muted small">{rp(c.spent)} dari {rp(c.budget)}</span>
                </div>
              </div>
            )
          })}
        </section>
      ))}
      <Loading q={cats} />

    </>
  )
}
