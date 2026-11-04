import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Loading, MonthPicker, emoji, useToast } from '../components'
import { useAccounts, useAction, useCategories, useTransactions, useTransfers } from '../data'
import { dayLabel, monthStart, rp } from '../format'
import { supabase } from '../supabase'

type Kind = 'expense' | 'income' | 'transfer' | 'adjustment'
interface Row { key: string; date: string; table: 'transactions' | 'transfers'; id: string; kind: Kind; icon: string; title: string; sub: string; amount: number }

const FILTERS: { v: '' | Kind; label: string }[] = [
  { v: '', label: 'Semua' }, { v: 'expense', label: 'Pengeluaran' }, { v: 'income', label: 'Pemasukan' },
  { v: 'transfer', label: 'Pindah saldo' }, { v: 'adjustment', label: 'Koreksi' },
]

export default function Transactions() {
  const [start, setStart] = useState(monthStart(new Date()))
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<'' | Kind>('')
  const [open, setOpen] = useState('')
  const [folded, setFolded] = useState<string[]>([])   // tanggal yang diciutkan
  const toast = useToast()
  const nav = useNavigate()
  const txs = useTransactions(start)
  const trs = useTransfers(start)
  const cats = useCategories()
  const accs = useAccounts()
  const del = useAction(({ table, id }: { table: string; id: string }) => supabase.from(table).delete().eq('id', id))

  const rows = useMemo<Row[]>(() => {
    const cn = new Map((cats.data ?? []).map((c) => [c.id, c.name]))
    const ci = new Map((cats.data ?? []).map((c) => [c.id, c.icon]))
    const an = new Map((accs.data ?? []).map((a) => [a.id, a.name]))
    const a: Row[] = (txs.data ?? []).map((t) => {
      const name = t.type === 'adjustment' ? 'Koreksi saldo' : cn.get(t.category_id ?? '') ?? 'Tanpa kategori'
      return {
        key: 't' + t.id, date: t.tx_date, table: 'transactions', id: t.id, kind: t.type,
        icon: t.type === 'adjustment' ? '⚖️' : emoji(name, ci.get(t.category_id ?? '')), title: name,
        sub: [an.get(t.account_id), t.note].filter(Boolean).join(' – '), amount: t.amount,
      }
    })
    const b: Row[] = (trs.data ?? []).map((t) => ({
      key: 'x' + t.id, date: t.tx_date, table: 'transfers', id: t.id, kind: 'transfer', icon: '🔄',
      title: `${an.get(t.from_account_id) ?? '?'} ke ${an.get(t.to_account_id) ?? '?'}`,
      sub: [t.admin_fee ? `Biaya admin ${rp(t.admin_fee)}` : '', t.note].filter(Boolean).join(' – '), amount: t.amount,
    }))
    return [...a, ...b].sort((x, y) => (x.date < y.date ? 1 : -1))
  }, [txs.data, trs.data, cats.data, accs.data])

  const shown = rows.filter((r) => (!kind || r.kind === kind) && (!q || (r.title + ' ' + r.sub).toLowerCase().includes(q.toLowerCase())))
  const days = [...new Set(shown.map((r) => r.date))]
  const byDay = shown.reduce<Record<string, Row[]>>((m, r) => ((m[r.date] ??= []).push(r), m), {})

  const money = (r: Row) =>
    r.kind === 'expense' ? <b className="neg">-{rp(r.amount)}</b>
    : r.kind === 'income' ? <b className="pos">+{rp(r.amount)}</b>
    : r.kind === 'adjustment' ? <b className={r.amount < 0 ? 'neg' : 'pos'}>{r.amount < 0 ? '-' : '+'}{rp(Math.abs(r.amount))}</b>
    : <b>{rp(r.amount)}</b>

  function remove(r: Row) {
    if (!confirm(`Hapus "${r.title}" sebesar ${rp(Math.abs(r.amount))}? Saldo akun akan dihitung ulang.`)) return
    del.mutate({ table: r.table, id: r.id }, { onSuccess: () => { setOpen(''); toast('Catatan dihapus') } })
  }

  return (
    <>
      <header className="head"><h1>Transaksi</h1><MonthPicker value={start} onChange={(v) => { setStart(v); setFolded([]); setOpen('') }} /></header>

      <label className="search">
        <Icon name="search" />
        <input type="search" placeholder="Cari kategori, akun, atau catatan" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="chips scroll" role="group" aria-label="Filter jenis">
        {FILTERS.map((f) => (
          <button key={f.v} type="button" className={'chip' + (kind === f.v ? ' on' : '')} aria-pressed={kind === f.v} onClick={() => setKind(f.v)}>{f.label}</button>
        ))}
      </div>

      <Loading q={txs} />
      {days.length > 1 && (
        <div className="foldall">
          <button className="link" onClick={() => setFolded(folded.length === days.length ? [] : days)}>
            {folded.length === days.length ? 'Buka semua hari' : 'Ciutkan semua hari'}
          </button>
        </div>
      )}
      {Object.entries(byDay).map(([date, list]) => {
        const out = list.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.amount, 0)
        const inc = list.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amount, 0)
        const isFolded = folded.includes(date)
        return (
          <section key={date} className="day">
            <button className="day-head" aria-expanded={!isFolded} onClick={() => setFolded(isFolded ? folded.filter((d) => d !== date) : [...folded, date])}>
              <span className={'fold' + (isFolded ? '' : ' open')} aria-hidden="true"><Icon name="chevron" /></span>
              <span className="day-title"><h3>{dayLabel(date)}</h3><small className="muted">{list.length} catatan</small></span>
              <span className="muted small">{out > 0 ? `Keluar ${rp(out)}` : inc > 0 ? `Masuk ${rp(inc)}` : ''}</span>
            </button>
            {!isFolded && <div className="sheet">
              {list.map((r) => (
                <div key={r.key} className="tx">
                  <button className="tx-main" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? '' : r.key)}>
                    <span className="emo" aria-hidden="true">{r.icon}</span>
                    <span className="tx-text"><span>{r.title}</span>{r.sub && <small className="muted">{r.sub}</small>}</span>
                    {money(r)}
                  </button>
                  {open === r.key && (
                    <div className="tx-actions">
                      <button className="icon-btn" aria-label="Ubah catatan" title="Ubah" onClick={() => nav(`/ubah/${r.table}/${r.id}`)}><Icon name="edit" /></button>
                      <button className="icon-btn danger" aria-label="Hapus catatan" title="Hapus" onClick={() => remove(r)}><Icon name="trash" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>}
          </section>
        )
      })}
      {!txs.isLoading && shown.length === 0 && (
        <p className="empty">{rows.length === 0 ? 'Belum ada catatan di bulan ini. Ketuk Catat untuk menambah.' : 'Tidak ada catatan yang cocok dengan pencarian atau filter ini.'}</p>
      )}
    </>
  )
}
