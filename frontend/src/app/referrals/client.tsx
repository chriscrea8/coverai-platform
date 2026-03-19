'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ReferralsClient() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      setLoggedIn(true)
      api.get('/referrals/stats')
        .then(res => setStats(res.data?.data || res.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const copyLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareWhatsApp = () => {
    if (stats?.referralLink) {
      const msg = encodeURIComponent(`Hey! I use CoverAI for insurance in Nigeria — it's amazing. Get covered instantly with AI help.\n\nUse my referral link to sign up:\n${stats.referralLink}`)
      window.open(`https://wa.me/?text=${msg}`, '_blank')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(26,58,143,0.3) 0%, transparent 60%), #080D1A', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, textDecoration: 'none', color: '#fff' }}>Cover<span style={{ color: 'var(--accent)' }}>AI</span></Link>
        <Link href="/dashboard" style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎁</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 900, marginBottom: 12, lineHeight: 1.2 }}>
            Refer Friends.<br />
            <span style={{ color: 'var(--accent)' }}>Earn Real Money.</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Share CoverAI with friends and earn 5% commission + ₦500 bonus every time someone you refer buys their first insurance policy.
          </p>
        </div>

        {/* How it works */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { step: '1', icon: '🔗', title: 'Share Your Link', desc: 'Copy your unique referral link and share with friends, family, colleagues' },
            { step: '2', icon: '📝', title: 'They Sign Up', desc: 'Your friend registers on CoverAI using your referral link' },
            { step: '3', icon: '💰', title: 'You Earn', desc: '5% of their first premium + ₦500 bonus credited to your account' },
          ].map(s => (
            <div key={s.step} style={{ padding: 20, borderRadius: 16, background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{s.step}</div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {!loggedIn ? (
          /* Not logged in CTA */
          <div style={{ padding: 32, borderRadius: 20, background: 'rgba(26,58,143,0.2)', border: '1px solid rgba(26,58,143,0.4)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Sign in to get your referral link</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Create a free account or sign in to access your unique referral link and start earning.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/auth" style={{ padding: '12px 24px', borderRadius: 12, background: 'var(--accent)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontFamily: 'Syne, sans-serif' }}>Sign In</Link>
              <Link href="/auth?mode=register" style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>Create Account</Link>
            </div>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading your referral dashboard...</div>
        ) : stats ? (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Referrals', value: stats.totalReferrals || 0, icon: '👥', color: '#7B9FE0' },
                { label: 'Total Earnings', value: `₦${Number(stats.earnings || 0).toLocaleString()}`, icon: '💰', color: 'var(--accent)' },
                { label: 'Pending Payout', value: `₦${Number(stats.pendingPayout || 0).toLocaleString()}`, icon: '⏳', color: 'var(--green)' },
              ].map(s => (
                <div key={s.label} style={{ padding: '20px', borderRadius: 16, background: 'var(--glass-1)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 24, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Referral Link Card */}
            <div style={{ padding: 28, borderRadius: 20, background: 'linear-gradient(135deg, rgba(26,58,143,0.4), rgba(0,194,168,0.15))', border: '1px solid rgba(26,58,143,0.4)', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>🔗 Your Referral Link</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Share this link to earn commissions</div>

              {/* Referral Code Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(244,166,35,0.15)', border: '1px solid rgba(244,166,35,0.3)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Your Code</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, color: 'var(--accent)', letterSpacing: 2 }}>{stats.referralCode}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>or share the full link below</div>
              </div>

              {/* Full Link */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#8A9BBF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stats.referralLink}
                </div>
                <button onClick={copyLink} style={{ padding: '12px 20px', borderRadius: 10, background: copied ? 'var(--green)' : 'var(--accent)', border: 'none', color: copied ? '#fff' : 'var(--ink)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>

              {/* Share Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={shareWhatsApp} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  📱 Share on WhatsApp
                </button>
                <button onClick={() => { navigator.share?.({ title: 'CoverAI Insurance', text: 'Get insured in Nigeria with AI!', url: stats.referralLink }).catch(() => {}) }} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(26,58,143,0.2)', border: '1px solid rgba(26,58,143,0.3)', color: '#7B9FE0', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ↗ Share
                </button>
              </div>
            </div>

            {/* Commission Info */}
            <div style={{ padding: 20, borderRadius: 16, background: 'rgba(13,27,62,0.6)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 12 }}>💡 How commissions work</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(244,166,35,0.08)', border: '1px solid rgba(244,166,35,0.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Commission Rate</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, color: 'var(--accent)' }}>{stats.commissionRate}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>of first policy premium</div>
                </div>
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(46,201,126,0.08)', border: '1px solid rgba(46,201,126,0.15)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Signup Bonus</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, color: 'var(--green)' }}>{stats.flatBonus}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>per successful referral</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                Example: Your friend buys a ₦60,000 motor policy → You earn ₦3,000 (5%) + ₦500 bonus = <strong style={{ color: 'var(--green)' }}>₦3,500 total</strong> 🎉
              </div>
            </div>

            {/* Referred Users */}
            {stats.referredUsers?.length > 0 && (
              <div style={{ padding: 20, borderRadius: 16, background: 'rgba(13,27,62,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 12 }}>👥 People You've Referred</div>
                {stats.referredUsers.map((u: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < stats.referredUsers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(u.joinedAt).toLocaleDateString('en-NG')}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Could not load referral data. Please try again.</div>
        )}
      </div>
    </div>
  )
}
