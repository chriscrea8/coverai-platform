'use client'
import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'

// Inner component that uses useSearchParams — must be inside Suspense
function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'consumer' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth, isLoggedIn } = useAuthStore()

  useEffect(() => { if (isLoggedIn()) router.push('/dashboard') }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login({ email: form.email, password: form.password })
        : await authApi.register(form)
      const { user, accessToken, refreshToken } = res.data.data
      setAuth(user, accessToken, refreshToken)
      router.push('/dashboard')
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong')
    } finally { setLoading(false) }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-muted outline-none transition-all focus:border-blue-500"

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-8"
      style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26,58,143,0.3) 0%, transparent 70%), #0A0F1E' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="font-syne font-black text-2xl">Cover<span className="text-accent">AI</span></Link>
          <p className="text-muted text-sm mt-2">{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        </div>

        <div className="p-5 md:p-8 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-7" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all capitalize ${mode === m ? 'bg-blue text-white' : 'text-muted'}`}
                style={mode === m ? { background: '#1A3A8F' } : {}}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Full Name</label>
                  <input className={inputCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="Chioma Okonkwo" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Phone Number</label>
                  <input className={inputCls} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="+2348012345678" value={form.phone} onChange={e => set('phone', e.target.value)} />
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
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Email</label>
              <input className={inputCls} type="email" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="you@example.ng" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Password</label>
              <input className={inputCls} type="password" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)' }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl font-syne font-bold text-ink transition-all hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#F4A623', boxShadow: '0 8px 24px rgba(244,166,35,0.25)' }}>
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          {mode === 'login' && (
            <div className="text-center mt-4">
              <Link href="/auth/forgot-password" className="text-muted text-sm hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-muted text-sm mt-6">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            className="text-accent hover:underline">{mode === 'login' ? 'Register' : 'Sign In'}</button>
        </p>
      </div>
    </div>
  )
}

// Loading fallback while Suspense resolves
function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="text-muted text-sm">Loading...</div>
    </div>
  )
}

// Default export wraps the form in Suspense (required for useSearchParams in Next.js 14)
export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthForm />
    </Suspense>
  )
}
