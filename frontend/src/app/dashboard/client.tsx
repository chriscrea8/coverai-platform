'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { policiesApi, claimsApi, paymentsApi } from '@/lib/api'
import { useAuthStore, hydrateAuth } from '@/lib/store'
import { Suspense } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// Idle timeout: show warning after 20 min of no activity, sign out after 60s
const IDLE_TIMEOUT_MS = 20 * 60 * 1000
const COUNTDOWN_SECONDS = 60
async function apiFetch(token: string, path: string) {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return null
  return data?.data ?? data
}

const NAV_ITEMS = [
  { id: 'overview',  icon: '📊', label: 'Overview'       },
  { id: 'policies',  icon: '📋', label: 'My Policies'    },
  { id: 'claims',    icon: '🛡️', label: 'Claims'         },
  { id: 'payments',  icon: '💳', label: 'Payments'       },
  { id: 'recommended', icon: '✨', label: 'For You'      },
]

const STATUS_COLOR: Record<string, string> = {
  active: '#2EC97E', pending: '#F4A623', expired: '#E84545', lapsed: '#E84545', cancelled: '#E84545',
  submitted: '#F4A623', approved: '#2EC97E', rejected: '#E84545', under_review: '#7C6BFF',
  successful: '#2EC97E', failed: '#E84545',
}

function Badge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || '#8492B4'
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold capitalize"
      style={{ background: c + '20', color: c, border: `1px solid ${c}40` }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function DashboardInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, clearAuth, isLoggedIn } = useAuthStore()
  const [active, setActive] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [policies, setPolicies] = useState<any[]>([])
  const [claims, setClaims]     = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [highlightPolicy, setHighlightPolicy] = useState(false)
  const [dismissedVerification, setDismissedVerification] = useState(false)

  // ── Session idle timeout ───────────────────────────────────
  const [idleWarning, setIdleWarning] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Notifications ─────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const data = await apiFetch(token, '/notifications')
      // API returns plain array of notifications
      const list = Array.isArray(data) ? data : (data?.notifications || [])
      setNotifications(list)
      setUnreadCount(list.filter((n: any) => n.status === 'sent' && n.type === 'in_app').length)
    } catch {}
  }, [])

  const markRead = async (id: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString(), status: 'read' } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    await fetch(`${API}/notifications/mark-all-read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString(), status: 'read' })))
    setUnreadCount(0)
  }

  function notifIcon(n: any) {
    if (n.entityType === 'policy')  return n.title.includes('Active') ? '✅' : '📋'
    if (n.entityType === 'claim')   return n.title.includes('Approved') ? '✅' : n.title.includes('Rejected') ? '❌' : '🛡️'
    if (n.entityType === 'payment') return '💳'
    return '🔔'
  }

  function timeAgo(date: string) {
    const diff = (Date.now() - new Date(date).getTime()) / 1000
    if (diff < 60)   return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }


  useEffect(() => {
    hydrateAuth()
    if (!isLoggedIn()) { router.push('/auth'); return }
    // If coming from a successful purchase, highlight policies tab
    if (params.get('highlight') === 'new-policy') {
      setHighlightPolicy(true)
      setActive('policies')
      window.history.replaceState({}, '', '/dashboard')
    }
    loadData()
    loadNotifications()
    // Poll for new notifications every 30s
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, c, pay] = await Promise.allSettled([
        policiesApi.getAll(), claimsApi.getAll(), paymentsApi.getHistory(),
      ])
      if (p.status === 'fulfilled') setPolicies(p.value.data.data || p.value.data || [])
      if (c.status === 'fulfilled') setClaims(c.value.data.data || c.value.data || [])
      if (pay.status === 'fulfilled') setPayments(pay.value.data.data || pay.value.data || [])
    } catch {}
    setLoading(false)
    // Load recommendations async (non-blocking)
    const token = localStorage.getItem('access_token')
    if (token) {
      apiFetch(token, '/recommendations').then(data => {
        if (Array.isArray(data)) setRecommendations(data)
      }).catch(() => {})
    }
  }

  const logout = () => {
    clearAuth()
    router.push('/auth')
  }

  // ── Idle session management ────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setIdleWarning(false)
    setCountdown(COUNTDOWN_SECONDS)
    idleTimerRef.current = setTimeout(() => {
      setIdleWarning(true)
      setCountdown(COUNTDOWN_SECONDS)
      let remaining = COUNTDOWN_SECONDS
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1
        setCountdown(remaining)
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!)
          clearAuth()
          router.push('/auth?reason=idle')
        }
      }, 1000)
    }, IDLE_TIMEOUT_MS)
  }, [clearAuth, router])

  const stayActive = () => resetIdleTimer()

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    const handler = () => { if (!idleWarning) resetIdleTimer() }
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    resetIdleTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [idleWarning, resetIdleTimer])

  const navigate = (id: string) => { setActive(id); setMenuOpen(false) }

  const kpis = [
    { label: 'Active Policies', value: policies.filter(p => p.policyStatus === 'active').length, icon: '📋', tab: 'policies' },
    { label: 'Open Claims',     value: claims.filter(c => ['submitted','under_review'].includes(c.status)).length, icon: '🛡️', tab: 'claims' },
    { label: 'Total Paid',      value: `₦${payments.filter(p => p.paymentStatus === 'successful').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`, icon: '💳', tab: 'payments' },
    { label: 'Total Policies',  value: policies.length, icon: '📊', tab: 'policies' },
  ]

  const showVerificationBanner = user && !(user as any).emailVerified && !dismissedVerification

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080D1A' }}>

      {/* ── Idle Session Warning Modal ── */}
      {idleWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl"
            style={{ background: 'rgba(10,18,40,.98)', border: '1px solid rgba(255,255,255,.12)' }}>
            {/* Countdown ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
                <circle cx="48" cy="48" r="42" fill="none"
                  stroke={countdown <= 10 ? '#E84545' : '#F4A623'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - countdown / COUNTDOWN_SECONDS)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-syne font-black text-2xl" style={{ color: countdown <= 10 ? '#E84545' : '#F4A623' }}>
                  {countdown}
                </span>
                <span className="text-xs text-muted">sec</span>
              </div>
            </div>

            <h2 className="font-syne font-black text-xl mb-2">Are you still there?</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              You've been inactive for a while. For your security, you'll be signed out in <span style={{ color: countdown <= 10 ? '#E84545' : '#F4A623' }} className="font-bold">{countdown} second{countdown !== 1 ? 's' : ''}</span> unless you continue.
            </p>

            <div className="flex gap-3">
              <button onClick={() => { logout() }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted transition-all hover:text-red-400"
                style={{ background: 'rgba(255,255,255,.05)' }}>
                Sign Out
              </button>
              <button onClick={stayActive}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                style={{ background: '#F4A623', color: '#0A0F1E' }}>
                Yes, I'm here →
              </button>
            </div>
          </div>
        </div>
      )}


      <header className="flex items-center justify-between px-4 py-3 md:hidden sticky top-0 z-40"
        style={{ background: 'rgba(13,27,62,.97)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <Link href="/" className="font-syne font-black text-lg">Cover<span className="text-accent">AI</span></Link>
        <div className="flex items-center gap-2">
          {/* Bell */}
          <button onClick={() => { setNotifOpen(o => !o); setMenuOpen(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,.06)' }}>
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-xs font-bold flex items-center justify-center"
                style={{ background: '#E84545', color: '#fff', fontSize: '10px' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <Link href="/settings" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,.06)' }}>⚙️</Link>
          <button onClick={() => setMenuOpen(o => !o)} className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,.06)' }}>
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* ── Mobile slide-down menu ── */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 top-[52px]" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setMenuOpen(false)}>
          <div className="px-4 pt-2 pb-4" style={{ background: 'rgba(13,27,62,.99)' }} onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(m => (
              <button key={m.id} onClick={() => navigate(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 text-left transition-all ${active === m.id ? 'text-white' : 'text-muted'}`}
                style={active === m.id ? { background: 'rgba(26,58,143,.4)' } : {}}>
                <span className="text-base">{m.icon}</span>{m.label}
              </button>
            ))}
            <div className="border-t border-white/5 my-2" />
            <Link href="/chat" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>🤖</span>AI Assistant
            </Link>
            <Link href="/learn" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>📚</span>Learn Insurance
            </Link>
            <Link href="/compare" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>📊</span>Compare Products
            </Link>
            <Link href="/claims/new" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>⚡</span>New Claim
            </Link>
            <Link href="/settings" onClick={() => setMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted hover:text-white">
              <span>⚙️</span>Settings
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
          style={{ background: 'rgba(13,27,62,.95)', borderRight: '1px solid rgba(255,255,255,.07)' }}>
          <Link href="/" className="font-syne font-black text-xl px-2 mb-8">Cover<span className="text-accent">AI</span></Link>
          <nav className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map(m => (
              <button key={m.id} onClick={() => setActive(m.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all ${active === m.id ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
                style={active === m.id ? { background: 'rgba(26,58,143,.4)' } : {}}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
            <div className="my-2 border-t border-white/5" />
            <Link href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>🤖</span>AI Assistant
            </Link>
            <Link href="/learn" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>📚</span>Learn Insurance
            </Link>
            <Link href="/compare" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>📊</span>Compare Products
            </Link>
            <Link href="/claims/new" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>⚡</span>New Claim
            </Link>
            <Link href="/coverage" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>🛒</span>Get Coverage
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-400/10 transition-all mt-2"
                style={{ border: '1px solid rgba(232,69,69,.2)' }}>
                <span>🔐</span>Admin Panel
              </Link>
            )}
          </nav>
          <div className="border-t border-white/5 pt-3 space-y-0.5">
            {/* Notifications bell */}
            <button onClick={() => setNotifOpen(o => !o)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white hover:bg-white/5 transition-all w-full text-left relative">
              <span>🔔</span>Notifications
              {unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ background: '#E84545', color: '#fff' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <Link href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-white hover:bg-white/5 transition-all">
              <span>⚙️</span>Settings
            </Link>
            <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted hover:text-red-400 transition-all w-full text-left">
              <span>🚪</span>Sign Out
            </button>
          </div>
        </aside>

        {/* ── Notification Panel ── */}
        {notifOpen && (
          <div className="fixed inset-0 z-50 flex" onClick={() => setNotifOpen(false)}>
            <div className="ml-auto w-full max-w-sm h-full flex flex-col shadow-2xl"
              style={{ background: 'rgba(10,18,40,.98)', borderLeft: '1px solid rgba(255,255,255,.1)' }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div>
                  <h2 className="font-syne font-bold text-base">Notifications</h2>
                  {unreadCount > 0 && <p className="text-xs text-muted mt-0.5">{unreadCount} unread</p>}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110"
                      style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623', border: '1px solid rgba(244,166,35,.3)' }}>
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-white"
                    style={{ background: 'rgba(255,255,255,.06)' }}>✕</button>
                </div>
              </div>
              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="text-4xl mb-3">🔔</div>
                    <p className="font-semibold text-sm mb-1">All caught up!</p>
                    <p className="text-muted text-xs">Notifications about your policies, claims and payments will appear here.</p>
                  </div>
                ) : notifications.map(n => (
                  <div key={n.id}
                    onClick={() => !n.readAt && markRead(n.id)}
                    className="px-5 py-4 cursor-pointer transition-all hover:bg-white/5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,.05)', background: n.readAt ? 'transparent' : 'rgba(26,58,143,.15)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{notifIcon(n)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className={`text-sm font-semibold truncate ${n.readAt ? 'text-muted' : 'text-white'}`}>{n.title}</p>
                          {!n.readAt && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#F4A623' }} />}
                        </div>
                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,.3)' }}>{n.createdAt ? timeAgo(n.createdAt) : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        <main className="flex-1 p-4 md:p-8 overflow-auto min-w-0">

          {/* Email verification banner */}
          {showVerificationBanner && (
            <div className="mb-5 p-4 rounded-2xl flex items-start gap-4 relative"
              style={{ background: 'rgba(244,166,35,.08)', border: '1px solid rgba(244,166,35,.25)' }}>
              <span className="text-xl shrink-0">📧</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-0.5">Verify your email to unlock all features</div>
                <p className="text-muted text-xs">Purchasing policies, filing claims, and receiving notifications requires a verified email.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/settings?tab=security"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold hover:brightness-110 transition-all"
                  style={{ background: '#F4A623', color: '#0A0F1E' }}>
                  Verify Now
                </Link>
                <button onClick={() => setDismissedVerification(true)}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,.08)' }}>✕</button>
              </div>
            </div>
          )}

          {/* Newly purchased policy banner */}
          {highlightPolicy && policies.length > 0 && (
            <div className="mb-5 p-4 rounded-2xl flex items-start gap-4 relative"
              style={{ background: 'rgba(46,201,126,.08)', border: '1px solid rgba(46,201,126,.3)' }}>
              <span className="text-2xl shrink-0">🎉</span>
              <div className="flex-1 min-w-0">
                <div className="font-syne font-bold text-sm mb-0.5" style={{ color: '#2EC97E' }}>Your new policy is live!</div>
                <p className="text-muted text-xs">
                  <strong className="text-white">{policies[0]?.policyNumber}</strong> is now{' '}
                  <span style={{ color: '#2EC97E' }}>active</span> and protecting your business.
                  Policy documents will be sent to your email within 24 hours.
                </p>
              </div>
              <button onClick={() => setHighlightPolicy(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-white transition-all shrink-0"
                style={{ background: 'rgba(255,255,255,.08)' }}>✕</button>
            </div>
          )}

          <div className="mb-6">
            <h1 className="font-syne font-black text-xl md:text-2xl">Good day, {user?.name?.split(' ')[0] || 'there'} 👋</h1>
            <p className="text-muted text-sm mt-1">Here's your insurance overview</p>
          </div>

          {/* ── Overview ── */}
          {active === 'overview' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {kpis.map(k => (
                  <button key={k.label} onClick={() => setActive(k.tab)}
                    className="p-4 md:p-5 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:brightness-110"
                    style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                    <div className="text-xl mb-2">{k.icon}</div>
                    <div className="font-syne font-black text-xl">{loading ? '—' : k.value}</div>
                    <div className="text-muted text-xs mt-1 uppercase tracking-wider font-semibold leading-tight">{k.label}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-syne font-bold">📋 Recent Policies</h3>
                    <button onClick={() => setActive('policies')} className="text-xs text-accent hover:underline">View all</button>
                  </div>
                  {policies.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted text-sm mb-4">No policies yet</p>
                      <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold inline-block">Get Coverage</Link>
                    </div>
                  ) : policies.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{p.policyNumber}</div>
                        <div className="text-muted text-xs mt-0.5 truncate">
                          {p.policyDetails?.planName || 'Insurance Policy'} ·{' '}
                          {p.paymentFrequency && p.paymentFrequency !== 'annually'
                            ? `₦${Number(p.installmentAmount || p.premiumAmount).toLocaleString()}/${p.paymentFrequency === 'weekly' ? 'wk' : p.paymentFrequency === 'monthly' ? 'mo' : 'qtr'}`
                            : `₦${Number(p.premiumAmount).toLocaleString()}/yr`}
                        </div>
                        {p.policyStatus === 'lapsed' && (
                          <div className="text-xs font-semibold mt-0.5" style={{ color: '#E84545' }}>⚠ Lapsed — tap to reactivate</div>
                        )}
                        {p.policyStatus === 'active' && p.nextPaymentDate && (
                          <div className="text-xs mt-0.5" style={{ color: '#F4A623' }}>
                            Next: {new Date(p.nextPaymentDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                      <Badge status={p.policyStatus} />
                    </div>
                  ))}
                </div>

                <div className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-syne font-bold">🛡️ Recent Claims</h3>
                    <button onClick={() => setActive('claims')} className="text-xs text-accent hover:underline">View all</button>
                  </div>
                  {claims.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted text-sm mb-4">No claims yet</p>
                      <Link href="/claims/new" className="px-4 py-2 rounded-xl text-sm font-bold inline-block"
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)' }}>
                        Submit Claim
                      </Link>
                    </div>
                  ) : claims.slice(0, 4).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{c.claimNumber}</div>
                        <div className="text-muted text-xs mt-0.5">₦{Number(c.claimAmount).toLocaleString()}</div>
                      </div>
                      <Badge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:hidden">
                <Link href="/coverage" className="py-3 rounded-xl bg-accent text-ink text-sm font-bold text-center">Get Coverage</Link>
                <Link href="/claims/new" className="py-3 rounded-xl text-white text-sm font-bold text-center"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)' }}>New Claim</Link>
              </div>
            </>
          )}

          {/* ── Policies ── */}
          {active === 'policies' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-syne font-bold text-lg md:text-xl">My Policies</h2>
                <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ Get Coverage</Link>
              </div>
              {loading ? <p className="text-muted">Loading…</p> : policies.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-muted mb-6">No policies yet. Get your first coverage!</p>
                  <Link href="/coverage" className="px-6 py-3 rounded-xl bg-accent text-ink font-bold inline-block">Browse Plans</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {policies.map((p, i) => {
                    const isNew = highlightPolicy && i === 0
                    const isInstallment = p.paymentFrequency && p.paymentFrequency !== 'annually'
                    const isLapsed = p.policyStatus === 'lapsed'
                    const isPending = p.policyStatus === 'pending'
                    const freqLabel = { weekly: 'week', monthly: 'month', quarterly: 'quarter', annually: 'year' }[p.paymentFrequency] || 'year'
                    const nextDue = p.nextPaymentDate ? new Date(p.nextPaymentDate) : null
                    const daysUntilNext = nextDue ? Math.ceil((nextDue.getTime() - Date.now()) / (24*60*60*1000)) : null
                    const isDueSoon = daysUntilNext !== null && daysUntilNext <= 3 && daysUntilNext >= 0
                    const graceEnd = p.gracePeriodEnd ? new Date(p.gracePeriodEnd) : null
                    const inGrace = graceEnd && nextDue && new Date() > nextDue && new Date() < graceEnd

                    return (
                      <div key={p.id} className="p-5 rounded-2xl transition-all"
                        style={{
                          background: 'rgba(13,27,62,.8)',
                          border: isLapsed ? '1px solid rgba(232,69,69,.3)' : isNew ? '1px solid rgba(46,201,126,.4)' : '1px solid rgba(255,255,255,.07)',
                          boxShadow: isNew ? '0 0 20px rgba(46,201,126,.1)' : 'none'
                        }}>
                        {isNew && (
                          <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#2EC97E' }}>
                            ✦ New — Just Purchased
                          </div>
                        )}
                        <div className="flex justify-between items-start gap-3 mb-4">
                          <div className="min-w-0">
                            <div className="font-syne font-bold text-base truncate">{p.policyNumber}</div>
                            <div className="text-muted text-sm mt-0.5 flex items-center gap-2">
                              {p.policyDetails?.planName || 'Insurance Policy'}
                              {isInstallment && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ background: 'rgba(0,194,168,.12)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.2)' }}>
                                  Microinsurance
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge status={p.policyStatus} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          {[
                            {
                              label: isInstallment ? `${p.policyDetails?.frequencyLabel || 'Payment'}` : 'Annual Premium',
                              value: `₦${Number(p.installmentAmount || p.premiumAmount).toLocaleString()}${isInstallment ? `/${freqLabel}` : ''}`
                            },
                            { label: 'Coverage', value: p.coverageAmount ? `₦${Number(p.coverageAmount).toLocaleString()}` : 'As agreed' },
                            { label: 'Start Date', value: p.startDate ? new Date(p.startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today' },
                            { label: 'Covered Until', value: p.endDate ? new Date(p.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '1 Year' },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                              <div className="text-muted text-xs mb-0.5">{item.label}</div>
                              <div className="font-semibold text-sm">{item.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Installment progress bar */}
                        {isInstallment && p.paymentsTotal > 1 && (
                          <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-muted">Installment progress</span>
                              <span className="font-semibold">{p.paymentsMade} / {p.paymentsTotal} payments</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
                              <div className="h-full rounded-full transition-all" style={{
                                width: `${Math.min((Number(p.paymentsMade) / Number(p.paymentsTotal)) * 100, 100)}%`,
                                background: isLapsed ? '#E84545' : '#2EC97E',
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Next payment banner */}
                        {p.policyStatus === 'active' && nextDue && isInstallment && (
                          <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                            style={{
                              background: isDueSoon ? 'rgba(244,166,35,.1)' : 'rgba(255,255,255,.04)',
                              border: isDueSoon ? '1px solid rgba(244,166,35,.3)' : '1px solid rgba(255,255,255,.06)',
                            }}>
                            <span className="text-sm">{isDueSoon ? '⏰' : '📅'}</span>
                            <div className="text-xs">
                              <span className="text-muted">Next payment: </span>
                              <strong style={{ color: isDueSoon ? '#F4A623' : '#fff' }}>
                                {nextDue.toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}
                              </strong>
                              {daysUntilNext === 0 && <span style={{ color: '#E84545' }}> — Due today!</span>}
                              {daysUntilNext > 0 && <span className="text-muted"> ({daysUntilNext} days)</span>}
                            </div>
                          </div>
                        )}

                        {/* In grace period warning */}
                        {inGrace && (
                          <div className="flex items-center gap-2 p-3 rounded-xl mb-4"
                            style={{ background: 'rgba(232,69,69,.08)', border: '1px solid rgba(232,69,69,.25)' }}>
                            <span className="text-sm">⚠️</span>
                            <div className="text-xs">
                              <span className="font-semibold text-red-400">Payment overdue — in grace period. </span>
                              <span className="text-muted">Coverage continues until {graceEnd!.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}. Pay now to avoid lapse.</span>
                            </div>
                          </div>
                        )}

                        {/* Lapsed banner */}
                        {isLapsed && (
                          <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(232,69,69,.08)', border: '1px solid rgba(232,69,69,.25)' }}>
                            <p className="text-sm font-semibold mb-1" style={{ color: '#E84545' }}>⚠️ Coverage Paused — Policy Lapsed</p>
                            <p className="text-xs text-muted">Your policy lapsed due to a missed payment. You are not currently covered. Make a payment of <strong className="text-white">₦{Number(p.installmentAmount || p.premiumAmount).toLocaleString()}</strong> to reactivate immediately.</p>
                          </div>
                        )}

                        {p.policyDetails?.answers && (
                          <div className="flex gap-2 flex-wrap mb-4">
                            {Object.values(p.policyDetails.answers).map((a: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                                style={{ background: 'rgba(0,194,168,.1)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.2)' }}>
                                {a}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {isPending && (
                            <Link href="/dashboard?tab=payments"
                              className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: '#F4A623', color: '#0A0F1E' }}>
                              Complete Payment
                            </Link>
                          )}
                          {isLapsed && (
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('access_token')
                                  const r = await fetch(`${API}/policies/${p.id}/reactivate`, {
                                    method: 'POST', headers: { Authorization: `Bearer ${token}` }
                                  })
                                  const d = await r.json()
                                  const payAmount = d.data?.paymentAmount || d.paymentAmount || Number(p.installmentAmount || p.premiumAmount)
                                  const payR = await fetch(`${API}/payments/create`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ policyId: p.id, amount: payAmount, callbackUrl: `${window.location.origin}/payment/success` })
                                  })
                                  const payD = await payR.json()
                                  const url = payD.data?.authorizationUrl || payD.authorizationUrl
                                  if (url) window.location.href = url
                                } catch { alert('Could not initiate reactivation. Please try again.') }
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: '#E84545', color: '#fff' }}>
                              🔄 Reactivate Coverage
                            </button>
                          )}
                          {(inGrace || (isInstallment && p.policyStatus === 'active' && daysUntilNext !== null && daysUntilNext <= 7)) && (
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('access_token')
                                  const payR = await fetch(`${API}/payments/create`, {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ policyId: p.id, amount: Number(p.installmentAmount || p.premiumAmount), callbackUrl: `${window.location.origin}/payment/success` })
                                  })
                                  const payD = await payR.json()
                                  const url = payD.data?.authorizationUrl || payD.authorizationUrl
                                  if (url) window.location.href = url
                                } catch { alert('Could not initiate payment. Please try again.') }
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                              style={{ background: '#F4A623', color: '#0A0F1E' }}>
                              💳 Pay Now
                            </button>
                          )}
                          {p.documentUrl && (
                            <a href={p.documentUrl} target="_blank" rel="noopener noreferrer"
                              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                              style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff' }}>
                              📄 Policy Doc
                            </a>
                          )}
                          <Link href="/claims/new"
                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff' }}>
                            File Claim
                          </Link>
                        </div>

                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Claims ── */}
          {active === 'claims' && (
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-syne font-bold text-lg md:text-xl">My Claims</h2>
                <Link href="/claims/new" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">+ New Claim</Link>
              </div>
              {loading ? <p className="text-muted">Loading…</p> : claims.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">🛡️</div>
                  <p className="text-muted mb-6">No claims submitted yet.</p>
                  <Link href="/claims/new" className="px-6 py-3 rounded-xl font-bold inline-block"
                    style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)' }}>
                    Submit a Claim
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {claims.map(c => (
                    <div key={c.id} className="p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                      <div className="flex justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="font-syne font-bold truncate">{c.claimNumber}</div>
                          <div className="text-muted text-sm mt-0.5 line-clamp-1">{c.description?.substring(0, 80)}</div>
                        </div>
                        <Badge status={c.status} />
                      </div>
                      <div className="flex gap-4 text-xs text-muted">
                        <span>Amount: <strong className="text-white">₦{Number(c.claimAmount).toLocaleString()}</strong></span>
                        {c.incidentDate && <span>Incident: <strong className="text-white">{new Date(c.incidentDate).toLocaleDateString('en-NG')}</strong></span>}
                        {c.reviewerNotes && <span className="line-clamp-1">Note: {c.reviewerNotes}</span>}
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
              <h2 className="font-syne font-bold text-lg md:text-xl mb-5">Payment History</h2>
              {loading ? <p className="text-muted">Loading…</p> : payments.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-muted">No payment history yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => {
                    const isPending = p.paymentStatus === 'pending'
                    return (
                      <div key={p.id} className="p-4 rounded-2xl"
                        style={{ background: 'rgba(13,27,62,.8)', border: `1px solid ${isPending ? 'rgba(244,166,35,.25)' : 'rgba(255,255,255,.07)'}` }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm font-mono truncate">{p.paymentReference}</div>
                            <div className="text-muted text-xs mt-0.5">{new Date(p.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-syne font-bold">₦{Number(p.amount).toLocaleString()}</div>
                            <Badge status={p.paymentStatus} />
                          </div>
                        </div>

                        {/* Actions for pending payments */}
                        {isPending && (
                          <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                            <p className="text-xs text-muted flex-1 self-center">This payment was not completed.</p>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this pending payment?')) return
                                try {
                                  await paymentsApi.deletePending(p.id)
                                  setPayments(prev => prev.filter(x => x.id !== p.id))
                                } catch (e: any) {
                                  alert(e.response?.data?.message || 'Could not delete payment')
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                              style={{ background: 'rgba(232,69,69,.15)', color: '#E84545', border: '1px solid rgba(232,69,69,.3)' }}>
                              🗑 Delete
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await paymentsApi.retry(p.id)
                                  const url = res.data?.data?.authorizationUrl || res.data?.authorizationUrl
                                  if (url) {
                                    // Remove old pending record from list — new one will appear after success
                                    setPayments(prev => prev.filter(x => x.id !== p.id))
                                    window.location.href = url
                                  } else {
                                    alert('Could not get payment link. Please try again.')
                                  }
                                } catch (e: any) {
                                  alert(e.response?.data?.message || 'Could not retry payment')
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                              style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623', border: '1px solid rgba(244,166,35,.3)' }}>
                              ↺ Retry
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Recommended For You ── */}
          {active === 'recommended' && (
            <div>
              <div className="mb-5">
                <h2 className="font-syne font-black text-xl md:text-2xl">Recommended For You ✨</h2>
                <p className="text-muted text-sm mt-1">AI-powered suggestions based on your profile and similar users</p>
              </div>

              {recommendations.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">✨</div>
                  <p className="text-muted mb-4">Building your personalised recommendations…</p>
                  <Link href="/coverage" className="px-5 py-2.5 rounded-xl bg-accent text-ink text-sm font-bold inline-block">Browse All Plans</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((r: any, i: number) => (
                    <div key={r.product?.id || i} className="p-5 rounded-2xl"
                      style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
                      <div className="flex flex-wrap justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-syne font-bold">{r.product?.name || r.product?.productName}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs capitalize"
                              style={{ background: 'rgba(0,194,168,.1)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.2)' }}>
                              {r.product?.productType || r.product?.category}
                            </span>
                            {r.matchType === 'collaborative' && (
                              <span className="px-2 py-0.5 rounded-full text-xs"
                                style={{ background: 'rgba(124,107,255,.1)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,.2)' }}>
                                👥 Popular
                              </span>
                            )}
                          </div>
                          <p className="text-muted text-sm line-clamp-2">{r.product?.description}</p>
                        </div>
                      </div>

                      {/* AI reason */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3"
                        style={{ background: 'rgba(244,166,35,.08)', border: '1px solid rgba(244,166,35,.2)' }}>
                        <span className="text-sm">✨</span>
                        <span className="text-xs" style={{ color: '#F4A623' }}>{r.reason}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-4 text-xs text-muted">
                          {r.estimatedPremium?.min > 0 && (
                            <span>From <strong className="text-accent">₦{Number(r.estimatedPremium.min).toLocaleString()}</strong>/yr</span>
                          )}
                          {r.processingFee > 0 && (
                            <span>Processing fee: <strong className="text-white">₦{Number(r.processingFee).toLocaleString()}</strong></span>
                          )}
                          <span>Score: <strong className="text-white">{r.score}</strong></span>
                        </div>
                        <Link href={`/coverage?product=${r.product?.id}`}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
                          style={{ background: '#F4A623', color: '#0A0F1E' }}>
                          Get Quote →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 rounded-2xl" style={{ background: 'rgba(13,27,62,.6)', border: '1px solid rgba(255,255,255,.06)' }}>
                <p className="text-muted text-xs text-center">
                  Recommendations improve as you use CoverAI. A small processing fee (₦500–₦2,000) applies to AI-assisted purchases.{' '}
                  <Link href="/legal/terms" className="text-accent hover:underline">Learn more</Link>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background: 'rgba(13,27,62,.98)', borderTop: '1px solid rgba(255,255,255,.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.map(m => (
          <button key={m.id} onClick={() => setActive(m.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-all ${active === m.id ? 'text-accent' : 'text-muted'}`}>
            <span className="text-lg">{m.icon}</span>
            <span className="text-[10px]">{m.label}</span>
          </button>
        ))}
        <Link href="/chat" className="flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium text-muted">
          <span className="text-lg">🤖</span>
          <span className="text-[10px]">AI Chat</span>
        </Link>
      </nav>
      <div className="md:hidden h-16" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080D1A' }}>
        <div className="text-muted text-sm">Loading…</div>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  )
}
