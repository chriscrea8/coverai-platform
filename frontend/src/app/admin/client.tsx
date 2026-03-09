'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { useAuthStore, hydrateAuth } from '@/lib/store'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

function api(token: string) {
  return axios.create({ baseURL: API, headers: { Authorization: `Bearer ${token}` } })
}

// ─── Types ───────────────────────────────────────────────────────────
type Tab = 'overview' | 'claims' | 'providers' | 'products' | 'users' | 'policies'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'overview',  icon: '📊', label: 'Overview'   },
  { id: 'claims',    icon: '🛡️', label: 'Claims'     },
  { id: 'providers', icon: '🏦', label: 'Providers'  },
  { id: 'products',  icon: '📦', label: 'Products'   },
  { id: 'users',     icon: '👥', label: 'Users'      },
  { id: 'policies',  icon: '📋', label: 'Policies'   },
]

const STATUS_COLOR: Record<string, string> = {
  active: '#2EC97E', approved: '#2EC97E', successful: '#2EC97E', verified: '#2EC97E',
  pending: '#F4A623', submitted: '#F4A623', under_review: '#7C6BFF',
  rejected: '#E84545', expired: '#E84545', inactive: '#E84545', suspended: '#E84545',
}

function Badge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || '#8492B4'
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
      style={{ background: c + '20', color: c, border: `1px solid ${c}40` }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: '#0D1B3E', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-syne font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder = '', required = false, textarea = false }: any) {
  const cls = "w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
  const style = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{label}{required && ' *'}</label>
      {textarea
        ? <textarea className={cls} style={{ ...style, resize: 'vertical' }} rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input className={cls} style={style} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}

// ─── Main Admin Page ──────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { user, accessToken, isLoggedIn } = useAuthStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    hydrateAuth()
    if (!isLoggedIn()) { router.push('/auth'); return }
  }, [])

  const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '') || ''

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = async (key: string, endpoint: string) => {
    if (data[key]) return
    setLoading(true)
    try {
      const res = await api(token).get(endpoint)
      setData((d: any) => ({ ...d, [key]: res.data.data || res.data || [] }))
    } catch (e: any) {
      showToast(e.response?.data?.message || `Failed to load ${key}`)
    }
    setLoading(false)
  }

  const refresh = async (key: string, endpoint: string) => {
    setLoading(true)
    try {
      const res = await api(token).get(endpoint)
      setData((d: any) => ({ ...d, [key]: res.data.data || res.data || [] }))
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    if (tab === 'overview') { load('stats', '/admin/stats').catch(() => {}) }
    if (tab === 'claims')   { load('claims', '/admin/claims') }
    if (tab === 'providers') { load('providers', '/admin/providers') }
    if (tab === 'products') { load('products', '/admin/products') }
    if (tab === 'users')    { load('users', '/admin/users') }
    if (tab === 'policies') { load('policies', '/admin/policies') }
  }, [tab])

  const navigate = (t: Tab) => { setTab(t); setMenuOpen(false) }

  return (
    <div className="min-h-screen bg-ink flex flex-col" style={{ background: '#080D1A' }}>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-40"
        style={{ background: 'rgba(8,13,26,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="font-syne font-black text-lg">Cover<span className="text-accent">AI</span></Link>
          <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(232,69,69,0.2)', color: '#E84545', border: '1px solid rgba(232,69,69,0.3)' }}>
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted text-xs hidden md:block">{user?.name || user?.email}</span>
          <Link href="/dashboard" className="text-muted text-xs hover:text-white transition-colors hidden md:block">← User Dashboard</Link>
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1 rounded"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="w-4 h-0.5 bg-white rounded" />
            <span className="w-4 h-0.5 bg-white rounded" />
            <span className="w-4 h-0.5 bg-white rounded" />
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl"
          style={{ background: '#1A3A8F', border: '1px solid rgba(255,255,255,0.15)' }}>
          {toast}
        </div>
      )}

      <div className="flex flex-1">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col py-5 px-3 sticky top-12 h-[calc(100vh-48px)]"
          style={{ background: 'rgba(13,27,62,0.6)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-muted text-xs uppercase tracking-widest font-semibold px-3 mb-3">Management</p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left mb-0.5 transition-all ${tab === t.id ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
              style={tab === t.id ? { background: 'rgba(26,58,143,0.45)' } : {}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </aside>

        {/* ── Mobile slide menu ── */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 top-12" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setMenuOpen(false)}>
            <div className="px-3 py-3" style={{ background: 'rgba(13,27,62,0.99)' }} onClick={e => e.stopPropagation()}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => navigate(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 ${tab === t.id ? 'text-white' : 'text-muted'}`}
                  style={tab === t.id ? { background: 'rgba(26,58,143,0.4)' } : {}}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
          {loading && <div className="text-muted text-xs mb-3 animate-pulse">Loading...</div>}

          {tab === 'overview'  && <OverviewTab  data={data} />}
          {tab === 'claims'    && <ClaimsTab    data={data} token={token} refresh={() => refresh('claims', '/admin/claims')} showToast={showToast} />}
          {tab === 'providers' && <ProvidersTab data={data} token={token} refresh={() => refresh('providers', '/admin/providers')} showToast={showToast} />}
          {tab === 'products'  && <ProductsTab  data={data} token={token} refresh={() => refresh('products', '/admin/products')} showToast={showToast} />}
          {tab === 'users'     && <UsersTab     data={data} token={token} refresh={() => refresh('users', '/admin/users')} showToast={showToast} />}
          {tab === 'policies'  && <PoliciesTab  data={data} token={token} refresh={() => refresh('policies', '/admin/policies')} showToast={showToast} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto"
        style={{ background: 'rgba(8,13,26,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[60px] flex flex-col items-center py-2.5 gap-0.5 transition-all ${tab === t.id ? 'text-accent' : 'text-muted'}`}>
            <span className="text-base">{t.icon}</span>
            <span className="text-[9px] font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="md:hidden h-14" />
    </div>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────
function OverviewTab({ data }: any) {
  const stats = data.stats || {}
  const cards = [
    { label: 'Total Users',    value: stats.totalUsers    ?? '—', icon: '👥', color: '#00C2A8' },
    { label: 'Active Policies',value: stats.activePolicies ?? '—', icon: '📋', color: '#F4A623' },
    { label: 'Open Claims',    value: stats.openClaims    ?? '—', icon: '🛡️', color: '#7C6BFF' },
    { label: 'Total Revenue',  value: stats.totalRevenue  ? `₦${Number(stats.totalRevenue).toLocaleString()}` : '—', icon: '💰', color: '#2EC97E' },
    { label: 'Providers',      value: stats.totalProviders ?? '—', icon: '🏦', color: '#F4A623' },
    { label: 'Products',       value: stats.totalProducts  ?? '—', icon: '📦', color: '#00C2A8' },
  ]
  return (
    <div>
      <h1 className="font-syne font-black text-xl md:text-2xl mb-5">Platform Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="text-xl mb-2">{c.icon}</div>
            <div className="font-syne font-black text-xl md:text-2xl" style={{ color: c.color }}>{c.value}</div>
            <div className="text-muted text-xs mt-1 uppercase tracking-wider">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <h3 className="font-syne font-bold mb-4">🚀 Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Review Claims',    icon: '🛡️', tab: 'claims' },
            { label: 'Add Provider',     icon: '🏦', tab: 'providers' },
            { label: 'Add Product',      icon: '📦', tab: 'products' },
            { label: 'Manage Users',     icon: '👥', tab: 'users' },
          ].map(a => (
            <button key={a.label} className="p-3 rounded-xl text-sm font-medium text-left transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(26,58,143,0.3)', border: '1px solid rgba(26,58,143,0.4)' }}>
              <div className="text-xl mb-1">{a.icon}</div>
              <div>{a.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Claims Management ────────────────────────────────────────────────
function ClaimsTab({ data, token, refresh, showToast }: any) {
  const claims: any[] = data.claims || []
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [note, setNote] = useState('')
  const [acting, setActing] = useState(false)

  const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter)

  const act = async (id: string, action: 'approve' | 'reject') => {
    setActing(true)
    try {
      await api(token).patch(`/admin/claims/${id}/${action}`, { note })
      showToast(`Claim ${action}d successfully`)
      setSelected(null)
      setNote('')
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || `Failed to ${action} claim`)
    }
    setActing(false)
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-syne font-black text-xl">Claims Management</h1>
        <div className="flex gap-2 flex-wrap">
          {['all','submitted','under_review','approved','rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${filter === f ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}
              style={filter !== f ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              {f.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-muted text-sm py-8 text-center">No claims found</p>}
        {filtered.map((c: any) => (
          <div key={c.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-syne font-bold">{c.claimNumber}</span>
                  <Badge status={c.status} />
                </div>
                <div className="text-muted text-sm">{c.description?.substring(0, 100)}{c.description?.length > 100 ? '...' : ''}</div>
                <div className="flex gap-4 mt-2 text-xs text-muted flex-wrap">
                  <span>Amount: <span className="text-white font-semibold">₦{Number(c.claimAmount).toLocaleString()}</span></span>
                  <span>By: <span className="text-white">{c.user?.name || c.user?.email || '—'}</span></span>
                  <span>Date: {c.incidentDate ? new Date(c.incidentDate).toLocaleDateString() : '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 items-start flex-wrap">
                <button onClick={() => setSelected(c)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>View Details</button>
                {(c.status === 'submitted' || c.status === 'under_review') && (
                  <>
                    <button onClick={() => { setSelected(c); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)' }}>
                      Approve
                    </button>
                    <button onClick={() => { setSelected(c); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(232,69,69,0.15)', color: '#E84545', border: '1px solid rgba(232,69,69,0.3)' }}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal title={`Claim: ${selected.claimNumber}`} onClose={() => { setSelected(null); setNote('') }}>
          <div className="space-y-3 text-sm mb-5">
            <div className="flex justify-between"><span className="text-muted">Status</span><Badge status={selected.status} /></div>
            <div className="flex justify-between"><span className="text-muted">Amount</span><span className="font-bold text-accent">₦{Number(selected.claimAmount).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted">Claimant</span><span>{selected.user?.name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Incident Date</span><span>{selected.incidentDate ? new Date(selected.incidentDate).toLocaleDateString() : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted">Location</span><span>{selected.incidentLocation || '—'}</span></div>
            <div><span className="text-muted">Description</span><p className="mt-1 p-3 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.05)' }}>{selected.description}</p></div>
          </div>
          {(selected.status === 'submitted' || selected.status === 'under_review') && (
            <>
              <InputField label="Admin Note (optional)" value={note} onChange={setNote} textarea placeholder="Add a note about this decision..." />
              <div className="flex gap-3 mt-4">
                <button onClick={() => act(selected.id, 'approve')} disabled={acting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: '#2EC97E', color: '#0A0F1E' }}>
                  ✓ Approve Claim
                </button>
                <button onClick={() => act(selected.id, 'reject')} disabled={acting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'rgba(232,69,69,0.2)', color: '#E84545', border: '1px solid rgba(232,69,69,0.4)' }}>
                  ✕ Reject Claim
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

// ─── Insurance Providers ──────────────────────────────────────────────
function ProvidersTab({ data, token, refresh, showToast }: any) {
  const providers: any[] = data.providers || []
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', licenseNumber: '', description: '' })
  const [saving, setSaving] = useState(false)
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.name || !form.email) { showToast('Name and email are required'); return }
    setSaving(true)
    try {
      await api(token).post('/admin/providers', form)
      showToast(`Provider "${form.name}" onboarded successfully!`)
      setShowAdd(false)
      setForm({ name: '', email: '', phone: '', address: '', licenseNumber: '', description: '' })
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to add provider')
    }
    setSaving(false)
  }

  const toggle = async (id: string, current: string) => {
    const action = current === 'active' ? 'deactivate' : 'activate'
    try {
      await api(token).patch(`/admin/providers/${id}/${action}`)
      showToast(`Provider ${action}d`)
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update provider')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne font-black text-xl">Insurance Providers</h1>
          <p className="text-muted text-xs mt-0.5">Onboard and manage insurance companies on the platform</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all">
          + Add Provider
        </button>
      </div>

      <div className="space-y-3">
        {providers.length === 0 && <div className="text-center py-12 text-muted text-sm">No providers yet. Add your first insurance company.</div>}
        {providers.map((p: any) => (
          <div key={p.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-syne font-bold">{p.name}</span>
                  <Badge status={p.status || 'active'} />
                </div>
                <div className="text-muted text-xs space-y-0.5">
                  <div>📧 {p.email} {p.phone && `· 📞 ${p.phone}`}</div>
                  {p.licenseNumber && <div>🪪 License: {p.licenseNumber}</div>}
                  {p.description && <div className="text-xs mt-1">{p.description}</div>}
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <button onClick={() => toggle(p.id, p.status)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={p.status === 'active'
                    ? { background: 'rgba(232,69,69,0.15)', color: '#E84545', border: '1px solid rgba(232,69,69,0.3)' }
                    : { background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)' }}>
                  {p.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Onboard Insurance Provider" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <InputField label="Company Name" value={form.name} onChange={f('name')} required placeholder="e.g. Leadway Assurance" />
            <InputField label="Contact Email" value={form.email} onChange={f('email')} required type="email" placeholder="partner@insurer.com" />
            <InputField label="Phone Number" value={form.phone} onChange={f('phone')} placeholder="+234..." />
            <InputField label="NAICOM License Number" value={form.licenseNumber} onChange={f('licenseNumber')} placeholder="NAICOM/..." />
            <InputField label="Address" value={form.address} onChange={f('address')} placeholder="Company address" />
            <InputField label="Description" value={form.description} onChange={f('description')} textarea placeholder="Brief description of the insurance company..." />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted hover:text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#F4A623', color: '#0A0F1E' }}>
              {saving ? 'Onboarding...' : 'Onboard Provider'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Insurance Products ───────────────────────────────────────────────
function ProductsTab({ data, token, refresh, showToast }: any) {
  const products: any[] = data.products || []
  const providers: any[] = data.providers || []
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', productType: 'business', minPremium: '', maxPremium: '', providerId: '', coverageDetails: '' })
  const [saving, setSaving] = useState(false)
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!form.name || !form.providerId) { showToast('Name and provider are required'); return }
    setSaving(true)
    try {
      await api(token).post('/admin/products', {
        ...form,
        minPremium: Number(form.minPremium),
        maxPremium: Number(form.maxPremium),
      })
      showToast(`Product "${form.name}" added successfully!`)
      setShowAdd(false)
      setForm({ name: '', description: '', productType: 'business', minPremium: '', maxPremium: '', providerId: '', coverageDetails: '' })
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to add product')
    }
    setSaving(false)
  }

  const toggleProduct = async (id: string, current: string) => {
    const action = current === 'active' ? 'deactivate' : 'activate'
    try {
      await api(token).patch(`/admin/products/${id}/${action}`)
      showToast(`Product ${action}d`)
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update product')
    }
  }

  const TYPES = ['business', 'motor', 'life', 'health', 'property', 'liability', 'marine', 'travel']

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="font-syne font-black text-xl">Insurance Products</h1>
          <p className="text-muted text-xs mt-0.5">Manage policies available for sale to customers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all">
          + Add Product
        </button>
      </div>

      <div className="space-y-3">
        {products.length === 0 && <div className="text-center py-12 text-muted text-sm">No products yet. Add insurance products to sell to customers.</div>}
        {products.map((p: any) => (
          <div key={p.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-syne font-bold">{p.name}</span>
                  <Badge status={p.status || 'active'} />
                  <span className="px-2 py-0.5 rounded-full text-xs capitalize" style={{ background: 'rgba(0,194,168,0.1)', color: '#00C2A8' }}>{p.productType}</span>
                </div>
                <div className="text-muted text-sm">{p.description}</div>
                <div className="flex gap-4 mt-1.5 text-xs text-muted flex-wrap">
                  {p.minPremium && <span>Min: <span className="text-accent font-semibold">₦{Number(p.minPremium).toLocaleString()}</span></span>}
                  {p.maxPremium && <span>Max: <span className="text-accent font-semibold">₦{Number(p.maxPremium).toLocaleString()}</span></span>}
                  {p.provider && <span>Provider: <span className="text-white">{p.provider?.name}</span></span>}
                </div>
              </div>
              <div className="flex gap-2 items-start">
                <button onClick={() => toggleProduct(p.id, p.status)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={p.status === 'active'
                    ? { background: 'rgba(232,69,69,0.15)', color: '#E84545', border: '1px solid rgba(232,69,69,0.3)' }
                    : { background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)' }}>
                  {p.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="Add Insurance Product" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <InputField label="Product Name" value={form.name} onChange={f('name')} required placeholder="e.g. SME Business Shield" />
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Insurance Provider *</label>
              <select className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(13,27,62,0.9)', border: '1px solid rgba(255,255,255,0.12)' }}
                value={form.providerId} onChange={e => f('providerId')(e.target.value)}>
                <option value="">Select a provider</option>
                {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Product Type</label>
              <select className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none capitalize"
                style={{ background: 'rgba(13,27,62,0.9)', border: '1px solid rgba(255,255,255,0.12)' }}
                value={form.productType} onChange={e => f('productType')(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Min Premium (₦)" value={form.minPremium} onChange={f('minPremium')} type="number" placeholder="5000" />
              <InputField label="Max Premium (₦)" value={form.maxPremium} onChange={f('maxPremium')} type="number" placeholder="500000" />
            </div>
            <InputField label="Description" value={form.description} onChange={f('description')} textarea placeholder="What does this product cover?" />
            <InputField label="Coverage Details (JSON or text)" value={form.coverageDetails} onChange={f('coverageDetails')} textarea placeholder='e.g. {"fire": true, "theft": true, "liability": true}' />
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted"
              style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: '#F4A623', color: '#0A0F1E' }}>
              {saving ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Users ─────────────────────────────────────────────────────────────
function UsersTab({ data, token, refresh, showToast }: any) {
  const users: any[] = data.users || []
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter)

  const suspend = async (id: string, current: string) => {
    const action = current === 'suspended' ? 'activate' : 'suspend'
    try {
      await api(token).patch(`/admin/users/${id}/${action}`)
      showToast(`User ${action}d`)
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to update user')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-syne font-black text-xl">Users ({users.length})</h1>
        <div className="flex gap-2 flex-wrap">
          {['all', 'consumer', 'sme_owner', 'admin'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}
              style={filter !== f ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-muted text-sm py-8 text-center">No users found</p>}
        {filtered.map((u: any) => (
          <div key={u.id} className="p-4 rounded-2xl flex flex-wrap justify-between gap-3 items-center"
            style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{u.name}</span>
                <Badge status={u.status || 'active'} />
                <span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(124,107,255,0.15)', color: '#7C6BFF' }}>{u.role?.replace('_',' ')}</span>
              </div>
              <div className="text-muted text-xs mt-0.5">{u.email} {u.phone && `· ${u.phone}`}</div>
            </div>
            <button onClick={() => suspend(u.id, u.status)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={u.status === 'suspended'
                ? { background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)' }
                : { background: 'rgba(232,69,69,0.1)', color: '#E84545', border: '1px solid rgba(232,69,69,0.2)' }}>
              {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Policies ─────────────────────────────────────────────────────────
function PoliciesTab({ data, token, refresh, showToast }: any) {
  const policies: any[] = data.policies || []
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? policies : policies.filter(p => p.policyStatus === filter)

  const activate = async (id: string) => {
    try {
      await api(token).patch(`/admin/policies/${id}/activate`)
      showToast('Policy activated')
      refresh()
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to activate policy')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h1 className="font-syne font-black text-xl">All Policies</h1>
        <div className="flex gap-2 flex-wrap">
          {['all','pending','active','expired'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}
              style={filter !== f ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-muted text-sm py-8 text-center">No policies found</p>}
        {filtered.map((p: any) => (
          <div key={p.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-syne font-bold">{p.policyNumber}</span>
                  <Badge status={p.policyStatus} />
                </div>
                <div className="flex gap-4 text-xs text-muted flex-wrap">
                  <span>Premium: <span className="text-accent font-semibold">₦{Number(p.premiumAmount).toLocaleString()}</span></span>
                  <span>User: <span className="text-white">{p.user?.name || '—'}</span></span>
                  {p.startDate && <span>From: {new Date(p.startDate).toLocaleDateString()}</span>}
                  {p.endDate && <span>To: {new Date(p.endDate).toLocaleDateString()}</span>}
                </div>
              </div>
              {p.policyStatus === 'pending' && (
                <button onClick={() => activate(p.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)' }}>
                  Activate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
