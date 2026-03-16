'use client'
import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setLoading(true); setError('')
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(26,58,143,0.3) 0%, transparent 60%), #080D1A' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-syne font-black text-2xl text-white no-underline">
            Cover<span className="text-accent">AI</span>
          </Link>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-syne font-bold text-xl mb-3">Check your email</h2>
              <p className="text-muted text-sm mb-6 leading-relaxed">
                We've sent a password reset link to <strong className="text-white">{email}</strong>. 
                Check your inbox and follow the instructions.
              </p>
              <Link href="/auth" className="text-accent text-sm hover:underline">← Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 className="font-syne font-bold text-xl mb-2">Forgot your password?</h2>
              <p className="text-muted text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-muted outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    placeholder="you@example.ng"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)' }}>
                    {error}
                  </div>
                )}

                <button onClick={submit} disabled={loading}
                  className="w-full py-3.5 rounded-xl font-syne font-bold text-ink transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: '#F4A623' }}>
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  Send Reset Link
                </button>

                <div className="text-center">
                  <Link href="/auth" className="text-muted text-sm hover:text-white transition-colors">
                    ← Back to Sign In
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
