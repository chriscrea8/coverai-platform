'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const IDLE_MS = 10 * 60 * 1000       // 10 minutes
const WARNING_MS = 9 * 60 * 1000     // warn at 9 minutes

// Pages that don't need the idle watcher
const PUBLIC_PATHS = ['/', '/auth', '/learn', '/compare', '/coverage', '/chat', '/pricing', '/about', '/blog', '/broker']

export default function IdleWatcher() {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLoggedIn = () => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('access_token')
  }

  const isPublicPath = () => PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    router.push('/auth?reason=idle')
  }

  const reset = () => {
    if (!isLoggedIn() || isPublicPath()) return
    setShowWarning(false)
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)

    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(60)
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }, WARNING_MS)

    timerRef.current = setTimeout(() => {
      logout()
    }, IDLE_MS)
  }

  useEffect(() => {
    if (!isLoggedIn() || isPublicPath()) return

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [pathname])

  if (!showWarning) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        maxWidth: 380, width: '90%', padding: 32, borderRadius: 20, textAlign: 'center',
        background: 'linear-gradient(135deg, #0D1B3E, #0A0F1E)',
        border: '1px solid rgba(244,166,35,0.3)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 8, color: '#fff' }}>
          Still there?
        </h3>
        <p style={{ color: '#6B7FA3', fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
          You've been inactive for a while. For your security, you'll be logged out in:
        </p>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 900, color: '#F4A623', marginBottom: 20 }}>
          {secondsLeft}s
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={reset} style={{
            flex: 1, padding: '12px', borderRadius: 12, background: '#F4A623',
            border: 'none', color: '#0A0F1E', fontWeight: 800, fontSize: 14,
            cursor: 'pointer', fontFamily: 'Syne, sans-serif',
          }}>
            Stay Logged In
          </button>
          <button onClick={logout} style={{
            flex: 1, padding: '12px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#6B7FA3', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
