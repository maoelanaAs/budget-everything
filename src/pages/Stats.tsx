import { useMemo, useState } from 'react'
import { BackHead, Bar, Loading, MonthPicker, emoji } from '../components'
import { useCategories, useTransactionsRange } from '../data'
import { compact, monthLabel, monthLabelShort, monthStart, rp, shiftMonth } from '../format'

const MONTHS_BACK = 5

/** Teks perubahan dibanding bulan lalu; `goodWhenUp` menentukan warna (pengeluaran naik = buruk). */
function Delta({ now, prev, goodWhenUp }: { now: number; prev: number; goodWhenUp: boolean }) {
  if (prev === 0 && now === 0) return <span className="delta muted">Belum ada data bulan lalu</span>
  if (prev === 0) return <span className="delta muted">Baru, bulan lalu belum ada</span>
  const diff = now - prev
  const pct = Math.round(Math.abs(diff / prev) * 100)
  if (diff === 0) return <span className="delta muted">Sama dengan bulan lalu</span>
  const up = diff > 0
  return <span className={'delta ' + (up === goodWhenUp ? 'pos' : 'neg')}>{up ? '▲ Naik' : '▼ Turun'} {pct}% ({up ? '+' : '-'}{rp(Math.abs(diff))}) dari bulan lalu</span>
}

export default function Stats() {
  const [start, setStart] = useState(monthStart(new Date()))
  const from = shiftMonth(start, -MONTHS_BACK)
  const range = useTransactionsRange(from, start)
  const cats = useCategories()

  const s = useMemo(() => {
    const months = Array.from({ length: MONTHS_BACK + 1 }, (_, i) => shiftMonth(start, i - MONTHS_BACK))
    const byMonth = new Map(months.map((m) => [m.slice(0, 7), { income: 0, expense: 0 }]))
    const catNow = new Map<string, number>()
    const catPrev = new Map<string, number>()
    const prevKey = shiftMonth(start, -1).slice(0, 7)
    const nowKey = start.slice(0, 7)
    for (const t of range.data ?? []) {
      const k = t.tx_date.slice(0, 7)
      const m = byMonth.get(k)
      if (!m) continue
      if (t.type === 'income') m.income += t.amount
      else if (t.type === 'expense') {
        m.expense += t.amount
        const into = k === nowKey ? catNow : k === prevKey ? catPrev : null
        if (into && t.category_id) into.set(t.category_id, (into.get(t.category_id) ?? 0) + t.amount)
      }
    }
    const series = months.map((m) => ({ m, ...byMonth.get(m.slice(0, 7))! }))
    const max = Math.max(1, ...series.flatMap((x) => [x.income, x.expense]))
    const now = byMonth.get(nowKey)!
    const prev = byMonth.get(prevKey)!
    const rows = (cats.data ?? [])
      .filter((c) => c.type === 'expense' && ((catNow.get(c.id) ?? 0) > 0 || (catPrev.get(c.id) ?? 0) > 0))
      .map((c) => ({ ...c, now: catNow.get(c.id) ?? 0, prev: catPrev.get(c.id) ?? 0 }))
      .sort((a, b) => b.now - a.now)
    const movers = rows
      .filter((r) => r.prev > 0 && r.now > r.prev && Math.abs(r.now - r.prev) / r.prev >= 0.2 && r.now - r.prev >= 50000)
      .sort((a, b) => (b.now - b.prev) - (a.now - a.prev))
      .slice(0, 3)
    return { series, max, now, prev, rows, movers }
  }, [range.data, cats.data, start])

  const isEmpty = !range.isLoading && s.series.every((x) => x.income === 0 && x.expense === 0)

  return (
    <>
      <BackHead to="/" label="Ringkasan" title="Statistik"><MonthPicker value={start} onChange={setStart} /></BackHead>
      <Loading q={range} />
      {isEmpty && <p className="empty">Belum ada catatan pada 6 bulan sampai {monthLabel(start)}.</p>}

      {start === monthStart(new Date()) && <p className="hint-text" style={{ marginBottom: 12 }}>Bulan ini baru berjalan {new Date().getDate()} hari, jadi angkanya wajar lebih kecil dari bulan lalu.</p>}
      <div className="stat2">
        <div><span className="muted small">Pengeluaran</span><b>{rp(s.now.expense)}</b><Delta now={s.now.expense} prev={s.prev.expense} goodWhenUp={false} /></div>
        <div><span className="muted small">Pemasukan</span><b>{rp(s.now.income)}</b><Delta now={s.now.income} prev={s.prev.income} goodWhenUp={true} /></div>
      </div>

      <section className="sheet">
        <div className="sheet-head"><div><h3>Tren 6 bulan</h3><span className="muted small">Sampai {monthLabel(start)}</span></div></div>
        <div className="legend"><span><i className="b-in" />Pemasukan</span><span><i className="b-out" />Pengeluaran</span></div>
        <div className="trend" role="group" aria-label="Pemasukan dan pengeluaran per bulan">
          {s.series.map((x, i) => (
            <div key={x.m} className={'trend-col' + (i === s.series.length - 1 ? ' now' : '')}
              role="img" aria-label={`${monthLabel(x.m)}: pemasukan ${rp(x.income)}, pengeluaran ${rp(x.expense)}`}>
              <div className="trend-bars" aria-hidden="true">
                <span><em>{x.income ? compact(x.income) : ''}</em><i className="b-in" style={{ height: `${Math.max(2, (x.income / s.max) * 100)}px` }} /></span>
                <span><em>{x.expense ? compact(x.expense) : ''}</em><i className="b-out" style={{ height: `${Math.max(2, (x.expense / s.max) * 100)}px` }} /></span>
              </div>
              <span className="trend-lab">{monthLabelShort(x.m).split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </section>

      {s.movers.length > 0 && (
        <section className="sheet">
          <div className="sheet-head"><div><h3>Yang naik dibanding bulan lalu</h3></div></div>
          <ul className="movers">
            {s.movers.map((r) => (
              <li key={r.id}>{emoji(r.name, r.icon)} {r.name} naik {Math.round(((r.now - r.prev) / r.prev) * 100)}% <span className="muted small">(+{rp(r.now - r.prev)})</span></li>
            ))}
          </ul>
        </section>
      )}

      <section className="sheet">
        <div className="sheet-head"><div><h3>Pengeluaran per kategori</h3><span className="muted small">{monthLabel(start)}, dibanding bulan lalu</span></div><b>{rp(s.now.expense)}</b></div>
        {s.rows.length === 0 && !range.isLoading && <p className="muted small pad">Belum ada pengeluaran bulan ini.</p>}
        {s.rows.map((r) => (
          <div key={r.id} className="cmp">
            <span className="emo" aria-hidden="true">{emoji(r.name, r.icon)}</span>
            <div className="cat-body">
              <div className="line"><span>{r.name}</span><span>{rp(r.now)}</span></div>
              <Bar ratio={s.now.expense ? r.now / s.now.expense : 0} tone="ink" />
              <span className="muted small">{Math.round(s.now.expense ? (r.now / s.now.expense) * 100 : 0)}% dari pengeluaran</span>
              <Delta now={r.now} prev={r.prev} goodWhenUp={false} />
            </div>
          </div>
        ))}
      </section>
    </>
  )
}
