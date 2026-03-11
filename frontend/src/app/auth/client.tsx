'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

async function rawFetch(token: string, method: string, path: string, body?: any) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
}

function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const reason = params.get('reason') // 'idle' | 'expired'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'consumer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  // Post-registration email verification state
  const [verifyStage, setVerifyStage] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const { setAuth, isLoggedIn } = useAuthStore()

  useEffect(() => { if (isLoggedIn()) router.push('/dashboard') }, [])

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError('')
    if (mode === 'register') {
      if (!form.name.trim()) { setError('Full name is required'); return }
      if (!form.email.trim()) { setError('Email is required'); return }
      if (!form.phone.trim()) { setError('Phone number is required'); return }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    }
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form)
      const { user, accessToken, refreshToken } = res.data.data
      setAuth(user, accessToken, refreshToken)

      if (mode === 'register' && !user.emailVerified) {
        // Show email verification step before redirecting
        setVerifyToken(accessToken)
        setVerifyEmail(user.email)
        setVerifyStage(true)
        setResendCooldown(60)
      } else {
        router.push('/dashboard')
      }
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong. Please try again.')
    } finally { setLoading(false) }
  }

  const doVerify = async () => {
    if (otp.replace(/\D/g, '').length !== 6) { setError('Enter the 6-digit code from your email'); return }
    setVerifying(true); setError('')
    try {
      await rawFetch(verifyToken, 'POST', '/auth/verify-email', { otp })
      // Update stored user
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, emailVerified: true }))
      router.push('/dashboard?highlight=new-user')
    } catch (e: any) { setError(e.message || 'Invalid code. Please try again.') }
    setVerifying(false)
  }

  const doResend = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    try {
      await rawFetch(verifyToken, 'POST', '/auth/resend-otp')
      setResendCooldown(60)
      setError('')
    } catch (e: any) { setError(e.message || 'Could not resend code') }
    setResending(false)
  }

  const skipVerification = () => {
    router.push('/dashboard')
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-muted outline-none transition-all"
  const inputSty = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }

  // ── EMAIL VERIFICATION STAGE ──────────────────────────────
  if (verifyStage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26,58,143,0.3) 0%, transparent 70%), #0A0F1E' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link href="/" className="font-syne font-black text-2xl">Cover<span className="text-accent">AI</span></Link>
          </div>

          <div className="p-6 md:p-8 rounded-2xl" style={{ background: 'rgba(13,27,62,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(244,166,35,.15)', border: '2px solid rgba(244,166,35,.4)' }}>
                <span className="text-3xl">📧</span>
              </div>
              <h1 className="font-syne font-black text-xl mb-2">Verify Your Email</h1>
              <p className="text-muted text-sm">
                We sent a 6-digit code to{' '}
                <strong className="text-white">{verifyEmail}</strong>
              </p>
            </div>

            {/* OTP input */}
            <div className="mb-4">
              <input
                className="w-full px-4 py-4 rounded-xl text-center text-2xl font-mono tracking-widest text-white outline-none transition-all"
                style={{ background: 'rgba(255,255,255,.08)', border: `1px solid ${otp.length === 6 ? 'rgba(46,201,126,.6)' : 'rgba(255,255,255,.15)'}`, letterSpacing: '0.5em' }}
                maxLength={6}
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                placeholder="000000"
                autoFocus
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(232,69,69,.1)', border: '1px solid rgba(232,69,69,.2)' }}>
                {error}
              </div>
            )}

            <button onClick={doVerify} disabled={verifying || otp.length !== 6}
              className="w-full py-3.5 rounded-xl font-syne font-bold text-sm mb-3 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: '#2EC97E', color: '#0A0F1E' }}>
              {verifying && <Spinner />} Verify Email
            </button>

            <div className="flex items-center justify-between text-sm mb-4">
              <button onClick={doResend} disabled={resendCooldown > 0 || resending}
                className="text-muted hover:text-white transition-colors disabled:opacity-40 flex items-center gap-2">
                {resending && <Spinner />}
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button onClick={skipVerification} className="text-muted hover:text-white transition-colors text-xs">
                Skip for now →
              </button>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,.07)' }}>
              <p className="text-muted text-xs text-center">
                Didn't receive the email? Check your spam folder.<br />
                The code expires in 15 minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LOGIN / REGISTER FORM ─────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26,58,143,0.3) 0%, transparent 70%), #0A0F1E' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="font-syne font-black text-2xl">Cover<span className="text-accent">AI</span></Link>
          <p className="text-muted text-sm mt-2">
            {mode === 'login' ? 'Welcome back to CoverAI' : 'Start protecting what matters most'}
          </p>
        </div>

        {/* Session expired / idle banner */}
        {reason && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2.5 text-sm"
            style={{ background: 'rgba(244,166,35,.08)', border: '1px solid rgba(244,166,35,.25)' }}>
            <span>⏱</span>
            <p style={{ color: '#F4A623' }}>
              {reason === 'idle'
                ? 'You were signed out due to inactivity. Please sign in again.'
                : 'Your session has expired. Please sign in again.'}
            </p>
          </div>
        )}

        <div className="p-5 md:p-8 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Mode tabs */}
          <div className="flex rounded-xl p-1 mb-6" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'text-white' : 'text-muted'}`}
                style={mode === m ? { background: '#1A3A8F' } : {}}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Full Name</label>
                  <input className={inputCls} style={inputSty}
                    placeholder="Chioma Okonkwo" value={form.name} onChange={e => set('name', e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Phone Number</label>
                  <input className={inputCls} style={inputSty} type="tel"
                    placeholder="+2348012345678" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Account Type</label>
                  <select className={inputCls} style={{ background: 'rgba(13,27,62,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
                    value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="consumer">Individual Consumer</option>
                    <option value="sme_owner">SME Business Owner</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
              <input className={inputCls} type="email" style={inputSty}
                placeholder="you@example.ng" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input className={inputCls} type={showPass ? 'text' : 'password'} style={{ ...inputSty, paddingRight: '2.5rem' }}
                  placeholder={mode === 'register' ? 'Min 8 chars, uppercase + number' : 'Your password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors text-xs">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-muted text-xs mt-1.5">Must contain uppercase, lowercase, and at least one number</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)' }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl font-syne font-bold text-ink transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: '#F4A623', boxShadow: '0 8px 24px rgba(244,166,35,0.25)' }}>
            {loading && <Spinner />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {mode === 'login' && (
            <div className="text-center mt-4">
              <Link href="/auth/forgot-password" className="text-muted text-sm hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
          )}

          {mode === 'register' && (
            <p className="text-center text-muted text-xs mt-4">
              By registering, you agree to our{' '}
              <Link href="/legal/terms" className="text-accent hover:underline">Terms</Link> and{' '}
              <Link href="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
              Your data is protected under NDPR.
            </p>
          )}
        </div>

        <p className="text-center text-muted text-sm mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-accent hover:underline font-semibold">
            {mode === 'login' ? 'Register free' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="text-muted text-sm">Loading…</div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm />
    </Suspense>
  )
}
