'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { hydrateAuth, useAuthStore } from '@/lib/store'

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()

  useEffect(() => { hydrateAuth() }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const features = [
    { icon: '🤖', title: 'AI Insurance Assistant', desc: 'Get instant answers about any insurance product in plain English. No jargon, no confusion.', color: '#00C2A8' },
    { icon: '📋', title: 'Smart Policy Matching', desc: 'Answer a few questions and our AI recommends the exact coverage your business needs.', color: '#F4A623' },
    { icon: '⚡', title: 'Instant Claims', desc: 'Submit and track claims digitally. No paperwork, no office visits, real-time updates.', color: '#7C6BFF' },
    { icon: '🔗', title: 'Embedded Insurance API', desc: 'Fintech platforms can integrate insurance products directly into their apps via our API.', color: '#00C2A8' },
    { icon: '🏢', title: 'SME Dashboard', desc: 'One place to manage all your business policies, renewals, payments, and documents.', color: '#F4A623' },
    { icon: '🌍', title: 'Pan-African Coverage', desc: 'Starting in Nigeria, expanding across Africa. Coverage that scales with your business.', color: '#7C6BFF' },
  ]

  const steps = [
    { icon: '💬', title: 'Ask the AI', desc: 'Tell ARIA about your business — it understands the Nigerian market and local risks.' },
    { icon: '🎯', title: 'Get Matched', desc: 'Receive tailored policy recommendations in seconds. No paperwork yet.' },
    { icon: '✅', title: 'Buy Coverage', desc: 'Purchase your policy digitally with Paystack. Instant documentation sent to your email.' },
    { icon: '📱', title: 'Manage & Claim', desc: 'Track renewals, submit claims with photos, and get paid — all from your dashboard.' },
  ]

  return (
    <div className="noise-overlay min-h-screen">
      {/* Nav */}
      <nav style={{ background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-4">
        <div className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></div>
        <div className="hidden md:flex items-center gap-1">
          {[['Features', 'features'], ['How It Works', 'how-it-works'], ['Pricing', 'pricing']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-all">
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn() ? (
            <Link href="/dashboard" className="px-5 py-2 rounded-lg bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/auth" className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Sign In</Link>
              <Link href="/auth?mode=register" className="px-5 py-2 rounded-lg bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7 text-xs font-semibold text-accent tracking-widest uppercase"
          style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>
          🚀 Launching in Nigeria · Expanding Across Africa
        </div>
        <h1 className="font-syne font-black text-5xl md:text-7xl leading-tight tracking-tight max-w-4xl mb-6">
          Insurance That Works<br />
          <span className="text-accent">For African</span> <span className="text-teal">Businesses</span>
        </h1>
        <p className="text-muted text-lg max-w-xl leading-relaxed mb-10">
          AI-powered insurance for SMEs. Understand your options in plain language, get covered instantly, and manage claims — all in one platform.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/chat"
            className="px-8 py-4 rounded-xl bg-accent text-ink font-syne font-bold text-base hover:bg-yellow-400 transition-all hover:-translate-y-0.5"
            style={{ boxShadow: '0 8px 32px rgba(244,166,35,0.3)' }}>
            Talk to AI Assistant
          </Link>
          <Link href="/coverage"
            className="px-8 py-4 rounded-xl text-white font-syne font-semibold text-base hover:bg-white/10 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
            Get Coverage
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-3 max-w-xl w-full rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {[['10,000+', 'Businesses Protected'], ['₦2.4B', 'Claims Processed'], ['98%', 'Satisfaction Rate']].map(([n, l]) => (
            <div key={l} className="py-6 px-4 text-center" style={{ background: 'rgba(13,27,62,0.6)' }}>
              <div className="font-syne font-black text-2xl md:text-3xl">{n}</div>
              <div className="text-muted text-xs mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6" style={{ background: '#0D1B3E' }}>
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal tracking-widest uppercase mb-4"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>Why CoverAI</span>
          <h2 className="font-syne font-black text-3xl md:text-5xl tracking-tight">Everything Your Business Needs</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {features.map(f => (
            <div key={f.title} className="p-8 rounded-2xl transition-all hover:-translate-y-1"
              style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5"
                style={{ background: f.color + '20' }}>{f.icon}</div>
              <h3 className="font-syne font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-ink">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent tracking-widest uppercase mb-4"
            style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>Process</span>
          <h2 className="font-syne font-black text-3xl md:text-5xl tracking-tight">How It Works</h2>
          <p className="text-muted mt-3 max-w-lg mx-auto">From zero to fully insured in under 10 minutes. No insurance knowledge required.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <div key={s.title} className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 relative"
                style={{ background: '#0D1B3E', border: '2px solid rgba(26,58,143,0.6)' }}>
                {s.icon}
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-ink text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-syne font-bold text-base mb-2">{s.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/auth?mode=register"
            className="px-8 py-4 rounded-xl bg-accent text-ink font-syne font-bold inline-block hover:bg-yellow-400 transition-all">
            Start Now →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6" style={{ background: '#0D1B3E' }}>
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal tracking-widest uppercase mb-4"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>Pricing</span>
          <h2 className="font-syne font-black text-3xl md:text-5xl tracking-tight">Simple, Transparent Plans</h2>
          <p className="text-muted mt-3">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { name: 'Starter', desc: 'For micro businesses getting started.', price: '₦0', per: 'Free forever', features: ['AI Insurance Chatbot', '1 Active Policy', 'Basic Claims', 'Email Support'] },
            { name: 'Business', desc: 'For growing SMEs that need full management.', price: '₦4,999', per: '/month', features: ['Unlimited Policies', 'Priority Claims (48hr)', 'Full SME Dashboard', 'Payment Tracking', 'Phone Support'], featured: true },
            { name: 'Enterprise', desc: 'For large SMEs and fintech platforms.', price: 'Custom', per: 'Contact us', features: ['Everything in Business', 'Embedded Insurance API', 'Dedicated Manager', 'SLA Guarantee'] },
          ].map(p => (
            <div key={p.name} className={`p-9 rounded-2xl relative ${(p as any).featured ? 'scale-105' : ''}`}
              style={{ background: (p as any).featured ? 'rgba(26,58,143,0.3)' : 'rgba(10,15,30,0.7)', border: (p as any).featured ? '1px solid rgba(26,58,143,0.6)' : '1px solid rgba(255,255,255,0.07)' }}>
              {(p as any).featured && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-ink text-xs font-black">Most Popular</div>}
              <div className="font-syne font-black text-xl mb-2">{p.name}</div>
              <div className="text-muted text-sm mb-6 leading-relaxed">{p.desc}</div>
              <div className="font-syne font-black text-4xl mb-1">{p.price}</div>
              <div className="text-muted text-sm mb-7">{p.per}</div>
              <ul className="space-y-3 mb-8">
                {p.features.map(f => <li key={f} className="text-sm flex gap-2"><span className="text-teal font-bold">✓</span>{f}</li>)}
              </ul>
              <Link href="/auth?mode=register"
                className={`block text-center py-3 rounded-xl font-syne font-bold text-sm transition-all ${(p as any).featured ? 'bg-accent text-ink hover:bg-yellow-400' : 'text-white hover:bg-white/10'}`}
                style={(p as any).featured ? {} : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
                {p.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-6 bg-ink border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></div>
          <div className="text-muted text-sm text-center">© 2026 CoverAI Technologies Ltd · Lagos, Nigeria</div>
          <div className="flex gap-2 text-xs">
            {['🔒 SSL Secured', '🏦 NAICOM Regulated', '🇳🇬 Made in Nigeria'].map(b => (
              <span key={b} className="px-3 py-1 rounded bg-white/5 text-muted">{b}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
