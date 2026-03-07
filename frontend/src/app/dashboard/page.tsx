'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { policiesApi, claimsApi, paymentsApi, userApi } from '@/lib/api'
import { useAuthStore, hydrateAuth } from '@/lib/store'

function Sidebar({ active, setActive, onLogout }: any) {
  const items = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'policies', icon: '📋', label: 'My Policies' },
    { id: 'claims', icon: '🛡️', label: 'Claims' },
    { id: 'payments', icon: '💳', label: 'Payments' },
  ]
  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen flex flex-col py-6 px-4"
      style={{ background: 'rgba(13,27,62,0.95)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
      <Link href="/" className="font-syne font-black text-xl px-2 mb-8">Cover<span className="text-accent">AI</span></Link>
      <nav className="flex flex-col gap-1 flex-1">
        {items.map(m => (
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
      </nav>
      <button onClick={onLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-red-400 transition-all">
        <span>🚪</span>Sign Out
      </button>
    </aside>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, clearAuth, isLoggedIn } = useAuthStore()
  const [active, setActive] = useState('overview')
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

  const logout = async () => { clearAuth(); router.push('/') }

  const statusColor: any = { active: '#2EC97E', pending: '#F4A623', expired: '#E84545', submitted: '#F4A623', approved: '#2EC97E', rejected: '#E84545' }

  const kpis = [
    { label: 'Active Policies', value: policies.filter(p => p.policyStatus === 'active').length, icon: '📋' },
    { label: 'Open Claims', value: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length, icon: '🛡️' },
    { label: 'Total Payments', value: `₦${payments.reduce((s, p) => s + (p.paymentStatus === 'successful' ? Number(p.amount) : 0), 0).toLocaleString()}`, icon: '💳' },
    { label: 'Total Policies', value: policies.length, icon: '📊' },
  ]

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar active={active} setActive={setActive} onLogout={logout} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="font-syne font-black text-2xl">Good day, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
          <p className="text-muted text-sm mt-1">Here's your insurance overview</p>
        </div>

        {active === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {kpis.map(k => (
                <div key={k.label} className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-2xl mb-3">{k.icon}</div>
                  <div className="font-syne font-black text-2xl">{loading ? '—' : k.value}</div>
                  <div className="text-muted text-xs mt-1 uppercase tracking-wider font-semibold">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-syne font-bold mb-5">📋 Recent Policies</h3>
                {policies.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted text-sm mb-4">No policies yet</p>
                    <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">Get Coverage</Link>
                  </div>
                ) : policies.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <div className="font-semibold text-sm">{p.policyNumber}</div>
                      <div className="text-muted text-xs mt-0.5">₦{Number(p.premiumAmount).toLocaleString()} premium</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: (statusColor[p.policyStatus] || '#8492B4') + '20', color: statusColor[p.policyStatus] || '#8492B4' }}>
                      {p.policyStatus}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-syne font-bold mb-5">🛡️ Recent Claims</h3>
                {claims.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted text-sm mb-4">No claims submitted</p>
                    <Link href="/claims/new" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>Submit Claim</Link>
                  </div>
                ) : claims.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                    <div>
                      <div className="font-semibold text-sm">{c.claimNumber}</div>
                      <div className="text-muted text-xs mt-0.5">₦{Number(c.claimAmount).toLocaleString()}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: (statusColor[c.status] || '#8492B4') + '20', color: statusColor[c.status] || '#8492B4' }}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {active === 'policies' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-syne font-bold text-xl">My Policies</h2>
              <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ Get Coverage</Link>
            </div>
            {loading ? <p className="text-muted">Loading...</p> : policies.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-muted mb-6">No policies yet. Get your first coverage!</p>
                <Link href="/coverage" className="px-6 py-3 rounded-xl bg-accent text-ink font-bold">Browse Plans</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-syne font-bold">{p.policyNumber}</div>
                        <div className="text-muted text-sm mt-1">Premium: ₦{Number(p.premiumAmount).toLocaleString()}</div>
                        {p.startDate && <div className="text-muted text-xs mt-1">{new Date(p.startDate).toLocaleDateString()} → {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'}</div>}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: (statusColor[p.policyStatus] || '#8492B4') + '20', color: statusColor[p.policyStatus] || '#8492B4' }}>
                        {p.policyStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {active === 'claims' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-syne font-bold text-xl">Claims</h2>
              <Link href="/claims/new" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ New Claim</Link>
            </div>
            {loading ? <p className="text-muted">Loading...</p> : claims.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🛡️</div>
                <p className="text-muted">No claims yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map(c => (
                  <div key={c.id} className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex justify-between">
                      <div>
                        <div className="font-syne font-bold">{c.claimNumber}</div>
                        <div className="text-muted text-sm mt-1">{c.description?.substring(0, 80)}...</div>
                        <div className="text-muted text-xs mt-1">Amount: ₦{Number(c.claimAmount).toLocaleString()}</div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold h-fit" style={{ background: (statusColor[c.status] || '#8492B4') + '20', color: statusColor[c.status] || '#8492B4' }}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {active === 'payments' && (
          <div>
            <h2 className="font-syne font-bold text-xl mb-6">Payment History</h2>
            {loading ? <p className="text-muted">Loading...</p> : payments.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">💳</div>
                <p className="text-muted">No payment history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="p-5 rounded-2xl flex justify-between items-center" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                      <div className="font-semibold">{p.paymentReference}</div>
                      <div className="text-muted text-xs mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-syne font-bold">₦{Number(p.amount).toLocaleString()}</div>
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
  )
}
