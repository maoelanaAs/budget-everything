import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { monthLabel, shiftMonth } from './format'

/* ---------- ikon kategori ---------- */
const EMOJI: Record<string, string> = {
  'Makan & Minum': '🍜', Kost: '🏠', Bensin: '⛽', Laundry: '🧺', Transum: '🚆', Kuota: '📶',
  'Kebutuhan Lainnya': '🧴', 'Jajan Sendiri': '🧋', 'Jajan Bareng': '🥳', Langganan: '🔁',
  'Keinginan Lainnya': '🎁', Investasi: '📈', Nabung: '🐷', Upskilling: '🎓',
  Gaji: '💼', Bonus: '🎉', 'Part Time': '⏱️', 'Orang Tua': '👪', Tabungan: '🐷',
}
export const emoji = (name: string) => EMOJI[name] ?? '🏷️'

/* ---------- ikon navigasi ---------- */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
export function Icon({ name }: { name: 'home' | 'list' | 'plus' | 'target' | 'logout' | 'search' | 'chevron' | 'edit' | 'trash' }) {
  const d: Record<string, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12h.01" /></>,
    logout: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />,
  }
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...P}>{d[name]}</svg>
}

/* ---------- bulan ---------- */
export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="monthpicker">
      <button aria-label="Bulan sebelumnya" onClick={() => onChange(shiftMonth(value, -1))}>‹</button>
      <span>{monthLabel(value)}</span>
      <button aria-label="Bulan berikutnya" onClick={() => onChange(shiftMonth(value, 1))}>›</button>
    </div>
  )
}

/* ---------- bar progres ---------- */
export function Bar({ ratio, tone }: { ratio: number; tone?: 'ink' }) {
  const r = Math.max(0, ratio)
  const cls = tone === 'ink' ? 'fill ink' : r > 1 ? 'fill over' : r > 0.85 ? 'fill warn' : 'fill'
  return <div className="bar" role="presentation"><div className={cls} style={{ width: `${Math.min(100, r * 100)}%` }} /></div>
}

export function Loading({ q }: { q: { isLoading: boolean; error: unknown } }) {
  if (q.error) return <p className="error">Gagal memuat: {(q.error as Error).message}. Periksa koneksi lalu muat ulang halaman.</p>
  if (q.isLoading) return <p className="muted">Memuat…</p>
  return null
}

/* ---------- input nominal dengan pemisah ribuan ---------- */
export const formatMoneyInput = (raw: string, allowNegative = false) => {
  const neg = allowNegative && raw.trim().startsWith('-')
  const clean = raw.replace(/[^\d,]/g, '')
  const [int = '', ...rest] = clean.split(',')
  const grouped = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (neg ? '-' : '') + grouped + (rest.length ? ',' + rest.join('').slice(0, 2) : '')
}
export const parseMoney = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'))

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((m: string) => {
    setMsg(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMsg(''), 2800)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={'toast' + (msg ? ' show' : '')} role="status" aria-live="polite">{msg}</div>
    </ToastCtx.Provider>
  )
}
