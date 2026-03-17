'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'AI Assistant', href: '/chat' },
  { label: 'Learn', href: '/learn' },
  { label: 'Compare', href: '/compare' },
  { label: 'Get Coverage', href: '/coverage' },
  { label: 'Verify Insurance', href: '/verify' },
]

const AUTH_ONLY_LINKS = [
  { label: 'Claims', href: '/claims/new' },
  { label: 'Refer & Earn 🎁', href: '/referrals' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('access_token'))
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const allLinks = loggedIn ? [...NAV_LINKS, ...AUTH_ONLY_LINKS] : NAV_LINKS

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all"
      style={{
        background: scrolled ? 'rgba(10,15,30,0.97)' : 'rgba(10,15,30,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
      <div className="flex items-center justify-between px-4 md:px-10 py-3 md:py-4 max-w-7xl mx-auto">
        <Link href="/" className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {allLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive(l.href) ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
              style={isActive(l.href) ? { background: 'rgba(26,58,143,0.4)' } : {}}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link href="/dashboard" className="px-5 py-2 rounded-lg bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all hidden md:block">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="px-4 py-2 text-sm text-muted hover:text-white transition-colors hidden md:block">Sign In</Link>
              <Link href="/auth?mode=register" className="px-5 py-2 rounded-lg bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all">Get Started</Link>
            </>
          )}
          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg ml-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-3" style={{ background: 'rgba(10,15,30,0.98)' }}>
          {allLinks.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all ${isActive(l.href) ? 'text-white' : 'text-muted'}`}
              style={isActive(l.href) ? { background: 'rgba(26,58,143,0.35)' } : {}}>
              {l.label}
            </Link>
          ))}
          {loggedIn ? (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-sm font-bold text-accent border-t border-white/5 mt-1 pt-3">Dashboard →</Link>
          ) : (
            <Link href="/auth" onClick={() => setMenuOpen(false)} className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-muted border-t border-white/5 mt-1 pt-3">Sign In →</Link>
          )}
        </div>
      )}
    </nav>
  )
}
