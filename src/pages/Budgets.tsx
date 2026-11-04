import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loading, MonthPicker, emoji, formatMoneyInput, parseMoney, useToast } from '../components'
import { useBudgets, useCategories } from '../data'
import { monthStart, rp, shiftMonth } from '../format'
import { supabase } from '../supabase'
import { GRP_LABEL } from '../types'

export default function Budgets() {
  const qc = useQueryClient()
  const toast = useToast()
  const [start, setStart] = useState(monthStart(new Date()))
  const cats = useCategories()
  const budgets = useBudgets(start)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setDraft(Object.fromEntries((budgets.data ?? []).map((b) => [b.category_id, b.amount ? formatMoneyInput(String(b.amount).replace('.', ',')) : ''])))
    setMsg('')
  }, [budgets.data, start])

  const expense = (cats.data ?? []).filter((c) => c.type === 'expense')
  const total = expense.reduce((s, c) => s + (parseMoney(draft[c.id] || '0') || 0), 0)
  const sum = (g: string) => expense.filter((c) => c.grp === g).reduce((s, c) => s + (parseMoney(draft[c.id] || '0') || 0), 0)

  async function save() {
    setBusy(true)
    const rows = expense.map((c) => ({ period_start: start, category_id: c.id, amount: parseMoney(draft[c.id] || '0') || 0 }))
    const { error } = await supabase.from('budgets').upsert(rows, { onConflict: 'user_id,period_start,category_id' })
    setBusy(false)
    if (error) return setMsg('Gagal menyimpan: ' + error.message)
    setMsg('')
    toast('Anggaran disimpan')
    qc.invalidateQueries({ queryKey: ['budgets'] })
  }

  async function copyPrev() {
    const { data, error } = await supabase.from('budgets').select('category_id, amount').eq('period_start', shiftMonth(start, -1))
    if (error) return setMsg('Gagal menyalin: ' + error.message)
    if (!data?.length) return setMsg('Bulan sebelumnya belum punya anggaran.')
    setDraft(Object.fromEntries(data.map((b) => [b.category_id, b.amount ? formatMoneyInput(String(b.amount).replace('.', ',')) : ''])))
    setMsg('Anggaran bulan lalu sudah disalin. Ketuk Simpan untuk menyimpannya.')
  }

  return (
    <>
      <header className="head"><h1>Anggaran</h1><MonthPicker value={start} onChange={setStart} /></header>
      <Loading q={budgets} />
      <div className="budget-top">
        <button type="button" className="ghost" onClick={copyPrev}>Salin dari bulan lalu</button>
      </div>
      {(['need', 'want', 'saving'] as const).map((g) => (
        <section key={g} className="sheet">
          <div className="sheet-head"><h3>{GRP_LABEL[g]}</h3><b>{rp(sum(g))}</b></div>
          {expense.filter((c) => c.grp === g).map((c) => (
            <label key={c.id} className="bud">
              <span className="emo" aria-hidden="true">{emoji(c.name)}</span>
              <span className="bud-name">{c.name}</span>
              <span className="bud-input"><i>Rp</i>
                <input inputMode="numeric" placeholder="0" value={draft[c.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [c.id]: formatMoneyInput(e.target.value) })} />
              </span>
            </label>
          ))}
        </section>
      ))}
      {msg && <p className="muted" role="status">{msg}</p>}
      <div className="savebar sticky">
        <div className="total"><span className="muted small">Total anggaran</span><b>{rp(total)}</b></div>
        <button className="primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
    </>
  )
}
