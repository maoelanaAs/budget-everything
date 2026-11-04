import { useMemo, useState } from 'react'
import { Bar, Loading, MonthPicker, emoji } from '../components'
import { useAccounts, useBalances, useBudgets, useCategories, useTransactions } from '../data'
import { daysLeft, monthLabel, monthStart, rp } from '../format'
import { today } from '../format'
import { GRP_LABEL, type Grp } from '../types'

export default function Dashboard() {
  const thisMonth = monthStart(new Date())
  const [start, setStart] = useState(thisMonth)
  const cats = useCategories()
  const budgets = useBudgets(start)
  const txs = useTransactions(start)
  const balances = useBalances()
  useAccounts()

  const d = useMemo(() => {
    const expense = (txs.data ?? []).filter((t) => t.type === 'expense')
    const income = (txs.data ?? []).filter((t) => t.type === 'income')
    const spent = new Map<string, number>()
    for (const t of expense) spent.set(t.category_id!, (spent.get(t.category_id!) ?? 0) + t.amount)
    const budget = new Map((budgets.data ?? []).map((b) => [b.category_id, b.amount]))
    const rows = (cats.data ?? [])
      .filter((c) => c.type === 'expense')
      .map((c) => ({ ...c, budget: budget.get(c.id) ?? 0, spent: spent.get(c.id) ?? 0 }))
    const groups = (['need', 'want', 'saving'] as Grp[]).map((g) => {
      const items = rows.filter((x) => x.grp === g)
      return { g, items, budget: items.reduce((s, x) => s + x.budget, 0), spent: items.reduce((s, x) => s + x.spent, 0) }
    })
    return {
      groups,
      totalBudget: rows.reduce((s, x) => s + x.budget, 0),
      totalSpent: rows.reduce((s, x) => s + x.spent, 0),
      totalIncome: income.reduce((s, t) => s + t.amount, 0),
      todaySpent: expense.filter((t) => t.tx_date === today()).reduce((s, t) => s + t.amount, 0),
    }
  }, [txs.data, budgets.data, cats.data])

  const bal = balances.data ?? []
  const usable = bal.filter((b) => b.include_in_total).reduce((s, b) => s + b.balance, 0) - bal.reduce((s, b) => s + b.min_balance, 0)
  const left = daysLeft(start)
  const perDay = left > 0 ? Math.floor(usable / left / 500) * 500 : 0
  const isCurrent = start === thisMonth && left > 0
  const remaining = d.totalBudget - d.totalSpent

  return (
    <>
      <header className="head"><h1>Ringkasan</h1><MonthPicker value={start} onChange={setStart} /></header>
      <Loading q={txs} />

      {isCurrent ? (
        <section className="hero">
          <p className="hero-label">Batas aman per hari</p>
          <p className="hero-num">{rp(perDay)}</p>
          <Bar ratio={perDay ? d.todaySpent / perDay : d.todaySpent ? 2 : 0} tone="ink" />
          <p className="hero-sub">
            {d.todaySpent === 0
              ? 'Belum ada pengeluaran hari ini.'
              : d.todaySpent <= perDay
                ? `Hari ini terpakai ${rp(d.todaySpent)}, sisa ${rp(perDay - d.todaySpent)}.`
                : `Hari ini terpakai ${rp(d.todaySpent)}, lebih ${rp(d.todaySpent - perDay)} dari batas.`}
          </p>
          <p className="hero-foot">Saldo yang bisa dipakai {rp(usable)} untuk {left} hari lagi.</p>
        </section>
      ) : (
        <section className="hero">
          <p className="hero-label">Sisa anggaran {monthLabel(start)}</p>
          <p className="hero-num">{rp(remaining)}</p>
          <Bar ratio={d.totalBudget ? d.totalSpent / d.totalBudget : 0} tone="ink" />
          <p className="hero-sub">Terpakai {rp(d.totalSpent)} dari anggaran {rp(d.totalBudget)}.</p>
        </section>
      )}

      <section className="figures" aria-label="Ringkasan bulan ini">
        <div><span>Pemasukan</span><b>{rp(d.totalIncome)}</b></div>
        <div><span>Pengeluaran</span><b>{rp(d.totalSpent)}</b></div>
        <div><span>Sisa anggaran</span><b className={remaining < 0 ? 'neg' : ''}>{rp(remaining)}</b></div>
      </section>

      <h2 className="section">Anggaran per kategori</h2>
      {d.totalBudget === 0 && !cats.isLoading && (
        <p className="empty">Belum ada anggaran untuk {monthLabel(start)}. Atur di menu Anggaran.</p>
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
                <span className="emo" aria-hidden="true">{emoji(c.name)}</span>
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

      <details className="sheet accounts" open>
        <summary>
          <div><h3>Saldo akun</h3><span className="muted small">Bisa dipakai {rp(usable)}</span></div>
          <b>{rp(bal.filter((b) => b.include_in_total).reduce((s, b) => s + b.balance, 0))}</b>
        </summary>
        {bal.map((b) => (
          <div key={b.account_id} className="acct">
            <div>
              <span>{b.name}</span>
              {!b.include_in_total && <small className="muted">Tidak dihitung di total</small>}
              {b.min_balance > 0 && <small className="muted">Ditahan {rp(b.min_balance)}</small>}
            </div>
            <b>{rp(b.balance)}</b>
          </div>
        ))}
        <Loading q={balances} />
      </details>
    </>
  )
}
