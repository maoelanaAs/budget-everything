import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { setHidden, monthLabel, monthLabelShort, monthStart, shiftMonth } from './format'

/* ---------- ikon kategori ---------- */
const EMOJI: Record<string, string> = {
  'Makan & Minum': '🍜', Kost: '🏠', Bensin: '⛽', Laundry: '🧺', Transum: '🚆', Kuota: '📶',
  'Kebutuhan Lainnya': '🧴', 'Jajan Sendiri': '🧋', 'Jajan Bareng': '🥳', Langganan: '🔁',
  'Keinginan Lainnya': '🎁', Investasi: '📈', Nabung: '🐷', Upskilling: '🎓',
  Gaji: '💼', Bonus: '🎉', 'Part Time': '⏱️', 'Orang Tua': '👪', Tabungan: '🐷',
}
export const emoji = (name: string, icon?: string | null) => icon || EMOJI[name] || '🏷️'

/* ---------- ikon navigasi ---------- */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
export function Icon({ name }: { name: 'home' | 'list' | 'plus' | 'target' | 'logout' | 'search' | 'chevron' | 'edit' | 'trash' | 'user' | 'close' | 'wallet' | 'settings' | 'back' | 'tag' | 'chart' | 'eye' | 'eyeoff' }) {
  const d: Record<string, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    plus: <path d="M12 5v14M5 12h14" />,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12h.01" /></>,
    logout: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" /><path d="M16 13.5h.01" /></>,
    settings: <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" />,
    back: <path d="m15 6-6 6 6 6" />,
    tag: <><path d="M3.5 12.5V4.5h8l9 9-8 8-9-9Z" /><path d="M8 8.5h.01" /></>,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    eye: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
    eyeoff: <><path d="M3 3l18 18M10.6 5.6A10 10 0 0 1 12 5.5C18.4 5.5 22 12 22 12a17 17 0 0 1-3.2 3.9M6.5 7.2A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1.5 0 2.8-.3 4-.8" /><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />,
  }
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" {...P}>{d[name]}</svg>
}

/* ---------- bulan: panah untuk geser, ketuk nama bulan untuk lompat bulan/tahun ---------- */
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('id-ID', { month: 'short' }))
export function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [vy, vm] = value.split('-').map(Number)
  const [year, setYear] = useState(vy)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) setYear(vy) }, [open, vy])
  useEffect(() => {
    if (!open) return
    const away = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away); document.removeEventListener('keydown', esc) }
  }, [open])

  const pick = (y: number, m: number) => { onChange(`${y}-${String(m).padStart(2, '0')}-01`); setOpen(false) }
  const thisMonth = monthStart(new Date())

  return (
    <div className="mp" ref={ref}>
      <div className="monthpicker">
        <button aria-label="Bulan sebelumnya" onClick={() => onChange(shiftMonth(value, -1))}>‹</button>
        <button className="mp-label" aria-label={`Pilih bulan, sekarang ${monthLabel(value)}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="long">{monthLabel(value)}</span><span className="short" aria-hidden="true">{monthLabelShort(value)}</span><i aria-hidden="true">▾</i>
        </button>
        <button aria-label="Bulan berikutnya" onClick={() => onChange(shiftMonth(value, 1))}>›</button>
      </div>
      {open && (
        <div className="mp-panel" role="dialog" aria-label="Pilih bulan dan tahun">
          <div className="mp-year">
            <button aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)}>‹</button>
            <b>{year}</b>
            <button aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)}>›</button>
          </div>
          <div className="mp-grid">
            {MONTHS.map((name, i) => (
              <button key={name} className={year === vy && i + 1 === vm ? 'on' : ''} onClick={() => pick(year, i + 1)}>{name}</button>
            ))}
          </div>
          <button className="mp-now" onClick={() => { onChange(thisMonth); setOpen(false) }}>Bulan ini</button>
        </div>
      )}
    </div>
  )
}

/* ---------- bar progres ---------- */
export function Bar({ ratio, tone }: { ratio: number; tone?: 'ink' }) {
  const r = Math.max(0, ratio)
  const cls = tone === 'ink' ? 'fill ink' : r > 1 ? 'fill over' : r > 0.85 ? 'fill warn' : 'fill'
  return <div className="bar" role="presentation"><div className={cls} style={{ width: `${Math.min(100, r * 100)}%` }} /></div>
}

/* ---------- mode privasi ---------- */
const PRIV = 'budgeting:privacy'
export const PrivacyCtx = createContext<{ hidden: boolean; toggle: () => void }>({ hidden: false, toggle: () => {} })
export const usePrivacy = () => useContext(PrivacyCtx)
/** Dipakai di App: state di sini membuat seluruh halaman digambar ulang saat tombol mata ditekan. */
export function usePrivacyState() {
  const [hidden, set] = useState(() => { try { return localStorage.getItem(PRIV) === '1' } catch { return false } })
  setHidden(hidden)
  const toggle = () => set((h) => { try { localStorage.setItem(PRIV, h ? '0' : '1') } catch { /* abaikan */ } return !h })
  return { hidden, toggle }
}
export function PrivacyButton() {
  const { hidden, toggle } = usePrivacy()
  return (
    <button type="button" className="icon-btn eye" aria-pressed={hidden} aria-label={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'} title={hidden ? 'Tampilkan nominal' : 'Sembunyikan nominal'} onClick={toggle}>
      <Icon name={hidden ? 'eyeoff' : 'eye'} />
    </button>
  )
}

/* ---------- judul halaman dengan tombol kembali ---------- */
export function BackHead({ to, label, title, children }: { to: string; label: string; title: string; children?: ReactNode }) {
  return (
    <>
      <Link className="back" to={to}><Icon name="back" />{label}</Link>
      <header className="head"><h1>{title}</h1>{children}</header>
    </>
  )
}

/* ---------- sakelar ---------- */
export function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="switchrow" onClick={() => onChange(!on)}>
      <span className="switchtext"><b>{label}</b>{hint && <small className="muted">{hint}</small>}</span>
      <span className={'switch' + (on ? ' on' : '')} aria-hidden="true"><i /></span>
    </button>
  )
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
