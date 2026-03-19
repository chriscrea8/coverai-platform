'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'

const STATS = [
  { value: '₦2.1T', label: 'Insurance market', icon: '🇳🇬' },
  { value: '97%', label: 'Claims success rate', icon: '✅' },
  { value: '3 min', label: 'Get covered', icon: '⚡' },
  { value: '50K+', label: 'Businesses protected', icon: '🛡️' },
]

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Matching', desc: 'ARIA analyses your business profile and recommends the best coverage from AXA Mansard, Leadway & more.' },
  { icon: '⚡', title: 'Instant Coverage', desc: 'From quote to policy in under 3 minutes. Pay weekly, monthly or annually — whatever suits your cash flow.' },
  { icon: '📱', title: 'Claims on WhatsApp', desc: 'File claims, track status and get paid — all through WhatsApp. No queues, no paperwork.' },
  { icon: '🔒', title: 'NAICOM Licensed', desc: 'All insurers are NAICOM-regulated and NIID-verified. Every policy is real, every claim is honoured.' },
]

const PRODUCTS = [
  { icon: '🏪', name: 'Business Shield', desc: 'Fire, theft & liability', price: 'From ₦1,540/mo', badge: 'Most Popular', color: '#F4A623' },
  { icon: '🚗', name: 'Motor Insurance', desc: '3rd party & comprehensive', price: 'From ₦417/mo', badge: 'FRSC Compliant', color: '#00C2A8' },
  { icon: '❤️', name: 'Health Cover', desc: 'Staff & personal medical', price: 'From ₦4,870/mo', badge: 'AXA Mansard', color: '#7C6BFF' },
  { icon: '📦', name: 'Goods in Transit', desc: 'Cargo & logistics cover', price: '0.33% of value', badge: 'Leadway', color: '#2EC97E' },
]

const TESTIMONIALS = [
  { name: 'Adesola Bakare', role: 'Retail Shop Owner, Lagos', text: 'Got covered in 4 minutes. When my shop flooded, CoverAI handled my claim in 3 days. Unbelievable.', avatar: 'AB' },
  { name: 'Emeka Okafor', role: 'Logistics Director, PH', text: 'We insure our entire fleet through CoverAI. The price comparison alone saved us ₦2.4M annually.', avatar: 'EO' },
  { name: 'Fatima Al-Hassan', role: 'Clinic Director, Abuja', text: 'Staff health cover sorted in one afternoon. ARIA understood exactly what we needed.', avatar: 'FA' },
]

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--ink)', color: '#fff' }}>
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="gradient-hero noise-overlay relative overflow-hidden" style={{ paddingTop: 96 }}>
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,58,143,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '0%', left: '-8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,194,168,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-6xl mx-auto px-5 text-center" style={{ paddingTop: 80, paddingBottom: 80 }}>
          {/* Eyebrow */}
          <div className={`badge badge-accent mb-6 mx-auto ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ display: 'inline-flex' }}>
            <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
            Nigeria&apos;s smartest insurance platform
          </div>

          {/* Headline */}
          <h1 className={`font-syne mb-5 ${mounted ? 'animate-fade-up delay-1' : 'opacity-0'}`}
            style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Insurance that works{' '}
            <span style={{ background: 'linear-gradient(135deg, #F4A623 0%, #FFD580 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              as hard as you do
            </span>
          </h1>

          <p className={`text-muted max-w-xl mx-auto mb-10 ${mounted ? 'animate-fade-up delay-2' : 'opacity-0'}`}
            style={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
            AI-matched coverage from AXA Mansard, Leadway & Old Mutual. Pay weekly. File claims on WhatsApp. Get paid in days.
          </p>

          {/* CTAs */}
          <div className={`flex flex-wrap gap-3 justify-center mb-16 ${mounted ? 'animate-fade-up delay-3' : 'opacity-0'}`}>
            <Link href="/coverage" className="btn-primary" style={{ padding: '15px 32px', fontSize: 15 }}>
              Get Covered Now →
            </Link>
            <Link href="/compare" className="btn-ghost" style={{ padding: '14px 24px', fontSize: 14 }}>
              Compare Plans
            </Link>
          </div>

          {/* Stats row */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto ${mounted ? 'animate-fade-up delay-4' : 'opacity-0'}`}>
            {STATS.map(s => (
              <div key={s.label} className="stat-pill text-center">
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div className="font-syne" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div style={{ height: 80, background: 'linear-gradient(to bottom, transparent, var(--ink))' }} />
      </section>

      {/* ── PRODUCTS STRIP ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="badge badge-teal mx-auto mb-4" style={{ display: 'inline-flex' }}>Coverage Types</div>
            <h2 className="font-syne" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Protection for every Nigerian business
            </h2>
            <p className="text-muted mt-3" style={{ maxWidth: 500, margin: '12px auto 0' }}>
              Real products from NAICOM-licensed insurers. Compare and buy in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCTS.map((p, i) => (
              <Link href="/coverage" key={p.name}
                style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card" style={{ padding: '24px 20px', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)' }}>
                  {/* Glow top */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${p.color}60, transparent)` }} />

                  <div style={{ fontSize: 36, marginBottom: 14 }}>{p.icon}</div>
                  <div className="font-syne" style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>{p.desc}</div>

                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ color: p.color, fontWeight: 800, fontSize: 15, fontFamily: 'Syne, sans-serif', marginBottom: 8 }}>{p.price}</div>
                    <span className="badge" style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30`, fontSize: 10 }}>
                      {p.badge}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(180deg, transparent, rgba(13,27,62,0.4), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="badge badge-blue mx-auto mb-4" style={{ display: 'inline-flex' }}>How it works</div>
            <h2 className="font-syne" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Covered in 3 minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div style={{ position: 'absolute', top: 36, left: '16.6%', right: '16.6%', height: 1, background: 'linear-gradient(90deg, transparent, var(--border-mid), var(--border-mid), transparent)', display: 'none' }} className="md:block" />

            {[
              { step: '01', icon: '💬', title: 'Tell ARIA about your business', desc: 'Answer 4 quick questions. Our AI analyses your risk profile and matches you with the best plans.' },
              { step: '02', icon: '📊', title: 'Compare real prices', desc: 'See live premiums from AXA Mansard, Leadway and Old Mutual side-by-side. No hidden fees.' },
              { step: '03', icon: '✅', title: 'Pay and get covered', desc: 'Pay weekly, monthly or annually via Paystack. Your certificate is emailed instantly.' },
            ].map(item => (
              <div key={item.step} className="card" style={{ padding: '32px 24px', textAlign: 'center', position: 'relative', borderRadius: 'var(--r-lg)' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 18px' }}>
                  {item.icon}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>STEP {item.step}</div>
                <div className="font-syne" style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>{item.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: big feature card */}
            <div className="card" style={{ padding: '48px 40px', background: 'linear-gradient(135deg, rgba(26,58,143,0.3), rgba(13,27,62,0.95))', border: '1px solid rgba(26,58,143,0.4)', borderRadius: 'var(--r-xl)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
                <div className="badge badge-accent mb-4">AI-First Insurance</div>
                <h2 className="font-syne" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: 16 }}>
                  Meet ARIA — your personal insurance advisor
                </h2>
                <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28 }}>
                  ARIA understands Nigerian business risks, speaks Pidgin, Yoruba, Igbo and Hausa, and gives personalised recommendations in under 60 seconds.
                </p>
              </div>
              <Link href="/chat" className="btn-primary" style={{ width: 'fit-content' }}>
                Chat with ARIA →
              </Link>
            </div>

            {/* Right: feature grid */}
            <div className="grid grid-cols-1 gap-4">
              {FEATURES.slice(1).map(f => (
                <div key={f.title} className="card" style={{ padding: '24px', display: 'flex', gap: 16, alignItems: 'flex-start', borderRadius: 'var(--r-lg)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal-dim)', border: '1px solid var(--border-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div>
                    <div className="font-syne" style={{ fontWeight: 800, fontSize: 15, marginBottom: 5 }}>{f.title}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(180deg, transparent, rgba(13,27,62,0.3), transparent)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="badge badge-teal mx-auto mb-4" style={{ display: 'inline-flex' }}>Customer Stories</div>
            <h2 className="font-syne" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.025em' }}>
              Real businesses, real protection
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card" style={{ padding: '28px 24px', borderRadius: 'var(--r-lg)' }}>
                <div style={{ color: 'var(--accent)', fontSize: 28, marginBottom: 12, lineHeight: 1 }}>&ldquo;</div>
                <p style={{ color: 'var(--muted-light)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px' }}>
        <div className="max-w-4xl mx-auto">
          <div className="card" style={{ padding: 'clamp(40px, 6vw, 64px)', textAlign: 'center', background: 'linear-gradient(135deg, rgba(26,58,143,0.4), rgba(13,27,62,0.98))', border: '1px solid rgba(26,58,143,0.45)', borderRadius: 'var(--r-xl)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,166,35,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div className="badge badge-accent mx-auto mb-5" style={{ display: 'inline-flex' }}>Start Free Today</div>
            <h2 className="font-syne" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: 16 }}>
              Your business deserves real protection
            </h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
              Join 50,000+ Nigerian businesses covered by CoverAI. Get your AI-matched quote in 3 minutes — no broker, no paperwork.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/coverage" className="btn-primary" style={{ padding: '15px 36px', fontSize: 15 }}>
                Get Free Quote →
              </Link>
              <Link href="/chat" className="btn-ghost" style={{ padding: '14px 24px' }}>
                Talk to ARIA
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '48px 20px', marginTop: 40 }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="font-syne" style={{ fontWeight: 900, fontSize: 20, marginBottom: 12 }}>
                Cover<span style={{ color: 'var(--accent)' }}>AI</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.7 }}>
                Nigeria&apos;s AI-powered insurance marketplace. NAICOM-regulated, NIID-verified.
              </p>
            </div>
            {[
              { label: 'Products', links: ['Motor Insurance', 'Business Cover', 'Health Insurance', 'Goods in Transit'] },
              { label: 'Company', links: ['About Us', 'Blog', 'Careers', 'Legal'] },
              { label: 'Support', links: ['Help Center', 'Contact Us', 'Verify Insurance', 'Claims'] },
            ].map(col => (
              <div key={col.label}>
                <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--muted-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{col.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ color: 'var(--muted)', fontSize: 13, textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="divider mb-6" />
          <div className="flex flex-wrap items-center justify-between gap-4" style={{ fontSize: 12, color: 'var(--muted)' }}>
            <span>© 2025 CoverAI. All rights reserved. Regulated by NAICOM.</span>
            <div className="flex gap-4">
              <a href="/legal" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</a>
              <a href="/legal" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
