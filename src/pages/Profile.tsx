import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon, Loading, emoji, useToast } from '../components'
import { useCategories } from '../data'
import { supabase } from '../supabase'
import { GRP_LABEL, type Category, type Grp } from '../types'

const ICONS = ['🍜', '🍔', '☕', '🧋', '🛒', '🏠', '⚡', '💧', '⛽', '🚆', '🚗', '🛵', '📶', '📱', '🧺', '🧴', '💊', '🏥', '🎬', '🎮', '🎁', '👕', '✈️', '📚', '🎓', '💼', '🎉', '💰', '📈', '🐷', '🔁', '🐱', '👪', '🥳', '⏱️', '🏷️']
type Kind = 'expense' | 'income'
interface Draft { id?: string; name: string; grp: Grp; icon: string }

export default function Profile() {
  const qc = useQueryClient()
  const toast = useToast()
  const cats = useCategories()
  const [email, setEmail] = useState('')
  const [kind, setKind] = useState<Kind>('expense')
  const [form, setForm] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')) }, [])

  const all = (cats.data ?? []).filter((c) => c.type === kind)
  const active = all.filter((c) => c.is_active)
  const archived = all.filter((c) => !c.is_active)

  const refresh = () => qc.invalidateQueries()

  function startAdd() { setError(''); setForm({ name: '', grp: 'want', icon: '' }) }
  function startEdit(c: Category) { setError(''); setForm({ id: c.id, name: c.name, grp: c.grp ?? 'want', icon: c.icon ?? emoji(c.name) }) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const name = form.name.trim()
    if (!name) return setError('Isi nama kategori.')
    setBusy(true); setError('')
    const grp = kind === 'expense' ? form.grp : null
    const icon = form.icon || null
    const maxOrder = Math.max(0, ...(cats.data ?? []).map((c) => c.sort_order))
    const { error } = form.id
      ? await supabase.from('categories').update({ name, grp, icon }).eq('id', form.id)
      : await supabase.from('categories').insert({ name, type: kind, grp, icon, sort_order: maxOrder + 1 })
    setBusy(false)
    if (error) {
      if (error.code === '23505') return setError('Nama kategori ini sudah dipakai.')
      if (error.message.includes('icon')) return setError('Kolom ikon belum ada di database. Jalankan SQL di supabase/migrations/001_category_icon.sql lalu coba lagi.')
      return setError('Gagal menyimpan: ' + error.message)
    }
    toast(form.id ? 'Kategori diperbarui' : 'Kategori ditambahkan')
    setForm(null)
    refresh()
  }

  async function remove(c: Category) {
    const used = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category_id', c.id)
    if (used.error) return toast('Gagal memeriksa: ' + used.error.message)
    const n = used.count ?? 0
    if (n === 0) {
      if (!confirm(`Hapus kategori "${c.name}"? Kategori ini belum dipakai di catatan mana pun.`)) return
      const b = await supabase.from('budgets').delete().eq('category_id', c.id)
      if (b.error) return toast('Gagal menghapus: ' + b.error.message)
      const r = await supabase.from('categories').delete().eq('id', c.id)
      if (r.error) return toast('Gagal menghapus: ' + r.error.message)
      toast('Kategori dihapus')
    } else if (c.is_active) {
      if (!confirm(`"${c.name}" dipakai di ${n} catatan, jadi tidak bisa dihapus. Arsipkan saja? Kategori tidak muncul lagi di pilihan, tetapi riwayatnya tetap utuh.`)) return
      const r = await supabase.from('categories').update({ is_active: false }).eq('id', c.id)
      if (r.error) return toast('Gagal mengarsipkan: ' + r.error.message)
      toast('Kategori diarsipkan')
    } else {
      return alert(`"${c.name}" dipakai di ${n} catatan, jadi tidak bisa dihapus permanen.`)
    }
    refresh()
  }

  async function restore(c: Category) {
    const r = await supabase.from('categories').update({ is_active: true }).eq('id', c.id)
    if (r.error) return toast('Gagal mengaktifkan: ' + r.error.message)
    toast('Kategori diaktifkan lagi')
    refresh()
  }

  const row = (c: Category, isArchived: boolean) => (
    <div key={c.id} className="crow">
      <span className="emo" aria-hidden="true">{emoji(c.name, c.icon)}</span>
      <div className="crow-text">
        <span>{c.name}</span>
        {kind === 'expense' && c.grp && <small className="muted">{GRP_LABEL[c.grp]}</small>}
      </div>
      {isArchived ? (
        <button className="ghost small-btn" onClick={() => restore(c)}>Aktifkan</button>
      ) : (
        <button className="icon-btn" aria-label={`Ubah ${c.name}`} title="Ubah" onClick={() => startEdit(c)}><Icon name="edit" /></button>
      )}
      <button className="icon-btn danger" aria-label={`Hapus ${c.name}`} title="Hapus" onClick={() => remove(c)}><Icon name="trash" /></button>
    </div>
  )

  return (
    <>
      <header className="head"><h1>Profil</h1></header>

      <section className="sheet">
        <div className="sheet-head">
          <div><h3>Akun</h3><span className="muted small">{email || 'Memuat…'}</span></div>
          <button className="ghost small-btn" onClick={() => confirm('Keluar dari akun ini?') && supabase.auth.signOut()}>Keluar</button>
        </div>
      </section>

      <h2 className="section">Kategori</h2>
      <div className="seg two" role="tablist" aria-label="Jenis kategori">
        <button role="tab" aria-selected={kind === 'expense'} className={kind === 'expense' ? 'on' : ''} onClick={() => { setKind('expense'); setForm(null) }}>Pengeluaran</button>
        <button role="tab" aria-selected={kind === 'income'} className={kind === 'income' ? 'on' : ''} onClick={() => { setKind('income'); setForm(null) }}>Pemasukan</button>
      </div>

      <Loading q={cats} />

      {form ? (
        <form className="sheet catform" onSubmit={save}>
          <h3>{form.id ? 'Ubah kategori' : `Kategori ${kind === 'expense' ? 'pengeluaran' : 'pemasukan'} baru`}</h3>
          <label className="field">Nama
            <input autoFocus value={form.name} maxLength={40} placeholder="Contoh: Kopi" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          {kind === 'expense' && (
            <fieldset>
              <legend>Kelompok anggaran</legend>
              <div className="chips">
                {(['need', 'want', 'saving'] as Grp[]).map((g) => (
                  <button key={g} type="button" className={'chip' + (form.grp === g ? ' on' : '')} aria-pressed={form.grp === g} onClick={() => setForm({ ...form, grp: g })}>{GRP_LABEL[g]}</button>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend>Ikon</legend>
            <div className="emoji-grid">
              {ICONS.map((i) => (
                <button key={i} type="button" className={form.icon === i ? 'on' : ''} aria-label={`Ikon ${i}`} aria-pressed={form.icon === i} onClick={() => setForm({ ...form, icon: i })}>{i}</button>
              ))}
            </div>
          </fieldset>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="savebar">
            <button type="button" className="ghost" onClick={() => setForm(null)}>Batal</button>
            <button className="primary" disabled={busy}>{busy ? 'Menyimpan…' : form.id ? 'Simpan perubahan' : 'Tambah kategori'}</button>
          </div>
        </form>
      ) : (
        <button className="ghost addcat" onClick={startAdd}><Icon name="plus" />Tambah kategori</button>
      )}

      {!cats.isLoading && (
        <section className="sheet">
          {active.length === 0 ? <p className="empty">Belum ada kategori. Ketuk Tambah kategori.</p> : active.map((c) => row(c, false))}
        </section>
      )}

      {archived.length > 0 && (
        <details className="sheet">
          <summary className="arch-sum">Diarsipkan ({archived.length})</summary>
          {archived.map((c) => row(c, true))}
        </details>
      )}
    </>
  )
}
