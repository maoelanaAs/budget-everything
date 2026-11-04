import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loading, emoji, formatMoneyInput, parseMoney, useToast } from '../components'
import { useAccounts, useAction, useCategories } from '../data'
import { iso, rp, today } from '../format'
import { supabase } from '../supabase'

type Mode = 'expense' | 'income' | 'transfer' | 'adjustment'
const LABEL: Record<Mode, string> = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Pindah saldo', adjustment: 'Koreksi saldo' }
const DONE: Record<Mode, string> = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Pindah saldo', adjustment: 'Koreksi saldo' }

const LAST = 'budgeting:last-account'
const readLast = () => { try { return localStorage.getItem(LAST) ?? '' } catch { return '' } }
const writeLast = (v: string) => { try { localStorage.setItem(LAST, v) } catch { /* abaikan */ } }
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return iso(d) }

export default function AddEntry() {
  const nav = useNavigate()
  const toast = useToast()
  const { table, id } = useParams()
  const editing = Boolean(id)
  const validTable = table === 'transactions' || table === 'transfers'
  const entry = useQuery({
    queryKey: ['entry', table, id],
    enabled: editing && validTable,
    queryFn: async () => {
      const { data, error } = await supabase.from(table!).select('*').eq('id', id!).single()
      if (error) throw new Error(error.message)
      return data as Record<string, unknown>
    },
  })
  const accs = useAccounts().data ?? []
  const cats = useCategories().data ?? []
  const [mode, setMode] = useState<Mode>('expense')
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [minus, setMinus] = useState(true) // hanya untuk koreksi saldo
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState(readLast())
  const [to, setTo] = useState('')
  const [fee, setFee] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const accountId = accs.some((a) => a.id === account) ? account : ''

  // isi formulir dari catatan yang diubah (sekali saja)
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    const r = entry.data
    if (!editing || !r || filled) return
    const amt = Number(r.amount)
    setDate(String(r.tx_date))
    setNote(String(r.note ?? ''))
    setAmount(formatMoneyInput(String(Math.abs(amt)).replace('.', ',')))
    if (table === 'transfers') {
      setMode('transfer')
      setAccount(String(r.from_account_id)); setTo(String(r.to_account_id))
      setFee(Number(r.admin_fee) ? formatMoneyInput(String(r.admin_fee).replace('.', ',')) : '')
    } else {
      setMode(r.type as Mode)
      setAccount(String(r.account_id)); setCategory(String(r.category_id ?? ''))
      setMinus(amt < 0)
    }
    setFilled(true)
  }, [entry.data, editing, filled, table])

  const save = useAction(async () => {
    const value = parseMoney(amount)
    if (!value || value <= 0) return { error: { message: 'Isi nominal lebih dari 0.' } }
    if (!accountId) return { error: { message: 'Pilih akun terlebih dulu.' } }
    if (mode === 'transfer') {
      if (!to) return { error: { message: 'Pilih akun tujuan.' } }
      if (to === accountId) return { error: { message: 'Akun tujuan harus berbeda dari akun asal.' } }
      const row = { tx_date: date, from_account_id: accountId, to_account_id: to, amount: value, admin_fee: parseMoney(fee || '0') || 0, note: note || null }
      return editing ? supabase.from('transfers').update(row).eq('id', id!) : supabase.from('transfers').insert(row)
    }
    if (mode !== 'adjustment' && !category) return { error: { message: 'Pilih kategori.' } }
    const row = {
      tx_date: date, type: mode, amount: mode === 'adjustment' && minus ? -value : value,
      category_id: mode === 'adjustment' ? null : category, account_id: accountId, note: note || null,
    }
    return editing ? supabase.from('transactions').update(row).eq('id', id!) : supabase.from('transactions').insert(row)
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const value = parseMoney(amount)
    save.mutate(undefined as never, {
      onSuccess: () => {
        if (editing) {
          toast(`${DONE[mode]} ${rp(value)} diperbarui`)
          nav('/transaksi')
          return
        }
        writeLast(accountId)
        toast(`${DONE[mode]} ${rp(value)} disimpan`)
        setAmount(''); setNote(''); setFee(''); setCategory('')
      },
      onError: (err) => setError((err as Error).message),
    })
  }

  const list = cats.filter((c) => c.type === mode && (c.is_active || c.id === category))
  const showCats = mode === 'expense' || mode === 'income'

  return (
    <>
      <header className="head"><h1>{editing ? `Ubah ${LABEL[mode].toLowerCase()}` : 'Catat'}</h1></header>
      {editing && !validTable && <p className="error">Catatan tidak ditemukan.</p>}
      {editing && validTable && <Loading q={entry} />}
      {!editing && <div className="seg" role="tablist" aria-label="Jenis catatan">
        {(Object.keys(LABEL) as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={m === mode} className={m === mode ? 'on' : ''} onClick={() => { setMode(m); setCategory(''); setError('') }}>{LABEL[m]}</button>
        ))}
      </div>}

      <form className="entry" onSubmit={submit} hidden={editing && !filled}>
        <div className="amount">
          {mode === 'adjustment' && (
            <div className="sign" role="group" aria-label="Tambah atau kurangi saldo">
              <button type="button" className={!minus ? 'on' : ''} onClick={() => setMinus(false)}>Tambah</button>
              <button type="button" className={minus ? 'on' : ''} onClick={() => setMinus(true)}>Kurangi</button>
            </div>
          )}
          <label className="amount-field">
            <span className="amount-cur">Rp</span>
            <input aria-label="Nominal" inputMode="decimal" autoComplete="off" autoFocus placeholder="0"
              value={amount} onChange={(e) => setAmount(formatMoneyInput(e.target.value))} />
          </label>
        </div>

        {showCats && (
          <fieldset>
            <legend>Kategori</legend>
            <div className="chips">
              {list.map((c) => (
                <button key={c.id} type="button" className={'chip' + (category === c.id ? ' on' : '')} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  <span aria-hidden="true">{emoji(c.name, c.icon)}</span>{c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>{mode === 'transfer' ? 'Dari akun' : mode === 'income' ? 'Masuk ke akun' : 'Akun'}</legend>
          <div className="chips">
            {accs.map((a) => (
              <button key={a.id} type="button" className={'chip' + (accountId === a.id ? ' on' : '')} aria-pressed={accountId === a.id} onClick={() => setAccount(a.id)}>{a.name}</button>
            ))}
          </div>
        </fieldset>

        {mode === 'transfer' && (
          <>
            <fieldset>
              <legend>Ke akun</legend>
              <div className="chips">
                {accs.filter((a) => a.id !== accountId).map((a) => (
                  <button key={a.id} type="button" className={'chip' + (to === a.id ? ' on' : '')} aria-pressed={to === a.id} onClick={() => setTo(a.id)}>{a.name}</button>
                ))}
              </div>
            </fieldset>
            <label className="field">Biaya admin (opsional)
              <input inputMode="decimal" placeholder="0" value={fee} onChange={(e) => setFee(formatMoneyInput(e.target.value))} />
            </label>
          </>
        )}

        {mode === 'adjustment' && <p className="hint-text">Pakai ini untuk menyamakan saldo di aplikasi dengan saldo asli di bank atau dompet. Tidak dihitung sebagai pemasukan atau pengeluaran.</p>}

        <fieldset>
          <legend>Tanggal</legend>
          <div className="chips">
            <button type="button" className={'chip' + (date === today() ? ' on' : '')} onClick={() => setDate(today())}>Hari ini</button>
            <button type="button" className={'chip' + (date === yesterday() ? ' on' : '')} onClick={() => setDate(yesterday())}>Kemarin</button>
            <input className="chip date" type="date" aria-label="Pilih tanggal lain" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </fieldset>

        <label className="field">Catatan (opsional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: makan siang bareng" />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        <div className="savebar">
          <button type="button" className="ghost" onClick={() => nav('/transaksi')}>{editing ? 'Batal' : 'Lihat transaksi'}</button>
          <button className="primary" disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan'}</button>
        </div>
      </form>
    </>
  )
}
