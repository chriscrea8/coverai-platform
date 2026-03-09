'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { policiesApi, claimsApi, paymentsApi } from '@/lib/api'
import { useAuthStore, hydrateAuth } from '@/lib/store'

const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'policies', icon: '📋', label: 'My Policies' },
  { id: 'claims', icon: '🛡️', label: 'Claims' },
  { id: 'payments', icon: '💳', label: 'Payments' },
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, clearAuth, isLoggedIn } = useAuthStore()
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [policies, setPolicies] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hydrateAuth()
    if (!isLoggedIn()) { router.push('/auth'); return }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, c, pay] = await Promise.allSettled([
        policiesApi.getAll(), claimsApi.getAll(), paymentsApi.getHistory(),
      ])
      if (p.status === 'fulfilled') setPolicies(p.value.data.data || [])
      if (c.status === 'fulfilled') setClaims(c.value.data.data || [])
      if (pay.status === 'fulfilled') setPayments(pay.value.data.data || [])
    } catch {}
    setLoading(false)
  }

  const logout = () => { clearAuth(); router.push('/') }
  const navigate = (id: string) => { setActive(id); setMenuOpen(false) }

  const statusColor: any = {
    active: '#2EC97E', pending: '#F4A623', expired: '#E84545',
    submitted: '#F4A623', approved: '#2EC97E', rejected: '#E84545', under_review: '#7C6BFF'
  }

  const kpis = [
    { label: 'Active Policies', value: policies.filter(p => p.policyStatus === 'active').length, icon: '📋' },
    { label: 'Open Claims', value: claims.filter(c => ['submitted','under_review'].includes(c.status)).length, icon: '🛡️' },
    { label: 'Total Payments', value: `₦${payments.reduce((s, p) => s + (p.paymentStatus === 'successful' ? Number(p.amount) : 0), 0).toLocaleString()}`, icon: '💳' },
    { label: 'Total Policies', value: policies.length, icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-ink flex flex-col">

      {/* ── Mobile top bar ── */}
      <header className="flex items-center justify-between px-4 py-3 md:hidden sticky top-0 z-40"
        style={{ background: 'rgba(13,27,62,0.97)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" className="font-syne font-black text-lg">Cover<span className="text-accent">AI</span></Link>
        <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </header>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 top-[52px]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMenuOpen(false)}>
          <div className="px-4 pt-2 pb-4" style={{ background: 'rgba(13,27,62,0.99)' }} onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(m => (
              <button key={m.id} onClick={() => navigate(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 text-left transition-all ${active === m.id ? 'text-white' : 'text-muted'}`}
                style={active === m.id ? { background: 'rgba(26,58,143,0.4)' } : {}}>
                <span className="text-base">{m.icon}</span>{m.label}
              </button>
            ))}
            <div className="border-t border-white/5 my-2" />
            <Link href="/chat" onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>🤖</span>AI Assistant
            </Link>
            <Link href="/claims/new" onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>⚡</span>New Claim
            </Link>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400">
              <span>🚪</span>Sign Out
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex w-60 shrink-0 sticky top-0 h-screen flex-col py-6 px-4"
          style={{ background: 'rgba(13,27,62,0.95)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <Link href="/" className="font-syne font-black text-xl px-2 mb-8">Cover<span className="text-accent">AI</span></Link>
          <nav className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map(m => (
              <button key={m.id} onClick={() => setActive(m.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all ${active === m.id ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
                style={active === m.id ? { background: 'rgba(26,58,143,0.4)' } : {}}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
            <div className="my-2 border-t border-white/5" />
            <Link href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>🤖</span>AI Assistant
            </Link>
            <Link href="/claims/new" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>⚡</span>New Claim
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-400/10 transition-all mt-2"
                style={{ border: '1px solid rgba(232,69,69,0.2)' }}>
                <span>🔐</span>Admin Panel
              </Link>
            )}
          </nav>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-red-400 transition-all">
            <span>🚪</span>Sign Out
          </button>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
          <div className="mb-6 md:mb-8">
            <h1 className="font-syne font-black text-xl md:text-2xl">Good day, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
            <p className="text-muted text-sm mt-1">Here's your insurance overview</p>
          </div>

          {/* ── Overview ── */}
          {active === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
                {kpis.map(k => (
                  <div key={k.label} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="text-xl md:text-2xl mb-2 md:mb-3">{k.icon}</div>
                    <div className="font-syne font-black text-xl md:text-2xl truncate">{loading ? '—' : k.value}</div>
                    <div className="text-muted text-xs mt-1 uppercase tracking-wider font-semibold leading-tight">{k.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                <div className="p-5 md:p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="font-syne font-bold mb-4 md:mb-5">📋 Recent Policies</h3>
                  {policies.length === 0 ? (
                    <div className="text-center py-6 md:py-8">
                      <p className="text-muted text-sm mb-4">No policies yet</p>
                      <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold inline-block">Get Coverage</Link>
                    </div>
                  ) : policies.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{p.policyNumber}</div>
                        <div className="text-muted text-xs mt-0.5">₦{Number(p.premiumAmount).toLocaleString()}</div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: (statusColor[p.policyStatus] || '#8492B4') + '20', color: statusColor[p.policyStatus] || '#8492B4' }}>
                        {p.policyStatus}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-5 md:p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <h3 className="font-syne font-bold mb-4 md:mb-5">🛡️ Recent Claims</h3>
                  {claims.length === 0 ? (
                    <div className="text-center py-6 md:py-8">
                      <p className="text-muted text-sm mb-4">No claims submitted</p>
                      <Link href="/claims/new" className="px-4 py-2 rounded-xl text-sm font-bold inline-block"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>Submit Claim</Link>
                    </div>
                  ) : claims.slice(0, 4).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{c.claimNumber}</div>
                        <div className="text-muted text-xs mt-0.5">₦{Number(c.claimAmount).toLocaleString()}</div>
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: (statusColor[c.status] || '#8492B4') + '20', color: statusColor[c.status] || '#8492B4' }}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile quick actions */}
              <div className="mt-4 grid grid-cols-2 gap-3 md:hidden">
                <Link href="/coverage" className="py-3 rounded-xl bg-accent text-ink text-sm font-bold text-center">Get Coverage</Link>
                <Link href="/claims/new" className="py-3 rounded-xl text-white text-sm font-bold text-center"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>New Claim</Link>
              </div>
            </>
          )}

          {/* ── Policies ── */}
          {active === 'policies' && (
            <div>
              <div className="flex justify-between items-center mb-5 md:mb-6">
                <h2 className="font-syne font-bold text-lg md:text-xl">My Policies</h2>
                <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ Get Coverage</Link>
              </div>
              {loading ? <p className="text-muted">Loading...</p> : policies.length === 0 ? (
                <div className="text-center py-16 md:py-20">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-muted mb-6">No policies yet. Get your first coverage!</p>
                  <Link href="/coverage" className="px-6 py-3 rounded-xl bg-accent text-ink font-bold inline-block">Browse Plans</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.map(p => (
                    <div key={p.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="font-syne font-bold truncate">{p.policyNumber}</div>
                          <div className="text-muted text-sm mt-1">₦{Number(p.premiumAmount).toLocaleString()} premium</div>
                          {p.startDate && <div className="text-muted text-xs mt-1">{new Date(p.startDate).toLocaleDateString()} → {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}</div>}
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold shrink-0"
                          style={{ background: (statusColor[p.policyStatus] || '#8492B4') + '20', color: statusColor[p.policyStatus] || '#8492B4' }}>
                          {p.policyStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Claims ── */}
          {active === 'claims' && (
            <div>
              <div className="flex justify-between items-center mb-5 md:mb-6">
                <h2 className="font-syne font-bold text-lg md:text-xl">Claims</h2>
                <Link href="/claims/new" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ New Claim</Link>
              </div>
              {loading ? <p className="text-muted">Loading...</p> : claims.length === 0 ? (
                <div className="text-center py-16 md:py-20">
                  <div className="text-5xl mb-4">🛡️</div>
                  <p className="text-muted">No claims yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map(c => (
                    <div key={c.id} className="p-4 md:p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-syne font-bold truncate">{c.claimNumber}</div>
                          <div className="text-muted text-sm mt-1 line-clamp-2">{c.description?.substring(0, 80)}</div>
                          <div className="text-muted text-xs mt-1">₦{Number(c.claimAmount).toLocaleString()}</div>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-bold h-fit shrink-0"
                          style={{ background: (statusColor[c.status] || '#8492B4') + '20', color: statusColor[c.status] || '#8492B4' }}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Payments ── */}
          {active === 'payments' && (
            <div>
              <h2 className="font-syne font-bold text-lg md:text-xl mb-5 md:mb-6">Payment History</h2>
              {loading ? <p className="text-muted">Loading...</p> : payments.length === 0 ? (
                <div className="text-center py-16 md:py-20">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-muted">No payment history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="p-4 md:p-5 rounded-2xl flex justify-between items-center gap-3"
                      style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{p.paymentReference}</div>
                        <div className="text-muted text-xs mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-syne font-bold text-sm">₦{Number(p.amount).toLocaleString()}</div>
                        <span className="text-xs" style={{ color: p.paymentStatus === 'successful' ? '#2EC97E' : '#F4A623' }}>{p.paymentStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: 'rgba(13,27,62,0.98)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(m => (
          <button key={m.id} onClick={() => setActive(m.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-all ${active === m.id ? 'text-accent' : 'text-muted'}`}>
            <span className="text-lg">{m.icon}</span>
            <span className="text-[10px]">{m.label}</span>
          </button>
        ))}
        <Link href="/chat" className="flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium text-muted">
          <span className="text-lg">🤖</span>
          <span className="text-[10px]">AI Chat</span>
        </Link>
      </nav>

      {/* bottom nav spacer on mobile */}
      <div className="md:hidden h-16" />
    </div>
  )
}
