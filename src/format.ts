const idr = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
// spasi tak terpecah (U+00A0) supaya "Rp" dan nominal tidak terpisah di baris berbeda
let hidden = false
/** Mode privasi: semua nominal rupiah ditutup. Diatur dari App (lihat usePrivacyState). */
export const setHidden = (v: boolean) => { hidden = v }
export const rp = (n: number) => (hidden ? 'Rp\u00A0•••••' : (n < 0 ? '-' : '') + 'Rp\u00A0' + idr.format(Math.abs(n)))
/** Nominal singkat untuk label grafik: 5,2jt / 350rb. */
export const compact = (n: number) => {
  const a = Math.abs(n)
  if (hidden) return '•••'
  if (a >= 1e6) return (a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt'
  if (a >= 1e3) return Math.round(a / 1e3) + 'rb'
  return String(Math.round(a))
}
export const daysInMonth = (start: string) => Number(monthEnd(start).slice(8, 10))
export const num = (n: number) => idr.format(n)

export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => iso(new Date())

/** Awal periode (tanggal 1) dari string tanggal ISO / Date. */
export const monthStart = (d: Date) => iso(new Date(d.getFullYear(), d.getMonth(), 1))
export const monthEnd = (start: string) => {
  const [y, m] = start.split('-').map(Number)
  return iso(new Date(y, m, 0))
}
export const shiftMonth = (start: string, by: number) => {
  const [y, m] = start.split('-').map(Number)
  return iso(new Date(y, m - 1 + by, 1))
}
export const monthLabel = (start: string) => {
  const [y, m] = start.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}
export const monthLabelShort = (start: string) => {
  const [y, m] = start.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
}
export const dayLabel = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}
/** Sisa hari termasuk hari ini; sama dengan DAYS(selesai, TODAY())+1 di Excel. 0 jika periode sudah lewat. */
export const daysLeft = (start: string) => {
  const end = monthEnd(start)
  const t = today()
  if (t > end) return 0
  const from = t < start ? start : t
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()
  return Math.round(ms / 86400000) + 1
}
