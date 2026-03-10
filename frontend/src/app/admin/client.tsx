'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

async function req(token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

// ─── Types ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'claims' | 'providers' | 'products' | 'users' | 'policies' | 'analytics'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'overview',  icon: '📊', label: 'Overview'  },
  { id: 'claims',    icon: '🛡️', label: 'Claims'    },
  { id: 'providers', icon: '🏦', label: 'Providers' },
  { id: 'products',  icon: '📦', label: 'Products'  },
  { id: 'users',     icon: '👥', label: 'Users'     },
  { id: 'policies',  icon: '📋', label: 'Policies'  },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
]

// ─── Shared UI ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, [string, string]> = {
  active:       ['rgba(46,201,126,.15)',  '#2EC97E'],
  approved:     ['rgba(46,201,126,.15)',  '#2EC97E'],
  paid:         ['rgba(46,201,126,.15)',  '#2EC97E'],
  successful:   ['rgba(46,201,126,.15)',  '#2EC97E'],
  pending:      ['rgba(244,166,35,.15)',  '#F4A623'],
  submitted:    ['rgba(244,166,35,.15)',  '#F4A623'],
  under_review: ['rgba(124,107,255,.15)', '#7C6BFF'],
  processing:   ['rgba(124,107,255,.15)', '#7C6BFF'],
  rejected:     ['rgba(232,69,69,.15)',   '#E84545'],
  expired:      ['rgba(232,69,69,.15)',   '#E84545'],
  cancelled:    ['rgba(232,69,69,.15)',   '#E84545'],
  inactive:     ['rgba(232,69,69,.15)',   '#E84545'],
  suspended:    ['rgba(232,69,69,.15)',   '#E84545'],
  lapsed:       ['rgba(232,69,69,.15)',   '#E84545'],
}

function Badge({ status }: { status: string }) {
  const [bg, color] = STATUS_STYLES[status?.toLowerCase()] || ['rgba(132,146,180,.15)', '#8492B4']
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
      style={{ background: bg, color, border: `1px solid ${color}40` }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function Spin() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
}

function Card({ children, className = '', onClick }: any) {
  return (
    <div className={`rounded-2xl p-4 md:p-5 ${className} ${onClick ? 'cursor-pointer transition-all hover:brightness-110' : ''}`}
      style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}
      onClick={onClick}>
      {children}
    </div>
  )
}

function Modal({ title, onClose, wide = false, children }: any) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-2xl p-5 md:p-6 max-h-[90vh] overflow-y-auto`}
        style={{ background: '#0D1B3E', border: '1px solid rgba(255,255,255,.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-syne font-bold text-base md:text-lg pr-4">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-white/10 shrink-0 transition-all">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false, textarea = false, rows = 3, hint = '' }: any) {
  const base = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
  const sty = { background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)' }
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {textarea
        ? <textarea className={base} style={{ ...sty, resize: 'vertical' }} rows={rows}
            value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} />
        : <input className={base} style={sty} type={type}
            value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder} />
      }
      {hint && <p className="text-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Select({ label, value, onChange, options, required = false }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(13,27,62,.95)', border: '1px solid rgba(255,255,255,.12)' }}
        value={value} onChange={(e: any) => onChange(e.target.value)}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function Filters({ options, value, onChange }: any) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o: string) => (
        <button key={o} onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${value === o ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}
          style={value !== o ? { background: 'rgba(255,255,255,.06)' } : {}}>
          {o.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  )
}

function Empty({ icon, title, sub }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-semibold text-sm mb-1">{title}</div>
      <div className="text-muted text-xs">{sub}</div>
    </div>
  )
}

function ActionBtn({ label, color, onClick, disabled = false }: any) {
  const schemes: Record<string, [string, string, string]> = {
    green:  ['rgba(46,201,126,.15)',  '#2EC97E', 'rgba(46,201,126,.3)'],
    red:    ['rgba(232,69,69,.15)',   '#E84545', 'rgba(232,69,69,.3)'],
    purple: ['rgba(124,107,255,.15)', '#7C6BFF', 'rgba(124,107,255,.3)'],
    ghost:  ['rgba(255,255,255,.07)', '#8492B4', 'transparent'],
    yellow: ['rgba(244,166,35,.15)',  '#F4A623', 'rgba(244,166,35,.3)'],
  }
  const [bg, text, border] = schemes[color] || schemes.ghost
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}>
      {disabled && <Spin />}{label}
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [token, setToken] = useState('')
  const [userName, setUserName] = useState('')
  const [store, setStore] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [toastQ, setToastQ] = useState<{ id: number; msg: string; ok: boolean }[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    const t = localStorage.getItem('access_token') || ''
    if (!t) { router.push('/auth'); return }
    setToken(t)
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}')
      setUserName(u.name || u.email || 'Admin')
    } catch {}
  }, [])

  const toast = useCallback((msg: string, ok = true) => {
    const id = ++toastId.current
    setToastQ(q => [...q, { id, msg, ok }])
    setTimeout(() => setToastQ(q => q.filter(t => t.id !== id)), 3500)
  }, [])

  const load = useCallback(async (key: string, path: string, force = false) => {
    if (store[key] && !force) return
    setLoading(l => ({ ...l, [key]: true }))
    try {
      const data = await req(token, 'GET', path)
      setStore(s => ({ ...s, [key]: data.data ?? data ?? [] }))
    } catch (e: any) { toast(e.message, false) }
    setLoading(l => ({ ...l, [key]: false }))
  }, [token, store, toast])

  const reload = useCallback((key: string, path: string) => load(key, path, true), [load])

  useEffect(() => {
    if (!token) return
    if (tab === 'overview')  { load('stats', '/admin/stats') }
    if (tab === 'claims')    { load('claims', '/admin/claims') }
    if (tab === 'providers') { load('providers', '/admin/providers') }
    if (tab === 'products')  { load('products', '/admin/products'); load('providers', '/admin/providers') }
    if (tab === 'users')     { load('users', '/admin/users') }
    if (tab === 'policies')  { load('policies', '/admin/policies') }
    if (tab === 'analytics') { load('analytics', '/admin/analytics/revenue'); load('stats', '/admin/stats') }
  }, [tab, token])

  const shared = { store, token, loading, toast, reload }
  const openClaims = store.stats?.openClaims || 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080D1A' }}>

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-40"
        style={{ background: 'rgba(8,13,26,.97)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="font-syne font-black text-lg">Cover<span className="text-accent">AI</span></Link>
          <span className="px-2 py-0.5 rounded text-xs font-black tracking-wider"
            style={{ background: 'rgba(232,69,69,.2)', color: '#E84545', border: '1px solid rgba(232,69,69,.35)' }}>ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted text-xs hidden md:block">{userName}</span>
          <Link href="/dashboard" className="hidden md:block text-xs text-muted hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">← Dashboard</Link>
          <button className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,.06)' }} onClick={() => setMenuOpen(o => !o)}>
            {[0,1,2].map(i => <span key={i} className="w-4 h-0.5 bg-white rounded" />)}
          </button>
        </div>
      </header>

      {/* Toast stack */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toastQ.map(t => (
          <div key={t.id} className="px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl whitespace-nowrap"
            style={{ background: t.ok ? 'rgba(46,201,126,.2)' : 'rgba(232,69,69,.2)', border: `1px solid ${t.ok ? 'rgba(46,201,126,.4)' : 'rgba(232,69,69,.4)'}`, color: t.ok ? '#2EC97E' : '#E84545', backdropFilter: 'blur(8px)' }}>
            {t.ok ? '✓' : '✕'} {t.msg}
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col py-5 px-3 sticky top-12 h-[calc(100vh-48px)] overflow-y-auto"
          style={{ background: 'rgba(13,27,62,.45)', borderRight: '1px solid rgba(255,255,255,.06)' }}>
          <p className="text-muted text-xs uppercase tracking-widest font-semibold px-3 mb-3">Management</p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left mb-0.5 transition-all ${tab === t.id ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
              style={tab === t.id ? { background: 'rgba(26,58,143,.5)' } : {}}>
              <span>{t.icon}</span>{t.label}
              {t.id === 'claims' && openClaims > 0 && (
                <span className="ml-auto text-xs font-black px-1.5 py-0 rounded-full" style={{ background: '#E84545', color: '#fff' }}>{openClaims}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Mobile slide menu */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 top-12" style={{ background: 'rgba(0,0,0,.7)' }} onClick={() => setMenuOpen(false)}>
            <div className="px-3 py-3" style={{ background: '#0A1228' }} onClick={e => e.stopPropagation()}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 ${tab === t.id ? 'text-white' : 'text-muted'}`}
                  style={tab === t.id ? { background: 'rgba(26,58,143,.4)' } : {}}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
          {tab === 'overview'  && <OverviewTab  {...shared} setTab={setTab} />}
          {tab === 'claims'    && <ClaimsTab    {...shared} />}
          {tab === 'providers' && <ProvidersTab {...shared} />}
          {tab === 'products'  && <ProductsTab  {...shared} />}
          {tab === 'users'     && <UsersTab     {...shared} />}
          {tab === 'policies'  && <PoliciesTab  {...shared} />}
          {tab === 'analytics' && <AnalyticsTab {...shared} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: 'rgba(8,13,26,.98)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all ${tab === t.id ? 'text-accent' : 'text-muted'}`}>
            <span className="text-lg">{t.icon}</span>
            <span className="text-[9px] font-medium">{t.label}</span>
            {t.id === 'claims' && openClaims > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center"
                style={{ background: '#E84545', color: '#fff' }}>{openClaims}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="md:hidden h-16" />
    </div>
  )
}

// ─── OVERVIEW ──────────────────────────────────────────────────────────────
function OverviewTab({ store, loading, setTab }: any) {
  const s = store.stats || {}
  const busy = loading.stats

  const kpis = [
    { label: 'Total Users',     value: s.totalUsers,     sub: 'registered accounts', icon: '👥', color: '#00C2A8', tab: 'users'     },
    { label: 'Active Policies', value: s.activePolicies, sub: `of ${s.totalPolicies ?? '?'} total`, icon: '📋', color: '#F4A623', tab: 'policies'  },
    { label: 'Open Claims',     value: s.openClaims,     sub: 'awaiting review',     icon: '⚠️', color: '#E84545', tab: 'claims'    },
    { label: 'Total Revenue',   value: s.totalRevenue != null ? `₦${Number(s.totalRevenue).toLocaleString()}` : null, sub: 'from payments', icon: '💰', color: '#2EC97E', tab: 'analytics' },
    { label: 'Providers',       value: s.totalProviders, sub: 'insurance partners', icon: '🏦', color: '#7C6BFF', tab: 'providers' },
    { label: 'Products',        value: s.totalProducts,  sub: 'coverage types',     icon: '📦', color: '#00C2A8', tab: 'products'  },
  ]

  return (
    <div>
      <h1 className="font-syne font-black text-2xl mb-1">Platform Overview</h1>
      <p className="text-muted text-sm mb-6">Real-time metrics across your insurance platform</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {kpis.map(k => (
          <Card key={k.label} onClick={() => setTab(k.tab)} className="hover:-translate-y-0.5">
            <div className="flex justify-between mb-3">
              <span className="text-2xl">{k.icon}</span>
              <span className="text-muted text-xs opacity-50">→</span>
            </div>
            {busy
              ? <div className="h-7 w-20 rounded-lg animate-pulse mb-1" style={{ background: 'rgba(255,255,255,.08)' }} />
              : <div className="font-syne font-black text-2xl mb-0.5" style={{ color: k.color }}>{k.value ?? '—'}</div>
            }
            <div className="text-muted text-xs uppercase tracking-wider">{k.label}</div>
            <div className="text-muted text-xs mt-0.5 opacity-60">{k.sub}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-4">
        <p className="text-muted text-xs uppercase tracking-widest font-semibold mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Review Claims',  icon: '🛡️', tab: 'claims',    note: `${s.openClaims || 0} open`, accent: '#E84545' },
            { label: 'Add Provider',   icon: '🏦', tab: 'providers', note: 'Onboard insurer', accent: '#F4A623' },
            { label: 'Add Product',    icon: '📦', tab: 'products',  note: 'New coverage',   accent: '#00C2A8' },
            { label: 'Manage Users',   icon: '👥', tab: 'users',     note: `${s.totalUsers || 0} total`, accent: '#7C6BFF' },
          ].map(a => (
            <button key={a.label} onClick={() => setTab(a.tab)}
              className="p-4 rounded-xl text-left hover:-translate-y-0.5 transition-all"
              style={{ background: 'rgba(26,58,143,.25)', border: '1px solid rgba(26,58,143,.4)' }}>
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
              <div className="text-xs mt-0.5" style={{ color: a.accent }}>{a.note}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <p className="text-muted text-xs uppercase tracking-widest font-semibold mb-4">Policies</p>
          {[
            ['Active',  s.activePolicies, '#2EC97E'],
            ['Pending', (s.totalPolicies ?? 0) - (s.activePolicies ?? 0), '#F4A623'],
            ['Total',   s.totalPolicies,  '#00C2A8'],
          ].map(([l, v, c]: any) => (
            <div key={l} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
              <span className="text-muted text-sm">{l}</span>
              <span className="font-syne font-bold text-sm" style={{ color: c }}>{busy ? '—' : (v ?? '—')}</span>
            </div>
          ))}
        </Card>
        <Card>
          <p className="text-muted text-xs uppercase tracking-widest font-semibold mb-4">Claims</p>
          {[
            ['Submitted',   s.openClaims,  '#F4A623'],
            ['Total',       s.totalClaims, '#7C6BFF'],
          ].map(([l, v, c]: any) => (
            <div key={l} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
              <span className="text-muted text-sm">{l}</span>
              <span className="font-syne font-bold text-sm" style={{ color: c }}>{busy ? '—' : (v ?? '—')}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── CLAIMS ────────────────────────────────────────────────────────────────
function ClaimsTab({ store, token, loading, toast, reload }: any) {
  const claims: any[] = store.claims || []
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')

  const visible = claims
    .filter(c => filter === 'all' || c.status === filter)
    .filter(c => {
      if (!search) return true
      const q = search.toLowerCase()
      return c.claimNumber?.toLowerCase().includes(q) ||
             c.user?.name?.toLowerCase().includes(q) ||
             c.user?.email?.toLowerCase().includes(q)
    })

  const counts = ['submitted', 'under_review', 'approved', 'rejected', 'paid']
    .map(s => [s, claims.filter(c => c.status === s).length])

  async function act(id: string, action: string) {
    setBusy(action)
    try {
      await req(token, 'PATCH', `/admin/claims/${id}/${action}`, { note })
      toast(`Claim ${action === 'review' ? 'moved to under review' : action + 'd'}`)
      setSelected(null); setNote('')
      reload('claims', '/admin/claims')
    } catch (e: any) { toast(e.message, false) }
    setBusy('')
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="font-syne font-black text-2xl">Claims Management</h1>
          <p className="text-muted text-sm mt-0.5">Review, approve or reject customer claims</p>
        </div>
        <button onClick={() => reload('claims', '/admin/claims')}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white transition-all flex items-center gap-1.5"
          style={{ background: 'rgba(255,255,255,.06)' }}>
          {loading.claims ? <Spin /> : '↻'} Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
          placeholder="Search claim number, customer name or email…" />
        <Filters options={['all', 'submitted', 'under_review', 'approved', 'rejected', 'paid']} value={filter} onChange={setFilter} />
      </div>

      <div className="flex gap-2 flex-wrap mb-5 text-xs">
        {counts.map(([s, n]) => (
          <span key={s as string} className="px-2 py-1 rounded-lg capitalize"
            style={{ background: 'rgba(255,255,255,.05)', color: '#8492B4' }}>
            {(s as string).replace('_', ' ')}: <strong className="text-white">{n as number}</strong>
          </span>
        ))}
      </div>

      {loading.claims && !claims.length ? <div className="flex justify-center py-20"><Spin /></div>
        : !visible.length ? <Empty icon="🛡️" title="No claims found" sub="Try different filters" />
        : (
          <div className="space-y-3">
            {visible.map((c: any) => (
              <Card key={c.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-syne font-bold">{c.claimNumber}</span>
                      <Badge status={c.status} />
                    </div>
                    <p className="text-muted text-sm mb-2 line-clamp-1">{c.description}</p>
                    <div className="flex gap-4 flex-wrap text-xs text-muted">
                      <span>💰 <span className="text-white font-semibold">₦{Number(c.claimAmount || 0).toLocaleString()}</span></span>
                      <span>👤 <span className="text-white">{c.user?.name || c.user?.email || '—'}</span></span>
                      <span>📅 {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString('en-NG') : '—'}</span>
                      {c.incidentLocation && <span>📍 {c.incidentLocation}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start flex-wrap shrink-0">
                    <ActionBtn label="Details" color="ghost" onClick={() => { setSelected(c); setNote(c.reviewerNotes || '') }} />
                    {c.status === 'submitted' &&
                      <ActionBtn label="Start Review" color="purple" onClick={() => act(c.id, 'review')} disabled={busy === 'review'} />}
                    {(c.status === 'submitted' || c.status === 'under_review') && (<>
                      <ActionBtn label="✓ Approve" color="green" onClick={() => { setSelected(c); setNote('') }} />
                      <ActionBtn label="✕ Reject"  color="red"   onClick={() => { setSelected(c); setNote('') }} />
                    </>)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {selected && (
        <Modal title={`Claim — ${selected.claimNumber}`} wide onClose={() => { setSelected(null); setNote('') }}>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              ['Status',        <Badge status={selected.status} />],
              ['Amount',        <span key="a" className="font-bold text-accent">₦{Number(selected.claimAmount || 0).toLocaleString()}</span>],
              ['Approved Amt',  selected.approvedAmount ? `₦${Number(selected.approvedAmount).toLocaleString()}` : '—'],
              ['Customer',      selected.user?.name || '—'],
              ['Email',         selected.user?.email || '—'],
              ['Incident Date', selected.incidentDate ? new Date(selected.incidentDate).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '—'],
              ['Location',      selected.incidentLocation || '—'],
              ['Policy ID',     selected.policyId ? selected.policyId.slice(0, 8) + '…' : '—'],
              ['Submitted',     selected.submittedAt ? new Date(selected.submittedAt).toLocaleString('en-NG') : '—'],
              ['Reviewed',      selected.reviewedAt  ? new Date(selected.reviewedAt).toLocaleString('en-NG') : 'Not yet'],
            ].map(([l, v]: any) => (
              <div key={l} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                <div className="text-muted text-xs mb-1">{l}</div>
                <div className="text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
            <div className="text-muted text-xs mb-1.5">Description</div>
            <p className="text-sm leading-relaxed">{selected.description}</p>
          </div>

          {selected.evidenceFiles?.length > 0 && (
            <div className="mb-4">
              <div className="text-muted text-xs mb-2">Evidence Files ({selected.evidenceFiles.length})</div>
              <div className="flex gap-2 flex-wrap">
                {selected.evidenceFiles.map((f: string, i: number) => (
                  <a key={i} href={f} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(59,130,246,.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.2)' }}>
                    📎 File {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {(selected.status === 'submitted' || selected.status === 'under_review') && (
            <>
              <Field label="Decision Note (visible to customer)" value={note} onChange={setNote} textarea
                placeholder="Provide context for your decision…" rows={3} />
              <div className="flex gap-3 mt-4">
                <button onClick={() => act(selected.id, 'approve')} disabled={!!busy}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: '#2EC97E', color: '#0A0F1E' }}>
                  {busy === 'approve' && <Spin />} ✓ Approve Claim
                </button>
                <button onClick={() => act(selected.id, 'reject')} disabled={!!busy}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: 'rgba(232,69,69,.2)', color: '#E84545', border: '1px solid rgba(232,69,69,.4)' }}>
                  {busy === 'reject' && <Spin />} ✕ Reject Claim
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

// ─── PROVIDERS ─────────────────────────────────────────────────────────────
function ProvidersTab({ store, token, loading, toast, reload }: any) {
  const providers: any[] = store.providers || []
  const blank = { name: '', email: '', phone: '', address: '', licenseNumber: '', description: '', apiBaseUrl: '', apiKey: '' }
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<any>(null) // null=closed, false=new, obj=edit
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [syncing, setSyncing] = useState<string | null>(null) // provider id being synced
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const visible = providers
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || (p.email || p.contactEmail)?.toLowerCase().includes(search.toLowerCase()))

  function openNew() { setForm(blank); setEditing(false) }
  function openEdit(p: any) {
    setForm({ name: p.name, email: p.email || p.contactEmail || '', phone: p.phone || p.contactPhone || '', address: p.address || '', licenseNumber: p.licenseNumber || p.naicomLicense || '', description: p.description || '', apiBaseUrl: p.apiBaseUrl || '', apiKey: '' })
    setEditing(p)
  }

  async function save() {
    if (!form.name.trim() || !form.email.trim()) { toast('Name and email are required', false); return }
    setSaving(true)
    try {
      if (editing) {
        await req(token, 'PATCH', `/admin/providers/${editing.id}`, form)
        toast(`${form.name} updated`)
      } else {
        await req(token, 'POST', '/admin/providers', form)
        toast(`${form.name} onboarded successfully`)
      }
      setEditing(null)
      reload('providers', '/admin/providers')
    } catch (e: any) { toast(e.message, false) }
    setSaving(false)
  }

  async function toggle(p: any) {
    const action = p.status === 'active' ? 'deactivate' : 'activate'
    try {
      await req(token, 'PATCH', `/admin/providers/${p.id}/${action}`)
      toast(`Provider ${action}d`)
      reload('providers', '/admin/providers')
    } catch (e: any) { toast(e.message, false) }
  }

  async function syncProducts(p: any) {
    setSyncing(p.id)
    try {
      const res = await req(token, 'POST', `/admin/providers/${p.id}/sync`, {})
      toast(`✅ Synced ${res.total} products (${res.created} new, ${res.updated} updated)`)
      reload('providers', '/admin/providers')
      reload('products', '/admin/products')
    } catch (e: any) {
      toast(`Sync failed: ${e.message}`, false)
    }
    setSyncing(null)
  }

  function SyncBadge({ p }: { p: any }) {
    if (!p.hasApiKey) return null
    const s = p.syncStatus
    const configs: Record<string, { color: string, bg: string, label: string }> = {
      success: { color: '#00C2A8', bg: 'rgba(0,194,168,.1)', label: `✓ ${p.syncedProductCount || 0} products` },
      error:   { color: '#F56565', bg: 'rgba(245,101,101,.1)', label: '✗ Sync failed' },
      syncing: { color: '#F4A623', bg: 'rgba(244,166,35,.1)', label: '⟳ Syncing…' },
      idle:    { color: '#94A3B8', bg: 'rgba(148,163,184,.1)', label: 'API ready' },
    }
    const cfg = configs[s] || configs.idle
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: cfg.color, background: cfg.bg }}>
        {cfg.label}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-syne font-black text-2xl">Insurance Providers</h1>
          <p className="text-muted text-sm mt-0.5">Onboard and manage insurance companies</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:brightness-110 transition-all">+ Add Provider</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
          placeholder="Search providers…" />
        <Filters options={['all', 'active', 'inactive']} value={filter} onChange={setFilter} />
      </div>

      {loading.providers && !providers.length ? <div className="flex justify-center py-20"><Spin /></div>
        : !visible.length ? <Empty icon="🏦" title="No providers yet" sub="Add your first insurance company" />
        : (
          <div className="space-y-3">
            {visible.map((p: any) => (
              <Card key={p.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-syne font-bold">{p.name}</span>
                      <Badge status={p.status || 'active'} />
                      <SyncBadge p={p} />
                    </div>
                    <div className="text-xs text-muted space-y-1">
                      <div>📧 {p.email || p.contactEmail || '—'}</div>
                      {(p.phone || p.contactPhone) && <div>📞 {p.phone || p.contactPhone}</div>}
                      {(p.licenseNumber || p.naicomLicense) && <div>🪪 {p.licenseNumber || p.naicomLicense}</div>}
                      {p.address && <div>📍 {p.address}</div>}
                      {p.apiBaseUrl && <div>🔗 <span className="font-mono opacity-70">{p.apiBaseUrl}</span></div>}
                      {p.lastSyncedAt && <div className="opacity-60">Last sync: {new Date(p.lastSyncedAt).toLocaleString()}</div>}
                      {p.description && <div className="mt-1 opacity-70 line-clamp-2">{p.description}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start shrink-0 flex-wrap justify-end">
                    {p.hasApiKey && (
                      <ActionBtn
                        label={syncing === p.id ? '⟳ Syncing…' : '⟳ Sync Products'}
                        color="ghost"
                        onClick={() => syncProducts(p)}
                        disabled={syncing === p.id}
                      />
                    )}
                    <ActionBtn label="Edit" color="ghost" onClick={() => openEdit(p)} />
                    <ActionBtn
                      label={p.status === 'active' ? 'Deactivate' : 'Activate'}
                      color={p.status === 'active' ? 'red' : 'green'}
                      onClick={() => toggle(p)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {editing !== null && (
        <Modal title={editing ? `Edit — ${editing.name}` : 'Onboard Insurance Provider'} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label="Company Name" value={form.name} onChange={f('name')} required placeholder="e.g. Leadway Assurance" />
            <Field label="Contact Email" value={form.email} onChange={f('email')} required type="email" placeholder="partner@insurer.com" />
            <Field label="Phone" value={form.phone} onChange={f('phone')} placeholder="+234 800 000 0000" />
            <Field label="NAICOM License" value={form.licenseNumber} onChange={f('licenseNumber')} placeholder="NAICOM/INS/2024/001" />
            <Field label="Head Office Address" value={form.address} onChange={f('address')} placeholder="123 Marina Street, Lagos" />
            <Field label="Description" value={form.description} onChange={f('description')} textarea placeholder="Brief overview of this company's specialisation…" />

            {/* API Integration section */}
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.08)' }} />
                <span className="text-xs text-muted font-semibold uppercase tracking-wider px-2">API Integration</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,.08)' }} />
              </div>
              <p className="text-xs text-muted mb-3 opacity-70">Optional — if this provider has an API, CoverAI can automatically pull their products.</p>
              <div className="space-y-3">
                <Field
                  label="API Base URL"
                  value={form.apiBaseUrl}
                  onChange={f('apiBaseUrl')}
                  placeholder="https://api.leadway.com/v1"
                  hint="Products will be fetched from {baseUrl}/products"
                />
                <Field
                  label={editing && editing.hasApiKey ? 'API Key (leave blank to keep existing)' : 'API Key'}
                  value={form.apiKey}
                  onChange={f('apiKey')}
                  type="password"
                  placeholder={editing && editing.hasApiKey ? '••••••••••••••••' : 'Enter provider API key'}
                  hint="Stored securely. Used in Authorization: Bearer header."
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl text-sm text-muted font-semibold" style={{ background: 'rgba(255,255,255,.05)' }}>Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              style={{ background: '#F4A623', color: '#0A0F1E' }}>
              {saving && <Spin />}{editing ? 'Save Changes' : 'Onboard Provider'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── PRODUCTS ──────────────────────────────────────────────────────────────
const PRODUCT_TYPES = ['business', 'motor', 'life', 'health', 'property', 'liability', 'marine', 'travel', 'cyber', 'agriculture']

function ProductsTab({ store, token, loading, toast, reload }: any) {
  const products: any[] = store.products || []
  const providers: any[] = store.providers || []
  const blank = { name: '', description: '', productType: 'business', minPremium: '', maxPremium: '', providerId: '', coverageDetails: '', commissionRate: '10', durationMonths: '12' }
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const visible = products
    .filter(p => filter === 'all' || (p.productType || p.category) === filter || p.status === filter)
    .filter(p => !search || (p.name || p.productName || '').toLowerCase().includes(search.toLowerCase()))

  function openNew() { setForm(blank); setEditing(false) }
  function openEdit(p: any) {
    setForm({
      name: p.name || p.productName || '',
      description: p.description || '',
      productType: p.productType || p.category || 'business',
      minPremium: String(p.minPremium || p.premiumMin || ''),
      maxPremium: String(p.maxPremium || p.premiumMax || ''),
      providerId: p.providerId || '',
      coverageDetails: typeof p.coverageDetails === 'object' ? JSON.stringify(p.coverageDetails, null, 2) : (p.coverageDetails || ''),
      commissionRate: String(p.commissionRate != null ? (Number(p.commissionRate) * 100).toFixed(0) : '10'),
      durationMonths: String(p.durationMonths || '12'),
    })
    setEditing(p)
  }

  async function save() {
    if (!form.name.trim() || !form.providerId) { toast('Name and provider are required', false); return }
    setSaving(true)
    try {
      const body = {
        ...form,
        minPremium: form.minPremium ? Number(form.minPremium) : undefined,
        maxPremium: form.maxPremium ? Number(form.maxPremium) : undefined,
        commissionRate: Number(form.commissionRate) / 100,
        durationMonths: Number(form.durationMonths),
      }
      if (editing) {
        await req(token, 'PATCH', `/admin/products/${editing.id}`, body)
        toast('Product updated')
      } else {
        await req(token, 'POST', '/admin/products', body)
        toast(`"${form.name}" created`)
      }
      setEditing(null)
      reload('products', '/admin/products')
    } catch (e: any) { toast(e.message, false) }
    setSaving(false)
  }

  async function toggle(p: any) {
    const action = p.status === 'active' ? 'deactivate' : 'activate'
    try {
      await req(token, 'PATCH', `/admin/products/${p.id}/${action}`)
      toast(`Product ${action}d`)
      reload('products', '/admin/products')
    } catch (e: any) { toast(e.message, false) }
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="font-syne font-black text-2xl">Insurance Products</h1>
          <p className="text-muted text-sm mt-0.5">Manage coverage types available for customers to purchase</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:brightness-110 transition-all">+ Add Product</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
          placeholder="Search products…" />
        <Filters options={['all', 'active', 'inactive', 'draft', ...PRODUCT_TYPES]} value={filter} onChange={setFilter} />
      </div>

      {loading.products && !products.length ? <div className="flex justify-center py-20"><Spin /></div>
        : !visible.length ? <Empty icon="📦" title="No products found" sub="Add insurance products for customers to purchase" />
        : (
          <div className="space-y-3">
            {visible.map((p: any) => (
              <Card key={p.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-syne font-bold">{p.name || p.productName}</span>
                      <Badge status={p.status || 'active'} />
                      <span className="px-2 py-0.5 rounded-full text-xs capitalize"
                        style={{ background: 'rgba(0,194,168,.1)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.2)' }}>
                        {p.productType || p.category}
                      </span>
                    </div>
                    <p className="text-muted text-sm mb-2 line-clamp-1">{p.description}</p>
                    <div className="flex gap-4 flex-wrap text-xs text-muted">
                      {(p.minPremium ?? p.premiumMin) && <span>Min: <span className="text-accent font-semibold">₦{Number(p.minPremium ?? p.premiumMin).toLocaleString()}</span></span>}
                      {(p.maxPremium ?? p.premiumMax) && <span>Max: <span className="text-accent font-semibold">₦{Number(p.maxPremium ?? p.premiumMax).toLocaleString()}</span></span>}
                      {p.commissionRate && <span>Commission: <span className="text-white">{(Number(p.commissionRate) * 100).toFixed(0)}%</span></span>}
                      {p.durationMonths && <span>Duration: <span className="text-white">{p.durationMonths}mo</span></span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start shrink-0">
                    <ActionBtn label="Edit" color="ghost" onClick={() => openEdit(p)} />
                    <ActionBtn label={p.status === 'active' ? 'Deactivate' : 'Activate'} color={p.status === 'active' ? 'red' : 'green'} onClick={() => toggle(p)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {editing !== null && (
        <Modal title={editing ? 'Edit Product' : 'Add Insurance Product'} wide onClose={() => setEditing(null)}>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Field label="Product Name" value={form.name} onChange={f('name')} required placeholder="e.g. SME Business Shield" /></div>
            <Select label="Insurance Provider" value={form.providerId} onChange={f('providerId')} required
              options={[{ value: '', label: 'Select a provider…' }, ...providers.map((p: any) => ({ value: p.id, label: p.name }))]} />
            <Select label="Product Type" value={form.productType} onChange={f('productType')}
              options={PRODUCT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
            <Field label="Min Premium (₦)" value={form.minPremium} onChange={f('minPremium')} type="number" placeholder="5000" />
            <Field label="Max Premium (₦)" value={form.maxPremium} onChange={f('maxPremium')} type="number" placeholder="500000" />
            <Field label="Commission Rate (%)" value={form.commissionRate} onChange={f('commissionRate')} type="number" placeholder="10" hint="Platform commission percentage" />
            <Field label="Duration (months)" value={form.durationMonths} onChange={f('durationMonths')} type="number" placeholder="12" />
            <div className="md:col-span-2"><Field label="Description" value={form.description} onChange={f('description')} textarea placeholder="Describe what risks and events this product covers…" /></div>
            <div className="md:col-span-2"><Field label='Coverage Details (JSON)' value={form.coverageDetails} onChange={f('coverageDetails')} textarea rows={4}
              placeholder={'{"fire": true, "theft": true, "liability": true, "flood": false}'} hint="Optional JSON coverage specification" /></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setEditing(null)} className="flex-1 py-2.5 rounded-xl text-sm text-muted font-semibold" style={{ background: 'rgba(255,255,255,.05)' }}>Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              style={{ background: '#F4A623', color: '#0A0F1E' }}>
              {saving && <Spin />}{editing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── USERS ─────────────────────────────────────────────────────────────────
function UsersTab({ store, token, loading, toast, reload }: any) {
  const users: any[] = store.users || []
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<any>(null)
  const [roleTarget, setRoleTarget] = useState<any>(null)
  const [busy, setBusy] = useState('')

  const visible = users
    .filter(u => filter === 'all' || u.role === filter || u.status === filter)
    .filter(u => {
      if (!search) return true
      const q = search.toLowerCase()
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q)
    })

  const counts = {
    all: users.length,
    consumer: users.filter(u => u.role === 'consumer').length,
    sme_owner: users.filter(u => u.role === 'sme_owner').length,
    admin: users.filter(u => u.role === 'admin').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  }

  async function toggleSuspend(u: any) {
    const action = u.status === 'suspended' ? 'activate' : 'suspend'
    setBusy(u.id)
    try {
      await req(token, 'PATCH', `/admin/users/${u.id}/${action}`)
      toast(`User ${action}d`)
      reload('users', '/admin/users')
    } catch (e: any) { toast(e.message, false) }
    setBusy('')
  }

  async function changeRole(userId: string, role: string) {
    try {
      await req(token, 'PATCH', `/admin/users/${userId}/role`, { role })
      toast('Role updated successfully')
      setRoleTarget(null)
      reload('users', '/admin/users')
    } catch (e: any) { toast(e.message, false) }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="font-syne font-black text-2xl">Users ({users.length})</h1>
          <p className="text-muted text-sm mt-0.5">Manage user accounts, roles and access</p>
        </div>
        <button onClick={() => reload('users', '/admin/users')}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white flex items-center gap-1.5 transition-all"
          style={{ background: 'rgba(255,255,255,.06)' }}>
          {loading.users ? <Spin /> : '↻'} Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
          placeholder="Search name, email or phone…" />
        <Filters options={['all', 'consumer', 'sme_owner', 'admin', 'suspended']} value={filter} onChange={setFilter} />
      </div>

      <div className="flex gap-2 flex-wrap mb-5 text-xs">
        {Object.entries(counts).map(([k, v]) => (
          <span key={k} className="px-2 py-1 rounded-lg capitalize" style={{ background: 'rgba(255,255,255,.05)', color: '#8492B4' }}>
            {k.replace('_', ' ')}: <strong className="text-white">{v}</strong>
          </span>
        ))}
      </div>

      {loading.users && !users.length ? <div className="flex justify-center py-20"><Spin /></div>
        : !visible.length ? <Empty icon="👥" title="No users found" sub="Try different filters or search terms" />
        : (
          <div className="space-y-2">
            {visible.map((u: any) => (
              <Card key={u.id}>
                <div className="flex flex-wrap justify-between gap-3 items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-sm">{u.name || 'No name'}</span>
                      <Badge status={u.status || 'active'} />
                      <span className="px-2 py-0.5 rounded-full text-xs capitalize"
                        style={{ background: 'rgba(124,107,255,.15)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,.25)' }}>
                        {u.role?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-muted text-xs">
                      {u.email}
                      {u.phone && ` · ${u.phone}`}
                      {u.lastLogin && ` · Last login: ${new Date(u.lastLogin).toLocaleDateString('en-NG')}`}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <ActionBtn label="View" color="ghost" onClick={() => setViewing(u)} />
                    <ActionBtn label="Role" color="purple" onClick={() => setRoleTarget(u)} />
                    <ActionBtn
                      label={u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      color={u.status === 'suspended' ? 'green' : 'red'}
                      onClick={() => toggleSuspend(u)} disabled={busy === u.id} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {/* User detail modal */}
      {viewing && (
        <Modal title={viewing.name || viewing.email} onClose={() => setViewing(null)}>
          <div className="space-y-2.5 mb-5">
            {[
              ['User ID',    viewing.id],
              ['Name',       viewing.name || '—'],
              ['Email',      viewing.email],
              ['Phone',      viewing.phone || '—'],
              ['Role',       <span key="r" className="capitalize">{viewing.role?.replace('_', ' ')}</span>],
              ['Status',     <Badge status={viewing.status || 'active'} />],
              ['Email Verified', viewing.emailVerified ? '✅ Yes' : '❌ No'],
              ['Joined',     viewing.createdAt ? new Date(viewing.createdAt).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '—'],
              ['Last Login', viewing.lastLogin ? new Date(viewing.lastLogin).toLocaleString('en-NG') : 'Never'],
            ].map(([l, v]: any) => (
              <div key={l} className="flex justify-between items-center px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                <span className="text-muted text-xs">{l}</span>
                <span className="text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setViewing(null); setRoleTarget(viewing) }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(124,107,255,.15)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,.3)' }}>
              Change Role
            </button>
            <button onClick={() => { toggleSuspend(viewing); setViewing(null) }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold"
              style={viewing.status === 'suspended'
                ? { background: 'rgba(46,201,126,.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,.3)' }
                : { background: 'rgba(232,69,69,.15)', color: '#E84545', border: '1px solid rgba(232,69,69,.3)' }}>
              {viewing.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
          </div>
        </Modal>
      )}

      {/* Role change modal */}
      {roleTarget && (
        <Modal title={`Change Role — ${roleTarget.name || roleTarget.email}`} onClose={() => setRoleTarget(null)}>
          <p className="text-muted text-sm mb-5">
            Current role: <strong className="text-white capitalize">{roleTarget.role?.replace('_', ' ')}</strong>
          </p>
          <div className="space-y-2">
            {[
              { role: 'consumer',          label: 'Consumer',          desc: 'Standard user — buy policies, file claims',            icon: '👤' },
              { role: 'sme_owner',         label: 'SME Owner',         desc: 'Business user — SME dashboard access',                 icon: '🏢' },
              { role: 'insurance_partner', label: 'Insurance Partner', desc: 'Provider access — view their own policies and claims', icon: '🤝' },
              { role: 'admin',             label: 'Admin',             desc: 'Full platform access — all management features',      icon: '🔐' },
            ].map(r => (
              <button key={r.role} onClick={() => changeRole(roleTarget.id, r.role)}
                className="w-full p-4 rounded-xl text-left transition-all hover:brightness-110"
                style={{
                  background: roleTarget.role === r.role ? 'rgba(244,166,35,.12)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${roleTarget.role === r.role ? 'rgba(244,166,35,.4)' : 'rgba(255,255,255,.08)'}`,
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {r.label}
                      {roleTarget.role === r.role && <span className="text-xs text-accent">(current)</span>}
                    </div>
                    <div className="text-muted text-xs mt-0.5">{r.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── POLICIES ──────────────────────────────────────────────────────────────
function PoliciesTab({ store, token, loading, toast, reload }: any) {
  const policies: any[] = store.policies || []
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<any>(null)
  const [busy, setBusy] = useState('')

  const visible = policies
    .filter(p => filter === 'all' || p.policyStatus === filter)
    .filter(p => {
      if (!search) return true
      const q = search.toLowerCase()
      return p.policyNumber?.toLowerCase().includes(q) || p.user?.name?.toLowerCase().includes(q) || p.user?.email?.toLowerCase().includes(q)
    })

  const counts = ['pending', 'active', 'expired', 'cancelled', 'lapsed']
    .map(s => [s, policies.filter(p => p.policyStatus === s).length])

  async function activate(id: string) {
    setBusy(id + '_activate')
    try {
      await req(token, 'PATCH', `/admin/policies/${id}/activate`)
      toast('Policy activated')
      reload('policies', '/admin/policies')
    } catch (e: any) { toast(e.message, false) }
    setBusy('')
  }

  async function cancel(id: string) {
    setBusy(id + '_cancel')
    try {
      await req(token, 'PATCH', `/admin/policies/${id}/cancel`)
      toast('Policy cancelled')
      setViewing(null)
      reload('policies', '/admin/policies')
    } catch (e: any) { toast(e.message, false) }
    setBusy('')
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
        <div>
          <h1 className="font-syne font-black text-2xl">All Policies</h1>
          <p className="text-muted text-sm mt-0.5">View and manage customer insurance policies</p>
        </div>
        <button onClick={() => reload('policies', '/admin/policies')}
          className="px-3 py-2 rounded-lg text-xs font-semibold text-muted hover:text-white flex items-center gap-1.5 transition-all"
          style={{ background: 'rgba(255,255,255,.06)' }}>
          {loading.policies ? <Spin /> : '↻'} Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
          placeholder="Search policy number or customer…" />
        <Filters options={['all', 'pending', 'active', 'expired', 'cancelled']} value={filter} onChange={setFilter} />
      </div>

      <div className="flex gap-2 flex-wrap mb-5 text-xs">
        {counts.map(([s, n]) => n ? (
          <span key={s as string} className="px-2 py-1 rounded-lg capitalize" style={{ background: 'rgba(255,255,255,.05)', color: '#8492B4' }}>
            {s}: <strong className="text-white">{n as number}</strong>
          </span>
        ) : null)}
      </div>

      {loading.policies && !policies.length ? <div className="flex justify-center py-20"><Spin /></div>
        : !visible.length ? <Empty icon="📋" title="No policies found" sub="Policies will appear here once customers purchase coverage" />
        : (
          <div className="space-y-3">
            {visible.map((p: any) => (
              <Card key={p.id}>
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-syne font-bold">{p.policyNumber}</span>
                      <Badge status={p.policyStatus} />
                      {p.autoRenew && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,194,168,.1)', color: '#00C2A8' }}>Auto-renew</span>}
                    </div>
                    <div className="flex gap-4 flex-wrap text-xs text-muted">
                      <span>💰 <span className="text-accent font-semibold">₦{Number(p.premiumAmount || 0).toLocaleString()}</span></span>
                      <span>👤 <span className="text-white">{p.user?.name || p.user?.email || '—'}</span></span>
                      {p.coverageAmount && <span>🛡️ Cover: <span className="text-white">₦{Number(p.coverageAmount).toLocaleString()}</span></span>}
                      {p.startDate && <span>📅 {new Date(p.startDate).toLocaleDateString('en-NG')} → {p.endDate ? new Date(p.endDate).toLocaleDateString('en-NG') : '?'}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 items-start shrink-0">
                    <ActionBtn label="Details" color="ghost" onClick={() => setViewing(p)} />
                    {p.policyStatus === 'pending' &&
                      <ActionBtn label="✓ Activate" color="green" onClick={() => activate(p.id)} disabled={busy === p.id + '_activate'} />}
                    {p.policyStatus === 'active' &&
                      <ActionBtn label="Cancel" color="red" onClick={() => cancel(p.id)} disabled={busy === p.id + '_cancel'} />}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {viewing && (
        <Modal title={`Policy — ${viewing.policyNumber}`} wide onClose={() => setViewing(null)}>
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {[
              ['Policy No.',   viewing.policyNumber],
              ['Status',       <Badge status={viewing.policyStatus} />],
              ['Premium',      <span key="a" className="text-accent font-bold">₦{Number(viewing.premiumAmount || 0).toLocaleString()}</span>],
              ['Coverage',     viewing.coverageAmount ? `₦${Number(viewing.coverageAmount).toLocaleString()}` : '—'],
              ['Customer',     viewing.user?.name || '—'],
              ['Email',        viewing.user?.email || '—'],
              ['Start Date',   viewing.startDate ? new Date(viewing.startDate).toLocaleDateString('en-NG', { dateStyle: 'long' }) : 'Not started'],
              ['End Date',     viewing.endDate   ? new Date(viewing.endDate).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '—'],
              ['Commission',   `₦${Number(viewing.commissionAmount || 0).toLocaleString()}`],
              ['Auto-renew',   viewing.autoRenew ? 'Yes' : 'No'],
              ['Created',      viewing.createdAt ? new Date(viewing.createdAt).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '—'],
            ].map(([l, v]: any) => (
              <div key={l} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                <div className="text-muted text-xs mb-1">{l}</div>
                <div className="text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>
          {viewing.policyDetails && Object.keys(viewing.policyDetails).length > 0 && (
            <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,.04)' }}>
              <div className="text-muted text-xs mb-2">Policy Details</div>
              <pre className="text-xs text-white/70 overflow-auto max-h-40">{JSON.stringify(viewing.policyDetails, null, 2)}</pre>
            </div>
          )}
          {viewing.documentUrl && (
            <a href={viewing.documentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold mb-4 transition-all hover:brightness-110"
              style={{ background: 'rgba(59,130,246,.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.2)' }}>
              📄 View Policy Document
            </a>
          )}
          <div className="flex gap-3">
            {viewing.policyStatus === 'pending' && (
              <button onClick={() => { activate(viewing.id); setViewing(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: '#2EC97E', color: '#0A0F1E' }}>✓ Activate Policy</button>
            )}
            {viewing.policyStatus === 'active' && (
              <button onClick={() => cancel(viewing.id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(232,69,69,.15)', color: '#E84545', border: '1px solid rgba(232,69,69,.3)' }}>
                Cancel Policy
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────
function AnalyticsTab({ store, token, loading, toast, reload }: any) {
  const a = store.analytics || {}
  const s = store.stats || {}
  const commissions: any[] = a.commissions || []
  const summary = a.summary || {}
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [fetching, setFetching] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [acting, setActing] = useState(false)
  const [noteModal, setNoteModal] = useState<any>(null) // { id, action }
  const [note, setNote] = useState('')

  async function fetchRange() {
    setFetching(true)
    try {
      const params = new URLSearchParams()
      if (start) params.set('startDate', start)
      if (end) params.set('endDate', end)
      const path = `/admin/analytics/revenue${params.toString() ? '?' + params : ''}`
      reload('analytics', path)
    } catch (e: any) { toast(e.message, false) }
    setFetching(false)
  }

  function clearRange() { setStart(''); setEnd(''); reload('analytics', '/admin/analytics/revenue') }

  const providerOptions = ['all', ...Array.from(new Set(commissions.map((c: any) => c.providerName).filter(Boolean)))]
  const visible = commissions.filter(c =>
    (statusFilter === 'all' || c.status === statusFilter) &&
    (providerFilter === 'all' || c.providerName === providerFilter)
  )

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAll() {
    const ids = visible.map((c: any) => c.id)
    setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids))
  }

  async function markOne(id: string, action: 'processing' | 'paid', notes?: string) {
    setActing(true)
    try {
      await req(token, 'PATCH', `/admin/commissions/${id}/${action}`, notes ? { notes } : {})
      toast(`Commission marked as ${action}`)
      reload('analytics', '/admin/analytics/revenue')
      setSelected(new Set())
    } catch (e: any) { toast(e.message, false) }
    setActing(false)
  }

  async function bulkPay() {
    if (!selected.size) return
    setActing(true)
    try {
      await req(token, 'POST', '/admin/commissions/bulk-paid', { ids: Array.from(selected) })
      toast(`${selected.size} commissions marked as paid`)
      reload('analytics', '/admin/analytics/revenue')
      setSelected(new Set())
    } catch (e: any) { toast(e.message, false) }
    setActing(false)
  }

  function exportCsv() {
    const rows = [
      ['Policy Number', 'Provider', 'Gross Premium', 'Rate', 'Commission', 'Platform Fee', 'Net Commission', 'Status', 'Paid At', 'Date'],
      ...visible.map((c: any) => [
        c.policyNumber || c.policyId || '',
        c.providerName || '',
        c.grossPremium || 0,
        c.commissionRate ? (Number(c.commissionRate) * 100).toFixed(0) + '%' : '',
        c.commissionAmount || 0,
        c.platformFee || 0,
        c.netCommission || 0,
        c.status || '',
        c.paidAt ? new Date(c.paidAt).toLocaleDateString('en-NG') : '',
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-NG') : '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `commission-ledger-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  function openNoteModal(id: string, action: 'paid') {
    setNoteModal({ id, action }); setNote('')
  }

  const busy = loading.analytics

  const revenueKpis = [
    { label: 'Total Revenue',     value: s.totalRevenue    != null ? `₦${Number(s.totalRevenue).toLocaleString()}`    : '—', icon: '💰', color: '#2EC97E', hint: 'Successful payments' },
    { label: 'Gross Premiums',    value: summary.totalGross != null ? `₦${Number(summary.totalGross).toLocaleString()}` : '—', icon: '📊', color: '#F4A623', hint: 'Total premium volume' },
    { label: 'Commissions Earned',value: summary.totalCommission != null ? `₦${Number(summary.totalCommission).toLocaleString()}` : '—', icon: '💵', color: '#00C2A8', hint: 'Gross commissions' },
    { label: 'Net to Disburse',   value: summary.totalNet  != null ? `₦${Number(summary.totalNet).toLocaleString()}`   : '—', icon: '✅', color: '#7C6BFF', hint: 'After platform fees' },
  ]

  const ledgerStatusCards = [
    { key: 'pending',    label: 'Pending Payout',  color: '#F4A623', value: summary.totalPending    != null ? `₦${Number(summary.totalPending).toLocaleString()}`    : '—', count: summary.pendingCount ?? 0 },
    { key: 'processing', label: 'Processing',       color: '#7C6BFF', value: summary.totalNet != null ? '—' : '—', count: summary.processingCount ?? 0 },
    { key: 'paid',       label: 'Paid Out',         color: '#2EC97E', value: summary.totalPaid       != null ? `₦${Number(summary.totalPaid).toLocaleString()}`       : '—', count: summary.paidCount ?? 0 },
  ]

  const pendingSelected = Array.from(selected).filter(id => {
    const c = commissions.find(c => c.id === id)
    return c?.status === 'pending'
  })

  return (
    <div>
      <h1 className="font-syne font-black text-2xl mb-1">Analytics & Revenue</h1>
      <p className="text-muted text-sm mb-6">Commission ledger and platform performance metrics</p>

      {/* Date range */}
      <Card className="mb-6">
        <p className="text-muted text-xs uppercase tracking-widest font-semibold mb-4">Date Range Filter</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-36">
            <label className="text-xs text-muted block mb-1.5">From</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }} />
          </div>
          <div className="flex-1 min-w-36">
            <label className="text-xs text-muted block mb-1.5">To</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }} />
          </div>
          <button onClick={fetchRange} disabled={fetching}
            className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 transition-all hover:brightness-110"
            style={{ background: '#F4A623', color: '#0A0F1E' }}>
            {fetching && <Spin />} Apply Filter
          </button>
          {(start || end) && (
            <button onClick={clearRange} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,.06)' }}>Clear</button>
          )}
        </div>
      </Card>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {revenueKpis.map(k => (
          <Card key={k.label}>
            <div className="text-2xl mb-2">{k.icon}</div>
            {busy ? <div className="h-7 w-20 rounded-lg animate-pulse mb-0.5" style={{ background: 'rgba(255,255,255,.08)' }} />
              : <div className="font-syne font-black text-xl mb-0.5" style={{ color: k.color }}>{k.value}</div>}
            <div className="text-muted text-xs uppercase tracking-wider">{k.label}</div>
            <div className="text-muted text-xs mt-0.5 opacity-60">{k.hint}</div>
          </Card>
        ))}
      </div>

      {/* Commission payout status cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {ledgerStatusCards.map(k => (
          <button key={k.key} onClick={() => setStatusFilter(statusFilter === k.key ? 'all' : k.key)}
            className="p-4 rounded-xl text-left transition-all hover:brightness-110"
            style={{
              background: statusFilter === k.key ? `${k.color}18` : 'rgba(13,27,62,.6)',
              border: `1px solid ${statusFilter === k.key ? k.color + '50' : 'rgba(255,255,255,.06)'}`,
            }}>
            <div className="font-syne font-bold text-lg" style={{ color: k.color }}>{k.value}</div>
            <div className="text-white text-sm font-semibold">{k.label}</div>
            <div className="text-muted text-xs mt-0.5">{k.count} record{k.count !== 1 ? 's' : ''}</div>
          </button>
        ))}
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          ['Total Policies',  s.totalPolicies,  '#F4A623'],
          ['Active Policies', s.activePolicies, '#2EC97E'],
          ['Total Claims',    s.totalClaims,    '#7C6BFF'],
          ['Open Claims',     s.openClaims,     '#E84545'],
          ['Total Users',     s.totalUsers,     '#00C2A8'],
          ['Platform Fee',    summary.totalPlatformFee != null ? `₦${Number(summary.totalPlatformFee).toLocaleString()}` : '—', '#8492B4'],
        ].map(([l, v, c]: any) => (
          <div key={l} className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(13,27,62,.6)', border: '1px solid rgba(255,255,255,.06)' }}>
            <div>
              <div className="font-syne font-bold text-lg" style={{ color: c }}>{v ?? '—'}</div>
              <div className="text-muted text-xs">{l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Commission Ledger */}
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <p className="font-syne font-bold text-base">Commission Ledger</p>
            <p className="text-muted text-xs mt-0.5">
              {statusFilter !== 'all' ? `Showing ${statusFilter}` : 'All records'} — {visible.length} entries
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filters options={['all', 'pending', 'processing', 'paid']} value={statusFilter} onChange={setStatusFilter} />
            {providerOptions.length > 2 && (
              <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white outline-none"
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}>
                {providerOptions.map(p => <option key={p} value={p}>{p === 'all' ? 'All Providers' : p}</option>)}
              </select>
            )}
            <button onClick={exportCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
              style={{ background: 'rgba(0,194,168,.12)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.3)' }}>
              ↓ Export CSV
            </button>
            {selected.size > 0 && (
              <div className="flex gap-2">
                <span className="text-xs text-muted py-2">{selected.size} selected</span>
                {pendingSelected.length > 0 && (
                  <button onClick={bulkPay} disabled={acting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 transition-all hover:brightness-110"
                    style={{ background: '#2EC97E', color: '#0A0F1E' }}>
                    {acting ? <Spin /> : `✓ Mark ${pendingSelected.length} as Paid`}
                  </button>
                )}
                <button onClick={() => setSelected(new Set())}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted font-semibold"
                  style={{ background: 'rgba(255,255,255,.06)' }}>Clear</button>
              </div>
            )}
          </div>
        </div>

        {busy ? (
          <div className="flex justify-center py-10"><Spin /></div>
        ) : visible.length === 0 ? (
          <Empty icon="💵" title="No commission records" sub="Records appear here as policies are purchased" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  <th className="pb-3 pr-3 w-8">
                    <input type="checkbox" checked={selected.size === visible.length && visible.length > 0}
                      onChange={toggleAll} className="cursor-pointer" />
                  </th>
                  {['Policy', 'Provider', 'Premium', 'Rate', 'Commission', 'Platform Fee', 'Net', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c: any) => (
                  <tr key={c.id} className="transition-all hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,.04)', background: selected.has(c.id) ? 'rgba(26,58,143,.2)' : '' }}>
                    <td className="py-3 pr-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="cursor-pointer" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-mono text-xs text-accent">{c.policyNumber || c.policyId?.slice(0, 8) + '…'}</div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-white">{c.providerName || c.providerId?.slice(0, 8) + '…' || '—'}</td>
                    <td className="py-3 pr-4 font-semibold" style={{ color: '#F4A623' }}>₦{Number(c.grossPremium || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-muted text-xs">{c.commissionRate ? (Number(c.commissionRate) * 100).toFixed(0) + '%' : '—'}</td>
                    <td className="py-3 pr-4 font-bold" style={{ color: '#2EC97E' }}>₦{Number(c.commissionAmount || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 text-xs text-muted">₦{Number(c.platformFee || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-semibold" style={{ color: '#00C2A8' }}>₦{Number(c.netCommission || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4"><Badge status={c.status || 'pending'} /></td>
                    <td className="py-3 pr-4 text-muted text-xs whitespace-nowrap">
                      {c.paidAt
                        ? <span title={new Date(c.paidAt).toLocaleString('en-NG')}>Paid {new Date(c.paidAt).toLocaleDateString('en-NG')}</span>
                        : new Date(c.createdAt).toLocaleDateString('en-NG')}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {c.status === 'pending' && (
                          <>
                            <button onClick={() => markOne(c.id, 'processing')} disabled={acting}
                              className="px-2 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
                              style={{ background: 'rgba(124,107,255,.15)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,.3)' }}>
                              Processing
                            </button>
                            <button onClick={() => openNoteModal(c.id, 'paid')} disabled={acting}
                              className="px-2 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
                              style={{ background: 'rgba(46,201,126,.12)', color: '#2EC97E', border: '1px solid rgba(46,201,126,.3)' }}>
                              Mark Paid
                            </button>
                          </>
                        )}
                        {c.status === 'processing' && (
                          <button onClick={() => openNoteModal(c.id, 'paid')} disabled={acting}
                            className="px-2 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
                            style={{ background: 'rgba(46,201,126,.12)', color: '#2EC97E', border: '1px solid rgba(46,201,126,.3)' }}>
                            Mark Paid
                          </button>
                        )}
                        {c.status === 'paid' && c.notes && (
                          <span className="text-xs text-muted italic truncate max-w-[120px]" title={c.notes}>{c.notes}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mark Paid modal with optional note */}
      {noteModal && (
        <Modal title="Mark as Paid" onClose={() => setNoteModal(null)}>
          <p className="text-muted text-sm mb-4">Optionally add a payment reference or note (e.g. bank transfer ref).</p>
          <Field label="Payment Note (optional)" value={note} onChange={(v: string) => setNote(v)}
            placeholder="e.g. GTB transfer REF-20240315-001" />
          <div className="flex gap-3 mt-5">
            <button onClick={() => setNoteModal(null)}
              className="flex-1 py-2.5 rounded-xl text-sm text-muted font-semibold"
              style={{ background: 'rgba(255,255,255,.05)' }}>Cancel</button>
            <button onClick={() => { markOne(noteModal.id, 'paid', note || undefined); setNoteModal(null) }}
              disabled={acting}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#2EC97E', color: '#0A0F1E' }}>
              {acting && <Spin />} Confirm Paid
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
