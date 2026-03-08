'use client'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-ink border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="font-syne font-black text-2xl block mb-3">
              Cover<span className="text-accent">AI</span>
            </Link>
            <p className="text-muted text-sm leading-relaxed mb-5">
              AI-powered insurance for African businesses. Protecting what matters, simply and affordably.
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Twitter', icon: '🐦', href: 'https://twitter.com' },
                { label: 'LinkedIn', icon: '💼', href: 'https://linkedin.com' },
                { label: 'Facebook', icon: '📘', href: 'https://facebook.com' },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>{s.icon}</span>{s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Products</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'AI Assistant', href: '/chat' },
                { label: 'Get Coverage', href: '/coverage' },
                { label: 'Claims', href: '/claims/new' },
                { label: 'SME Dashboard', href: '/dashboard' },
                { label: 'Embedded API', href: '/embedded-api' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Company</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'How It Works', href: '/#how-it-works' },
                { label: 'Pricing', href: '/pricing' },
                { label: 'Blog', href: '/blog' },
                { label: 'Careers', href: '/careers' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Privacy Policy', href: '/legal/privacy' },
                { label: 'Terms of Service', href: '/legal/terms' },
                { label: 'Cookie Policy', href: '/legal/cookies' },
                { label: 'Complaints', href: '/legal/complaints' },
              ].map(l => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted text-xs">© 2026 CoverAI Technologies Ltd · RC 1234567 · Lagos, Nigeria</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {['🔒 SSL Secured', '🏦 NAICOM Regulated', '🇳🇬 Made in Nigeria'].map(b => (
              <span key={b} className="px-3 py-1 rounded text-xs text-muted" style={{ background: 'rgba(255,255,255,0.04)' }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
