'use client'
import React, { Suspense, useState, useEffect } from 'react'
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
  const reason = params.get('reason')
  const refCode = params.get('ref') || ''

  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referralCode: refCode })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  // OTP flow
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const res = await authApi.login({ email: form.email, password: form.password })
        const d = res.data?.data || res.data
        if (d?.accessToken) {
          if (d.user) setAuth(d.user, d.accessToken, d.refreshToken)
          else setAuth({ id: '', name: '', email: form.email } as any, d.accessToken, d.refreshToken)
          router.push('/dashboard')
        } else {
          setError('Login failed — please check your credentials.')
        }
      } else {
        const res = await authApi.register({
          name: form.name, email: form.email,
          phone: form.phone, password: form.password,
          referralCode: form.referralCode || undefined,
        })
        const d = res.data?.data || res.data
        if (d?.requiresOtp || d?.otpToken) {
          setOtpToken(d.otpToken || d.tempToken || '')
          setOtpSent(true)
        } else if (d?.accessToken) {
          if (d.user) setAuth(d.user, d.accessToken, d.refreshToken)
          else setAuth({ id: '', name: '', email: form.email } as any, d.accessToken, d.refreshToken)
          router.push('/dashboard')
        } else {
          setOtpSent(true)
        }
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Something went wrong'
      setError(Array.isArray(msg) ? msg.join('. ') : msg)
    }
    setLoading(false)
  }

  const handleOtp = async () => {
    setError('')
    setOtpLoading(true)
    try {
      const res = await authApi.verifyEmail(otp)
      const d = res.data?.data || res.data
      if (d?.accessToken) {
        if (d.user) setAuth(d.user, d.accessToken, d.refreshToken)
        else setAuth({ id: '', name: '', email: form.email } as any, d.accessToken, d.refreshToken)
        router.push('/dashboard')
      } else {
        setError('Invalid OTP — please try again.')
      }
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || 'OTP verification failed')
    }
    setOtpLoading(false)
  }

  // OTP verification screen
  if (otpSent) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal-dim)', border: '1px solid var(--border-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>
        📧
      </div>
      <h2 className="font-syne" style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Check your email</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
        We sent a 6-digit code to <strong style={{ color: '#fff' }}>{form.email}</strong>
      </p>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)', background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.3)', color: '#E84545', fontSize: 13, marginBottom: 20, textAlign: 'left' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="input-group" style={{ marginBottom: 16 }}>
        <label className="input-label">6-Digit Code</label>
        <input
          value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 22, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}
          maxLength={6}
          onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleOtp()}
        />
      </div>

      <button className="btn-primary" style={{ width: '100%', opacity: otp.length !== 6 ? 0.5 : 1 }}
        onClick={handleOtp} disabled={otpLoading || otp.length !== 6}>
        {otpLoading ? <Spinner /> : 'Verify Email →'}
      </button>

      <button onClick={() => setOtpSent(false)}
        style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>
        ← Back
      </button>
    </div>
  )

  return (
    <div>
      {/* Reason banner */}
      {reason === 'idle' && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)', background: 'rgba(244,166,35,0.1)', border: '1px solid rgba(244,166,35,0.25)', color: 'var(--accent)', fontSize: 13, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>⏱</span> You were signed out due to inactivity.
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)', background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.3)', color: '#E84545', fontSize: 13, marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'register' && (
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input value={form.name} onChange={set('name')} placeholder="Chioma Okonkwo" />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Email Address</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="you@business.com" />
        </div>

        {mode === 'register' && (
          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+2348012345678" />
          </div>
        )}

        <div className="input-group">
          <label className="input-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password} onChange={set('password')}
              placeholder={mode === 'login' ? '••••••••' : 'Min. 8 characters'}
              style={{ paddingRight: 44 }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={() => setShowPwd(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}>
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <div className="input-group">
            <label className="input-label">Referral Code <span style={{ color: 'var(--muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input value={form.referralCode} onChange={set('referralCode')} placeholder="e.g. ARIA2024" />
          </div>
        )}

        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -8 }}>
            <Link href="/forgot-password" style={{ color: 'var(--muted)', fontSize: 12, textDecoration: 'none' }}
              onMouseEnter={(e: any) => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={(e: any) => e.currentTarget.style.color = 'var(--muted)'}>
              Forgot password?
            </Link>
          </div>
        )}

        <button className="btn-primary" style={{ width: '100%', marginTop: 4 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? <Spinner /> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>
      </div>

      {/* Toggle mode */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 14, color: 'var(--muted)' }}>
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <button onClick={() => { setMode('register'); setError('') }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 14 }}>
              Create one
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button onClick={() => { setMode('login'); setError('') }}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 14 }}>
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const params = useSearchParams?.()
  const isRegister = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'register'

  return (
    <div className="min-h-screen gradient-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      {/* Orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,58,143,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '5%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,168,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" className="font-syne" style={{ fontSize: 26, fontWeight: 900, textDecoration: 'none', color: '#fff' }}>
            Cover<span style={{ color: 'var(--accent)' }}>AI</span>
          </Link>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            Nigeria&apos;s AI-powered insurance platform
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--glass-2)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--r-xl)',
          padding: 'clamp(24px, 5vw, 40px)',
          backdropFilter: 'blur(24px)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--r-sm)', padding: 4, marginBottom: 28, border: '1px solid var(--border)' }}>
            {(['login', 'register'] as const).map(m => (
              <Suspense key={m} fallback={null}>
                <TabBtn label={m === 'login' ? 'Sign In' : 'Create Account'} mode={m} />
              </Suspense>
            ))}
          </div>

          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--r-sm)' }} />)}
            </div>
          }>
            <AuthForm />
          </Suspense>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
          {['🔒 SSL Secured', '🏛️ NAICOM Licensed', '🛡️ 256-bit Encrypted'].map(b => (
            <span key={b} style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function TabBtn({ label, mode }: { label: string; mode: 'login' | 'register' }) {
  const params = useSearchParams()
  const router = useRouter()
  const currentMode = params.get('mode') === 'register' ? 'register' : 'login'
  const isActive = currentMode === mode

  return (
    <button
      onClick={() => router.push(`/auth?mode=${mode}`)}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? '#080C1A' : 'var(--muted)',
        fontFamily: 'Syne, sans-serif', fontWeight: isActive ? 800 : 600, fontSize: 13,
        transition: 'all 0.2s',
      }}>
      {label}
    </button>
  )
}
