'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'))
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const NAV_LINKS = [
    { href: '/compare', label: 'Compare' },
    { href: '/coverage', label: 'Get Coverage' },
    { href: '/verify', label: 'Verify' },
    { href: '/learn', label: 'Learn' },
  ]

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64,
        background: scrolled ? 'rgba(8,12,26,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

          {/* Logo */}
          <Link href="/" className="font-syne" style={{ fontWeight: 900, fontSize: 22, textDecoration: 'none', color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>
            Cover<span style={{ color: 'var(--accent)' }}>AI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 4 }}>
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} style={{
                padding: '7px 14px', borderRadius: 'var(--r-sm)',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                color: isActive(l.href) ? '#fff' : 'var(--muted)',
                background: isActive(l.href) ? 'rgba(255,255,255,0.08)' : 'transparent',
                transition: 'color 0.15s, background 0.15s',
              }}
                onMouseEnter={e => { if (!isActive(l.href)) { (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' } }}
                onMouseLeave={e => { if (!isActive(l.href)) { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* ARIA chat */}
            <Link href="/chat" style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, textDecoration: 'none', flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(0,194,168,0.2)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              title="Chat with ARIA"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,194,168,0.35)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px rgba(0,194,168,0.2)' }}>
              🤖
            </Link>

            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-ghost hidden md:flex" style={{ padding: '8px 16px', fontSize: 13 }}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth" className="btn-ghost hidden md:flex" style={{ padding: '8px 16px', fontSize: 13 }}>
                  Sign In
                </Link>
                <Link href="/auth?mode=register" className="btn-primary hidden md:flex" style={{ padding: '9px 18px', fontSize: 13 }}>
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="flex md:hidden"
              onClick={() => setMenuOpen(o => !o)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2,
                  transition: 'transform 0.2s, opacity 0.2s',
                  transform: menuOpen && i === 0 ? 'rotate(45deg) translate(5px, 5px)' : menuOpen && i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }} />
              ))}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div ref={menuRef} style={{
          position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
          background: 'rgba(8,12,26,0.98)', borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(24px)', padding: '16px 20px 24px',
          animation: 'fade-in 0.2s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                style={{
                  padding: '12px 14px', borderRadius: 'var(--r-sm)', fontSize: 15, fontWeight: 500,
                  textDecoration: 'none', color: isActive(l.href) ? 'var(--accent)' : '#fff',
                  background: isActive(l.href) ? 'var(--accent-dim)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                {l.label}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth" className="btn-ghost" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/auth?mode=register" className="btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 64 }} />
    </>
  )
}
