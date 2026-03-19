'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

// ── ARIA Floating Widget ─────────────────────────────────────────────────────
// Glassmorphism design, smooth open/close animation, accessible
export default function ARIAWidget() {
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  // Kill pulse after first open
  useEffect(() => {
    if (open) setPulse(false)
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const QUICK_ACTIONS = [
    { icon: '🛡️', label: 'Get Covered', href: '/coverage' },
    { icon: '📊', label: 'Compare Plans', href: '/compare' },
    { icon: '📋', label: 'File a Claim', href: '/claims/new' },
    { icon: '🔍', label: 'Verify Insurance', href: '/verify' },
  ]

  return (
    <div ref={ref} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>

      {/* Panel */}
      {open && (
        <div style={{
          width: 300,
          background: 'var(--glass-2)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--r-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg), 0 0 40px rgba(0,194,168,0.08)',
          animation: 'scale-in 0.2s var(--ease) forwards',
          transformOrigin: 'bottom right',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(26,58,143,0.5), rgba(0,194,168,0.15))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                🤖
              </div>
              <div>
                <div className="font-syne" style={{ fontWeight: 800, fontSize: 14 }}>ARIA</div>
                <div style={{ fontSize: 11, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
                  AI Insurance Advisor · Online
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted-light)', lineHeight: 1.6, marginBottom: 14 }}>
              Hi! I&apos;m ARIA — your AI insurance advisor. How can I help you today?
            </p>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {QUICK_ACTIONS.map(a => (
                <Link key={a.href} href={a.href} onClick={() => setOpen(false)}
                  style={{ textDecoration: 'none', padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#fff', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-dim)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
                  <span>{a.icon}</span>{a.label}
                </Link>
              ))}
            </div>

            {/* Open chat CTA */}
            <Link href="/chat" onClick={() => setOpen(false)}
              className="btn-primary" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', fontSize: 13, padding: '11px' }}>
              💬 Chat with ARIA →
            </Link>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open ARIA chat assistant"
        style={{
          width: 52, height: 52,
          borderRadius: '50%',
          background: open
            ? 'rgba(255,255,255,0.12)'
            : 'linear-gradient(135deg, #1A3A8F 0%, #00C2A8 100%)',
          border: open ? '1px solid var(--border-mid)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: open ? 18 : 22,
          cursor: 'pointer',
          boxShadow: open ? 'none' : '0 4px 24px rgba(0,194,168,0.35), 0 0 0 0 rgba(0,194,168,0.4)',
          transition: 'all 0.25s var(--ease)',
          animation: pulse && !open ? 'glow-pulse 2.5s infinite' : 'none',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}>
        {open ? '✕' : '🤖'}
      </button>
    </div>
  )
}
