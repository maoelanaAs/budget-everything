import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icon, Loading, MonthPicker, emoji, formatMoneyInput, parseMoney, useToast } from '../components'
import { useBudgets, useCategories } from '../data'
import { monthStart, rp, shiftMonth } from '../format'
import { supabase } from '../supabase'
import { GRP_LABEL, type Grp } from '../types'

const fmt = (n: number) => (n ? formatMoneyInput(String(n).replace('.', ',')) : '')

export default function Budgets() {
  const qc = useQueryClient()
  const toast = useToast()
  const [start, setStart] = useState(monthStart(new Date()))
  const cats = useCategories()
  const budgets = useBudgets(start)
  const [incl, setIncl] = useState<string[]>([])            // kategori yang masuk anggaran bulan ini
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setIncl((budgets.data ?? []).map((b) => b.category_id))
    setDraft(Object.fromEntries((budgets.data ?? []).map((b) => [b.category_id, fmt(b.amount)])))
    setMsg('')
  }, [budgets.data, start])

  const expense = (cats.data ?? []).filter((c) => c.type === 'expense')
  const inBudget = expense.filter((c) => incl.includes(c.id))
  const available = expense.filter((c) => c.is_active && !incl.includes(c.id))
  const val = (id: string) => parseMoney(draft[id] || '0') || 0
  const sum = (g: Grp) => inBudget.filter((c) => c.grp === g).reduce((s, c) => s + val(c.id), 0)
  const total = inBudget.reduce((s, c) => s + val(c.id), 0)

  const add = (id: string) => setIncl([...incl, id])
  const drop = (id: string) => { setIncl(incl.filter((x) => x !== id)); setDraft({ ...draft, [id]: '' }) }

  async function save() {
    setBusy(true)
    const before = (budgets.data ?? []).map((b) => b.category_id)
    const removed = before.filter((id) => !incl.includes(id))
    const rows = incl.map((id) => ({ period_start: start, category_id: id, amount: val(id) }))
    let err: string | null = null
    if (rows.length) {
      const r = await supabase.from('budgets').upsert(rows, { onConflict: 'user_id,period_start,category_id' })
      if (r.error) err = r.error.message
    }
    if (!err && removed.length) {
      const r = await supabase.from('budgets').delete().eq('period_start', start).in('category_id', removed)
      if (r.error) err = r.error.message
    }
    setBusy(false)
    if (err) return setMsg('Gagal menyimpan: ' + err)
    setMsg('')
    toast('Anggaran disimpan')
    qc.invalidateQueries({ queryKey: ['budgets'] })
  }

  async function copyPrev() {
    const { data, error } = await supabase.from('budgets').select('category_id, amount').eq('period_start', shiftMonth(start, -1))
    if (error) return setMsg('Gagal menyalin: ' + error.message)
    if (!data?.length) return setMsg('Bulan sebelumnya belum punya anggaran.')
    setIncl(data.map((b) => b.category_id as string))
    setDraft(Object.fromEntries(data.map((b) => [b.category_id, fmt(Number(b.amount))])))
    setMsg('Anggaran bulan lalu sudah disalin. Ketuk Simpan untuk menyimpannya.')
  }

  return (
    <>
      <header className="head"><h1>Anggaran</h1><MonthPicker value={start} onChange={setStart} /></header>
      <Loading q={budgets} />
      <div className="budget-top">
        <button type="button" className="ghost" onClick={copyPrev}>Salin dari bulan lalu</button>
      </div>

      {inBudget.length === 0 && !budgets.isLoading && (
        <p className="empty">Belum ada kategori di anggaran bulan ini. Pilih kategori di bawah untuk memasukkannya.</p>
      )}

      {(['need', 'want', 'saving'] as const).map((g) => {
        const items = inBudget.filter((c) => c.grp === g)
        if (!items.length) return null
        return (
          <section key={g} className="sheet">
            <div className="sheet-head"><h3>{GRP_LABEL[g]}</h3><b>{rp(sum(g))}</b></div>
            {items.map((c) => (
              <div key={c.id} className="bud">
                <span className="emo" aria-hidden="true">{emoji(c.name, c.icon)}</span>
                <span className="bud-name">{c.name}{!c.is_active && <small className="muted"> (diarsipkan)</small>}</span>
                <span className="bud-input"><i>Rp</i>
                  <input aria-label={`Anggaran ${c.name}`} inputMode="numeric" placeholder="0" value={draft[c.id] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [c.id]: formatMoneyInput(e.target.value) })} />
                </span>
                <button className="icon-btn mini" aria-label={`Keluarkan ${c.name} dari anggaran`} title="Keluarkan dari anggaran" onClick={() => drop(c.id)}><Icon name="close" /></button>
              </div>
            ))}
          </section>
        )
      })}

      <section className="sheet">
        <div className="sheet-head"><div><h3>Tambah ke anggaran</h3><span className="muted small">Ketuk kategori untuk memasukkannya ke bulan ini</span></div></div>
        {available.length ? (
          <div className="chips pad">
            {available.map((c) => (
              <button key={c.id} type="button" className="chip" onClick={() => add(c.id)}><span aria-hidden="true">{emoji(c.name, c.icon)}</span>{c.name}<Icon name="plus" /></button>
            ))}
          </div>
        ) : (
          <p className="muted small pad">Semua kategori sudah masuk anggaran.</p>
        )}
        <p className="muted small pad">Butuh kategori baru? <Link to="/profil">Kelola kategori di Profil</Link>.</p>
      </section>

      {msg && <p className="muted" role="status">{msg}</p>}
      <div className="savebar sticky">
        <div className="total"><span className="muted small">Total anggaran</span><b>{rp(total)}</b></div>
        <button className="primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </>
  )
}
