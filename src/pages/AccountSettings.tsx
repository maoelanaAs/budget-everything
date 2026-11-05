import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BackHead, Icon, Loading, Switch, formatMoneyInput, parseMoney, useToast } from '../components'
import { useAllAccounts, useBalances } from '../data'
import { rp, today } from '../format'
import { supabase } from '../supabase'
import type { Account } from '../types'

interface Draft { id?: string; name: string; balance: string; held: string; counted: boolean }
const money = (n: number) => (n ? formatMoneyInput(String(n).replace('.', ','), true) : '')
const round2 = (n: number) => Math.round(n * 100) / 100

export default function AccountSettings() {
  const qc = useQueryClient()
  const toast = useToast()
  const accounts = useAllAccounts()
  const balances = useBalances()
  const [form, setForm] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const all = accounts.data ?? []
  const active = all.filter((a) => a.is_active)
  const archived = all.filter((a) => !a.is_active)
  const balanceOf = (id: string) => (balances.data ?? []).find((b) => b.account_id === id)?.balance ?? 0
  const refresh = () => qc.invalidateQueries()

  function startAdd() { setError(''); setForm({ name: '', balance: '', held: '', counted: true }) }
  function startEdit(a: Account) {
    if (!balances.data) return toast('Saldo masih dimuat, coba lagi sebentar.')
    setError('')
    setForm({ id: a.id, name: a.name, balance: money(balanceOf(a.id)), held: money(a.min_balance), counted: a.include_in_total })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const name = form.name.trim()
    if (!name) return setError('Isi nama akun.')
    const target = form.balance ? parseMoney(form.balance) : 0
    const held = form.held ? parseMoney(form.held) : 0
    if (Number.isNaN(target) || Number.isNaN(held)) return setError('Nominal tidak valid.')
    if (held < 0) return setError('Saldo ditahan tidak boleh negatif.')
    setBusy(true); setError('')

    const fields = { name, min_balance: held, include_in_total: form.counted }
    let id = form.id
    if (id) {
      const r = await supabase.from('accounts').update(fields).eq('id', id)
      if (r.error) return fail(r.error)
    } else {
      const maxOrder = Math.max(0, ...all.map((a) => a.sort_order))
      const r = await supabase.from('accounts').insert({ ...fields, sort_order: maxOrder + 1 }).select('id').single()
      if (r.error) return fail(r.error)
      id = (r.data as { id: string }).id
    }

    // Ubah saldo = catat penyesuaian sebesar selisihnya (bukan pemasukan/pengeluaran).
    const delta = round2(target - (form.id ? balanceOf(form.id) : 0))
    if (delta !== 0) {
      const r = await supabase.from('transactions').insert({
        tx_date: today(), type: 'adjustment', amount: delta, category_id: null, account_id: id,
        note: form.id ? 'Koreksi saldo dari manajemen akun' : 'Saldo awal',
      })
      if (r.error) return fail(r.error, 'Akun tersimpan, tetapi saldo gagal diubah: ')
    }
    setBusy(false)
    toast(form.id ? 'Akun diperbarui' : 'Akun ditambahkan')
    setForm(null)
    refresh()
  }

  function fail(err: { code?: string; message: string }, prefix = 'Gagal menyimpan: ') {
    setBusy(false)
    setError(err.code === '23505' ? 'Nama akun ini sudah dipakai.' : prefix + err.message)
    refresh()
  }

  async function remove(a: Account) {
    const [t, fr, to] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('account_id', a.id),
      supabase.from('transfers').select('id', { count: 'exact', head: true }).eq('from_account_id', a.id),
      supabase.from('transfers').select('id', { count: 'exact', head: true }).eq('to_account_id', a.id),
    ])
    const err = t.error ?? fr.error ?? to.error
    if (err) return toast('Gagal memeriksa: ' + err.message)
    const n = (t.count ?? 0) + (fr.count ?? 0) + (to.count ?? 0)
    if (n === 0) {
      if (!confirm(`Hapus akun "${a.name}"? Akun ini belum dipakai di catatan mana pun.`)) return
      const r = await supabase.from('accounts').delete().eq('id', a.id)
      if (r.error) return toast('Gagal menghapus: ' + r.error.message)
      toast('Akun dihapus')
    } else {
      if (!confirm(`"${a.name}" dipakai di ${n} catatan, jadi tidak bisa dihapus. Arsipkan saja? Akun tidak muncul lagi di pilihan dan tidak dihitung di total, tetapi riwayatnya tetap utuh.`)) return
      const r = await supabase.from('accounts').update({ is_active: false }).eq('id', a.id)
      if (r.error) return toast('Gagal mengarsipkan: ' + r.error.message)
      toast('Akun diarsipkan')
    }
    refresh()
  }

  async function restore(a: Account) {
    const r = await supabase.from('accounts').update({ is_active: true }).eq('id', a.id)
    if (r.error) return toast('Gagal mengaktifkan: ' + r.error.message)
    toast('Akun diaktifkan lagi')
    refresh()
  }

  const row = (a: Account, isArchived: boolean) => (
    <div key={a.id} className="crow arow">
      <div className="crow-text">
        <span>{a.name}</span>
        <small className="muted">
          {isArchived ? 'Diarsipkan' : rp(balanceOf(a.id))}{!a.include_in_total && ' · Tidak dihitung di total'}
        </small>
      </div>
      {isArchived ? (
        <button className="ghost small-btn" onClick={() => restore(a)}>Aktifkan</button>
      ) : (
        <button className="icon-btn" aria-label={`Ubah ${a.name}`} title="Ubah" onClick={() => startEdit(a)}><Icon name="edit" /></button>
      )}
      <button className="icon-btn danger" aria-label={`Hapus ${a.name}`} title="Hapus" onClick={() => remove(a)}><Icon name="trash" /></button>
    </div>
  )

  return (
    <>
      <BackHead to="/pengaturan" label="Pengaturan" title="Manajemen akun" />
      <Loading q={accounts} />

      {form ? (
        <form className="sheet catform" onSubmit={save}>
          <h3>{form.id ? 'Ubah akun' : 'Akun baru'}</h3>
          <label className="field">Nama
            <input autoFocus value={form.name} maxLength={30} placeholder="Contoh: Dompet" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">{form.id ? 'Saldo saat ini' : 'Saldo awal'}
            <input inputMode="decimal" placeholder="0" value={form.balance} onChange={(e) => setForm({ ...form, balance: formatMoneyInput(e.target.value, true) })} />
          </label>
          {form.id && <p className="hint-text">Mengubah saldo tidak dihitung sebagai pemasukan atau pengeluaran. Selisihnya dicatat sebagai koreksi saldo hari ini.</p>}
          <label className="field">Saldo ditahan (opsional)
            <input inputMode="decimal" placeholder="0" value={form.held} onChange={(e) => setForm({ ...form, held: formatMoneyInput(e.target.value) })} />
          </label>
          <Switch on={form.counted} onChange={(v) => setForm({ ...form, counted: v })} label="Hitung di total saldo" hint="Matikan untuk akun yang tidak ingin ikut dijumlahkan, misalnya kartu transportasi." />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="savebar">
            <button type="button" className="ghost" onClick={() => setForm(null)}>Batal</button>
            <button className="primary" disabled={busy}>{busy ? 'Menyimpan…' : form.id ? 'Simpan perubahan' : 'Tambah akun'}</button>
          </div>
        </form>
      ) : (
        <button className="ghost addcat" onClick={startAdd}><Icon name="plus" />Tambah akun</button>
      )}

      {!accounts.isLoading && (
        <section className="sheet">
          {active.length === 0 ? <p className="empty">Belum ada akun. Ketuk Tambah akun.</p> : active.map((a) => row(a, false))}
        </section>
      )}

      {archived.length > 0 && (
        <details className="sheet">
          <summary className="arch-sum">Diarsipkan ({archived.length})</summary>
          {archived.map((a) => row(a, true))}
        </details>
      )}
    </>
  )
}
