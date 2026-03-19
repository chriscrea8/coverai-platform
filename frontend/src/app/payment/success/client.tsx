'use client'

import { api } from '@/lib/api'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

async function apiFetch(token: string, method: string, path: string) {
  // Uses axios api instance so JWT auto-refresh fires on 401
  const res = await api.request({ method: method as any, url: path })
  return res.data
}

type Stage = 'verifying' | 'success' | 'pending' | 'failed'

export default function PaymentSuccessClient() {
  const router = useRouter()
  const params = useSearchParams()
  const ref = params.get('reference') || params.get('trxref') || ''
  const policyId = params.get('policyId') || ''

  const [stage, setStage] = useState<Stage>('verifying')
  const [policy, setPolicy] = useState<any>(null)
  const [payment, setPayment] = useState<any>(null)
  const [error, setError] = useState('')
  const pollingRef = useRef<any>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth'); return }
    if (!ref) { router.push('/dashboard'); return }
    verifyPayment(token, ref)
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current) }
  }, [])

  async function verifyPayment(token: string, reference: string) {
    try {
      const res = await apiFetch(token, 'GET', `/payments/verify/${reference}`)
      const status = res.data?.status || res.status

      if (status === 'success' || status === 'successful') {
        setStage('success')
        // Load policy details if we have an ID or can find it from payments
        await loadPolicyDetails(token, reference)
      } else if (status === 'pending' || status === 'processing') {
        setStage('pending')
        // Poll for up to 2 minutes
        if (attemptsRef.current < 12) {
          attemptsRef.current++
          pollingRef.current = setTimeout(() => verifyPayment(token, reference), 10000)
        }
      } else {
        setStage('failed')
        setError('Payment could not be confirmed. If charged, contact support with reference: ' + reference)
      }
    } catch (e: any) {
      // Paystack sometimes returns 404 for fresh transactions — retry
      if (attemptsRef.current < 6) {
        attemptsRef.current++
        pollingRef.current = setTimeout(() => verifyPayment(token, reference), 5000)
      } else {
        setStage('failed')
        setError(e.message || 'Payment verification failed')
      }
    }
  }

  async function loadPolicyDetails(token: string, reference: string) {
    try {
      // First try: get all policies and find the most recent one
      const policiesRes = await apiFetch(token, 'GET', '/policies')
      const policies: any[] = policiesRes.data || policiesRes || []
      const recent = policies[0] // Most recent first
      if (recent) setPolicy(recent)

      // Also try to load payments to find policyId
      const paymentsRes = await apiFetch(token, 'GET', '/payments/history')
      const payments: any[] = paymentsRes.data || paymentsRes || []
      const thisPayment = payments.find((p: any) => p.paymentReference === reference)
      if (thisPayment) {
        setPayment(thisPayment)
        // Try getting specific policy by ID
        if (thisPayment.policyId) {
          try {
            const policyRes = await apiFetch(token, 'GET', `/policies/${thisPayment.policyId}`)
            setPolicy(policyRes.data || policyRes)
          } catch {}
        }
      }
    } catch {}
  }

  // Auto-redirect to dashboard after 8 seconds on success
  useEffect(() => {
    if (stage === 'success') {
      const t = setTimeout(() => router.push('/dashboard?highlight=new-policy'), 8000)
      return () => clearTimeout(t)
    }
  }, [stage])

  const nextPaymentDate = policy?.endDate
    ? new Date(new Date(policy.endDate).getTime() - 30 * 24 * 60 * 60 * 1000)
    : policy?.startDate
      ? new Date(new Date(policy.startDate).getTime() + 335 * 24 * 60 * 60 * 1000)
      : null

  if (stage === 'verifying') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
          style={{ background: 'rgba(26,58,143,.3)', border: '2px solid rgba(26,58,143,.6)' }}>
          <div className="w-7 h-7 border-3 border-accent border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
        </div>
        <h2 className="font-syne font-black text-xl mb-2">Confirming Payment</h2>
        <p className="text-muted text-sm">Verifying your transaction with Paystack…</p>
        {ref && <p className="text-muted text-xs mt-3 font-mono opacity-60">{ref}</p>}
      </div>
    </div>
  )

  if (stage === 'pending') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">⏳</div>
        <h2 className="font-syne font-black text-xl mb-2">Payment Processing</h2>
        <p className="text-muted text-sm mb-6">Your payment is being processed. This may take a moment.</p>
        <div className="flex gap-2 justify-center mb-6">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <p className="text-muted text-xs">Reference: <span className="font-mono text-white/60">{ref}</span></p>
        <p className="text-muted text-xs mt-2">Keep this page open — it will update automatically.</p>
      </div>
    </div>
  )

  if (stage === 'failed') return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--ink)' }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(232,69,69,.15)', border: '2px solid rgba(232,69,69,.4)' }}>
          <span className="text-2xl">✕</span>
        </div>
        <h2 className="font-syne font-black text-xl mb-2">Payment Issue</h2>
        <p className="text-muted text-sm mb-2">{error}</p>
        <p className="text-muted text-xs mb-6 font-mono opacity-60">{ref}</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--border)', color: '#fff' }}>Dashboard</Link>
          <Link href="mailto:support@coverai.ng" className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(232,69,69,.15)', color: 'var(--red)', border: '1px solid rgba(232,69,69,.3)' }}>
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )

  // SUCCESS STATE
  const planName = policy?.policyDetails?.planName || 'Insurance Policy'
  const coverType = policy?.policyDetails?.coverType || 'Business Cover'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--ink)' }}>
      {/* Confetti-like animated bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-full animate-bounce opacity-20"
            style={{
              left: `${8 + i * 8}%`, top: `${10 + (i % 3) * 15}%`,
              background: ['var(--green)','var(--accent)','#7C6BFF','var(--teal)'][i % 4],
              animationDelay: `${i * 0.3}s`, animationDuration: `${2 + i % 3}s`
            }} />
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="font-syne font-black text-xl block mb-6">Cover<span className="text-accent">AI</span></Link>

          {/* Success icon */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'var(--green)' }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(46,201,126,.15)', border: '2px solid rgba(46,201,126,.5)' }}>
              <span className="text-3xl">✓</span>
            </div>
          </div>

          <h1 className="font-syne font-black text-2xl md:text-3xl mb-2" style={{ color: 'var(--green)' }}>
            You're Covered! 🎉
          </h1>
          <p className="text-muted text-sm">
            Payment confirmed. Your policy is{' '}
            {policy?.policyStatus === 'active' ? (
              <span style={{ color: 'var(--green)' }}>active</span>
            ) : (
              <span style={{ color: 'var(--accent)' }}>being activated</span>
            )}.
          </p>
        </div>

        {/* Policy card */}
        <div className="rounded-2xl overflow-hidden mb-5" style={{ background: 'var(--glass-2)', border: '1px solid rgba(255,255,255,.1)' }}>
          {/* Card header */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, rgba(26,58,143,.6), rgba(0,194,168,.2))' }}>
            <div>
              <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-0.5">Your Policy</div>
              <div className="font-syne font-black text-lg">{planName}</div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: policy?.policyStatus === 'active' ? 'rgba(46,201,126,.2)' : 'rgba(244,166,35,.2)', color: policy?.policyStatus === 'active' ? 'var(--green)' : 'var(--accent)' }}>
              {policy?.policyStatus === 'active' ? '● Active' : '● Activating'}
            </span>
          </div>

          {/* Policy details grid */}
          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Policy Number', value: policy?.policyNumber || '—', mono: true },
              { label: 'Premium Paid', value: policy?.premiumAmount ? `₦${Number(policy.premiumAmount).toLocaleString()}` : payment?.amount ? `₦${Number(payment.amount).toLocaleString()}` : '—', highlight: true },
              { label: 'Coverage Amount', value: policy?.coverageAmount ? `₦${Number(policy.coverageAmount).toLocaleString()}` : 'As per policy' },
              { label: 'Payment Reference', value: ref ? ref.slice(0, 16) + '…' : '—', mono: true },
              { label: 'Coverage Start', value: policy?.startDate ? new Date(policy.startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today' },
              { label: 'Coverage Ends', value: policy?.endDate ? new Date(policy.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '1 Year' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                <div className="text-muted text-xs mb-1">{item.label}</div>
                <div className={`text-sm font-semibold ${item.mono ? 'font-mono text-xs' : ''}`}
                  style={item.highlight ? { color: 'var(--green)' } : {}}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Next steps */}
          <div className="px-5 pb-5">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(244,166,35,.08)', border: '1px solid rgba(244,166,35,.2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span>📅</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Renewal Reminder</span>
              </div>
              <p className="text-xs text-muted">
                Your policy renews on{' '}
                <strong className="text-white">
                  {nextPaymentDate
                    ? nextPaymentDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '365 days from today'}
                </strong>
                . We'll remind you 30 days before.
              </p>
            </div>
          </div>
        </div>

        {/* What's covered */}
        {policy?.policyDetails?.answers && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--glass-1)', border: '1px solid rgba(255,255,255,.07)' }}>
            <h3 className="font-syne font-bold text-sm mb-4">Your Coverage Profile</h3>
            <div className="space-y-2">
              {Object.values(policy.policyDetails.answers).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  <span className="text-white/80">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'var(--glass-1)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h3 className="font-syne font-bold text-sm mb-4">What Happens Next</h3>
          <div className="space-y-3">
            {[
              { icon: '📧', text: 'Policy documents sent to your email within 24 hours' },
              { icon: '✅', text: 'Your policy is now active — you\'re protected from today' },
              { icon: '📱', text: 'Download your policy certificate from the dashboard' },
              { icon: '🆘', text: 'In an emergency, file a claim directly from the dashboard' },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">{s.icon}</span>
                <span className="text-sm text-muted">{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3">
          <Link href="/dashboard?highlight=new-policy"
            className="flex-1 py-3.5 rounded-xl font-syne font-bold text-sm text-center transition-all hover:brightness-110"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            View Dashboard →
          </Link>
          <Link href="/claims/new"
            className="px-5 py-3.5 rounded-xl font-semibold text-sm text-center transition-all"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff' }}>
            File Claim
          </Link>
        </div>

        <p className="text-center text-muted text-xs mt-5">
          Redirecting to dashboard in a few seconds…
          <button onClick={() => router.push('/dashboard?highlight=new-policy')} className="text-accent ml-1 hover:underline">
            Go now
          </button>
        </p>
      </div>
    </div>
  )
}
