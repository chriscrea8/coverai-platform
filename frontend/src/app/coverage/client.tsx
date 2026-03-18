'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// ─── Assessment wizard steps ─────────────────────────────────────────────
const STEPS = [
  {
    q: 'What type of business do you run?',
    key: 'businessType',
    options: [
      { icon: '🏪', label: 'Retail Shop',         sub: 'Store, market stall, boutique',      tags: ['property', 'theft', 'fire'] },
      { icon: '🏭', label: 'Manufacturing',        sub: 'Production, processing, factory',    tags: ['property', 'liability', 'fire'] },
      { icon: '💻', label: 'Tech / Services',      sub: 'Agency, consultancy, software',      tags: ['cyber', 'liability', 'business'] },
      { icon: '🚗', label: 'Transport / Logistics',sub: 'Fleet, delivery, haulage',           tags: ['motor', 'liability', 'marine'] },
      { icon: '🍽️', label: 'Food & Hospitality',  sub: 'Restaurant, catering, hotel',        tags: ['property', 'liability', 'fire'] },
      { icon: '👨‍⚕️', label: 'Health / Medical',   sub: 'Clinic, pharmacy, wellness',         tags: ['health', 'liability'] },
    ],
  },
  {
    q: 'How many employees do you have?',
    key: 'employeeCount',
    options: [
      { icon: '👤', label: 'Just me',       sub: 'Sole proprietor or freelancer',    tags: ['life', 'health'] },
      { icon: '👥', label: '2–10 staff',    sub: 'Small team',                       tags: ['health', 'liability'] },
      { icon: '🏢', label: '11–50 staff',   sub: 'Growing SME',                      tags: ['health', 'liability', 'business'] },
      { icon: '🏬', label: '50+ staff',     sub: 'Medium enterprise',               tags: ['health', 'liability', 'business', 'life'] },
    ],
  },
  {
    q: 'What is your biggest risk concern?',
    key: 'riskFocus',
    options: [
      { icon: '🔥', label: 'Fire & Damage',          sub: 'Property, equipment, stock',         tags: ['fire', 'property'] },
      { icon: '🔑', label: 'Theft & Burglary',        sub: 'Goods, cash, assets',                tags: ['theft', 'property'] },
      { icon: '⚖️', label: 'Legal Liability',          sub: 'Customer injuries, lawsuits',        tags: ['liability'] },
      { icon: '💻', label: 'Cyber & Data Breach',     sub: 'Hacking, data loss',                 tags: ['cyber'] },
      { icon: '🌧️', label: 'Business Interruption',   sub: 'Revenue loss from disruption',       tags: ['business'] },
      { icon: '🚑', label: 'Staff Health & Accidents', sub: 'Medical expenses, injury cover',    tags: ['health', 'life'] },
    ],
  },
  {
    q: 'Monthly revenue range?',
    key: 'revenueRange',
    options: [
      { icon: '💰', label: 'Below ₦500K',    sub: 'Micro business', tags: [] },
      { icon: '💵', label: '₦500K – ₦2M',   sub: 'Small business', tags: [] },
      { icon: '💎', label: '₦2M – ₦10M',    sub: 'Medium business', tags: [] },
      { icon: '🏆', label: 'Above ₦10M',    sub: 'Large SME',       tags: [] },
    ],
  },
]

// Fallback hardcoded plans for when API has no products yet
const FALLBACK_PLANS = [
  {
    id: null, name: 'Business Shield Basic',
    desc: 'Essential coverage for small businesses — property, liability, and theft protection.',
    price: 18500, tags: ['Property Cover', 'Theft Protection', 'Fire & Damage'],
    badge: 'Best Value', match: 94, category: 'business',
    coverageAmount: 5000000, commissionRate: 0.10, durationMonths: 12,
  },
  {
    id: null, name: 'SME Complete Package',
    desc: 'Full protection including business interruption. Most popular among Nigerian SMEs.',
    price: 42000, tags: ['Full Property', 'Liability', 'Business Interruption'],
    badge: 'Most Popular', match: 89, category: 'business',
    coverageAmount: 15000000, commissionRate: 0.10, durationMonths: 12,
  },
  {
    id: null, name: 'Enterprise Pro',
    desc: 'Maximum coverage for high-value businesses and growing enterprises.',
    price: 95000, tags: ['Cyber Insurance', 'D&O Liability', 'All Risks'],
    badge: 'Premium', match: 76, category: 'business',
    coverageAmount: 50000000, commissionRate: 0.10, durationMonths: 12,
  },
]

function matchScore(product: any, answers: Record<string, any>): number {
  let score = 70
  const category = (product.category || product.productType || '').toLowerCase()
  const name = (product.productName || product.name || '').toLowerCase()

  // Business type matching
  const bt = (answers.businessType || '').toLowerCase()
  if (bt.includes('tech') && (category === 'cyber' || name.includes('cyber'))) score += 20
  if (bt.includes('transport') && category === 'motor') score += 20
  if ((bt.includes('retail') || bt.includes('manufactur')) && (category === 'property' || category === 'fire')) score += 15
  if (bt.includes('health') && category === 'health') score += 20

  // Risk focus matching
  const rf = (answers.riskFocus || '').toLowerCase()
  if (rf.includes('fire') && (category.includes('fire') || category.includes('property'))) score += 15
  if (rf.includes('cyber') && category === 'cyber') score += 15
  if (rf.includes('liability') && category === 'liability') score += 15
  if (rf.includes('health') && category === 'health') score += 10
  if (rf.includes('business') && category === 'business') score += 10

  return Math.min(score, 98)
}

export default function CoveragePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [frequency, setFrequency] = useState<'weekly'|'monthly'|'quarterly'|'annually'>('monthly')

  // Pricing config mirrors backend FREQUENCY_CONFIG
  const FREQ_CONFIG: Record<string, { label: string; periods: number; graceDays: number; discount: number; desc: string }> = {
    weekly:    { label: 'Weekly',    periods: 52, graceDays: 3,  discount: 1.20, desc: 'Pay every week — ideal for daily traders' },
    monthly:   { label: 'Monthly',   periods: 12, graceDays: 7,  discount: 1.12, desc: 'Pay once a month — most flexible' },
    quarterly: { label: 'Quarterly', periods: 4,  graceDays: 14, discount: 1.06, desc: 'Pay 4× a year — good balance' },
    annually:  { label: 'Annually',  periods: 1,  graceDays: 0,  discount: 1.00, desc: 'Pay once — best value, save up to 20%' },
  }

  function calcInstallment(annualPrice: number, freq: string) {
    const cfg = FREQ_CONFIG[freq]
    if (!cfg || !annualPrice) return { installment: 0, annual: 0 }
    const annual = Math.round(annualPrice * cfg.discount)
    const installment = Math.ceil(annual / cfg.periods)
    return { installment, annual }
  }


  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('access_token'))
  }, [])

  // Fetch real products from Curacel when wizard completes
  useEffect(() => {
    if (!done) return
    setLoadingProducts(true)
    // Map user answers to Curacel product type
    const typeMap: Record<string, string> = {
      motor: '2',       // 3rd Party Auto
      vehicle: '10',    // Comprehensive Auto
      health: '1',      // Health
      life: '3',        // Life
      business: '8',    // Fire and Burglary
      property: '8',
      gadget: '7',
      travel: '9',
      goods: '4',
    }
    const insuranceType = answers?.insuranceType || answers?.type || 'motor'
    const typeId = typeMap[insuranceType.toLowerCase()] || ''
    const url = `${API}/curacel/products?calculate_premium=1${typeId ? `&type=${typeId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const list: any[] = d.data || []
        const active = list.filter((p: any) => p.id)
        if (active.length > 0) {
          const scored = active.map((p: any) => ({
            ...p,
            match: matchScore(p, answers),
            displayName: p.title || p.productName || p.name,
            price: p.price || p.premium_rate || Number(p.premiumMin || 0),
            tags: [p.product_type?.name, p.insurer?.name].filter(Boolean),
          })).sort((a: any, b: any) => b.match - a.match)
          setProducts(scored.slice(0, 4))
        } else {
          setProducts(FALLBACK_PLANS)
        }
      })
      .catch(() => setProducts(FALLBACK_PLANS))
      .finally(() => setLoadingProducts(false))
  }, [done])

  const select = (opt: any) => {
    const next = { ...answers, [STEPS[step].key]: opt.label }
    setAnswers(next)
    if (step < STEPS.length - 1) setTimeout(() => setStep(step + 1), 220)
    else setTimeout(() => setDone(true), 300)
  }

  const purchase = async (plan: any) => {
    if (!isLoggedIn) { router.push('/auth?mode=register'); return }
    setPurchasing(plan.id || plan.name)
    setToast('')

    try {
      const annualPrice = plan.price || plan.premiumMin || plan.minPremium || 0
      const { installment } = calcInstallment(annualPrice, frequency)

      const policyBody: Record<string, any> = {
        premiumAmount: annualPrice,      // backend recalculates installment from this
        paymentFrequency: frequency,
        policyDetails: {
          planName: plan.displayName || plan.name,
          coverType: plan.category || plan.productType,
          answers,
          matchScore: plan.match,
        },
      }
      const isUUID = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
      if (isUUID(plan.id)) policyBody.productId = plan.id
      if (isUUID(plan.providerId)) policyBody.providerId = plan.providerId
      if (plan.coverageAmount) policyBody.coverageAmount = plan.coverageAmount

      // Step 1: Create the policy
      const policyRes = await api.post('/policies/purchase', policyBody)
      const policyId = policyRes.data?.data?.id || policyRes.data?.id

      // Step 2: Initiate payment for the first installment amount
      const frontendUrl = window.location.origin
      const payRes = await api.post('/payments/create', {
        policyId,
        amount: installment,   // pay only the installment, not full annual
        callbackUrl: `${frontendUrl}/payment/success`,
      })

      const authUrl = payRes.data?.data?.authorizationUrl || payRes.data?.authorizationUrl
      if (authUrl) {
        window.location.href = authUrl
      } else {
        setToast('Policy created! Complete payment from your dashboard.')
        setTimeout(() => router.push('/dashboard?highlight=new-policy'), 2500)
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Something went wrong. Please try again.'
      setToast(Array.isArray(msg) ? msg.join(', ') : msg)
      setPurchasing(null)
    }
  }

  // ── Results screen ─────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen bg-ink px-4 py-8 md:py-12" style={{ background: '#080D1A' }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="font-syne font-black text-xl inline-block mb-5">Cover<span className="text-accent">AI</span></Link>
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold mb-3 block"
            style={{ background: 'rgba(0,194,168,.12)', color: '#00C2A8', border: '1px solid rgba(0,194,168,.25)' }}>
            ✦ AI-Matched Recommendations
          </div>
          <h1 className="font-syne font-black text-2xl md:text-3xl">Your Best Matches</h1>
          <p className="text-muted text-sm mt-2">Ranked by compatibility with your {answers.businessType} business profile</p>
        </div>

        {toast && (
          <div className="mb-5 p-4 rounded-2xl text-sm text-center"
            style={{ background: 'rgba(0,194,168,.1)', border: '1px solid rgba(0,194,168,.3)', color: '#00C2A8' }}>
            {toast}
          </div>
        )}

        {/* ── Payment frequency selector ── */}
        <div className="mb-6 p-5 rounded-2xl" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-syne font-bold text-sm">How often do you want to pay?</p>
              <p className="text-muted text-xs mt-0.5">Annual plan is always cheapest. Shorter cycles suit lower cash flow.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(46,201,126,.12)', color: '#2EC97E', border: '1px solid rgba(46,201,126,.2)' }}>
              Microinsurance ✦
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.entries(FREQ_CONFIG) as any[]).map(([key, cfg]: any) => {
              const isSelected = frequency === key
              const isAnnual = key === 'annually'
              return (
                <button key={key} onClick={() => setFrequency(key as any)}
                  className="p-3 rounded-xl text-left transition-all relative"
                  style={{
                    background: isSelected ? 'rgba(244,166,35,.15)' : 'rgba(255,255,255,.04)',
                    border: isSelected ? '1px solid rgba(244,166,35,.5)' : '1px solid rgba(255,255,255,.08)',
                  }}>
                  {isAnnual && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                      style={{ background: '#2EC97E', color: '#0A0F1E' }}>Best Value</span>
                  )}
                  <p className="font-syne font-bold text-sm" style={{ color: isSelected ? '#F4A623' : '#fff' }}>{cfg.label}</p>
                  <p className="text-[11px] text-muted mt-0.5 leading-snug">{cfg.desc}</p>
                  {isAnnual && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: '#2EC97E' }}>Save up to 20%</p>
                  )}
                  {key === 'weekly' && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: '#00C2A8' }}>{cfg.graceDays}-day grace period</p>
                  )}
                </button>
              )
            })}
          </div>
          {frequency !== 'annually' && (
            <div className="mt-3 p-3 rounded-xl flex items-start gap-2.5" style={{ background: 'rgba(244,166,35,.06)', border: '1px solid rgba(244,166,35,.15)' }}>
              <span className="text-sm shrink-0">💡</span>
              <p className="text-xs text-muted leading-relaxed">
                <span className="text-white font-semibold">Microinsurance: </span>
                Each payment covers your {FREQ_CONFIG[frequency].label.toLowerCase().replace('ly','')} period. Miss a payment and you get a <strong className="text-white">{FREQ_CONFIG[frequency].graceDays}-day grace period</strong> before coverage pauses. Pay anytime to reactivate.
              </p>
            </div>
          )}
        </div>


        {loadingProducts ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-muted text-sm">Analysing your profile and matching products…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p: any, i: number) => (
              <div key={p.id || p.name}
                className="p-5 md:p-6 rounded-2xl transition-all"
                style={{ background: 'rgba(13,27,62,.8)', border: i === 0 ? '1px solid rgba(244,166,35,.3)' : '1px solid rgba(255,255,255,.08)' }}>

                <div className="flex justify-between items-start gap-3 mb-2">
                  <h3 className="font-syne font-bold text-base md:text-lg leading-tight">{p.displayName || p.name}</h3>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                    style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623', border: '1px solid rgba(244,166,35,.3)' }}>
                    {i === 0 ? 'Best Match' : i === 1 ? 'Popular' : 'Recommended'}
                  </span>
                </div>

                <p className="text-muted text-sm mb-3 leading-relaxed">{p.description || p.desc}</p>

                <div className="flex gap-2 flex-wrap mb-4">
                  {(p.tags || []).slice(0, 4).map((t: string) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-xs capitalize"
                      style={{ background: 'rgba(0,194,168,.1)', border: '1px solid rgba(0,194,168,.2)', color: '#00C2A8' }}>{t}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    {(() => {
                      const annualBase = p.price || p.premiumMin || p.minPremium || 0
                      const { installment, annual } = calcInstallment(annualBase, frequency)
                      const cfg = FREQ_CONFIG[frequency]
                      const isAnnual = frequency === 'annually'
                      const moneySaved = isAnnual ? 0 : Math.round(annualBase * (FREQ_CONFIG['monthly'].discount - FREQ_CONFIG[frequency].discount))
                      return (
                        <>
                          <div className="font-syne font-black text-xl md:text-2xl text-accent">
                            ₦{installment.toLocaleString()}
                            <span className="text-muted text-sm font-normal">/{cfg.label.toLowerCase().replace('ly','').replace('ual','')}</span>
                          </div>
                          {!isAnnual && (
                            <div className="text-xs mt-0.5" style={{ color: '#8492B4' }}>
                              ≈ ₦{annual.toLocaleString()}/year ·{' '}
                              <span style={{ color: '#F4A623' }}>₦{annualBase.toLocaleString()} if paid annually</span>
                            </div>
                          )}
                          {p.coverageAmount && (
                            <div className="text-muted text-xs mt-0.5">
                              Covers up to <span className="text-white">₦{Number(p.coverageAmount).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="text-xs mt-1" style={{ color: '#00C2A8' }}>
                            ✦ {p.match}% match for your profile
                          </div>
                        </>
                      )
                    })()}
                  </div>
                  <button
                    onClick={() => purchase(p)}
                    disabled={!!purchasing}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-syne font-bold text-sm transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ background: i === 0 ? '#F4A623' : 'rgba(244,166,35,.15)', color: i === 0 ? '#0A0F1E' : '#F4A623', border: i === 0 ? 'none' : '1px solid rgba(244,166,35,.3)' }}>
                    {purchasing === (p.id || p.name) ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing…
                      </span>
                    ) : isLoggedIn ? 'Buy Now →' : 'Sign Up to Buy →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={() => { setDone(false); setStep(0); setAnswers({}); setProducts([]) }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-muted hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
            ← Start Over
          </button>
          {!isLoggedIn && (
            <Link href="/auth?mode=register"
              className="flex-1 py-3 rounded-xl text-sm font-bold text-center transition-all hover:brightness-110"
              style={{ background: '#F4A623', color: '#0A0F1E' }}>
              Create Account →
            </Link>
          )}
        </div>

        {/* Trust signals */}
        <div className="mt-8 p-4 rounded-2xl" style={{ background: 'rgba(13,27,62,.5)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '🔒', text: 'NAICOM Regulated' },
              { icon: '⚡', text: 'Instant Cover' },
              { icon: '🛡️', text: 'NDPR Compliant' },
            ].map(t => (
              <div key={t.text}>
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="text-muted text-xs">{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Wizard screen ─────────────────────────────────────────────
  const s = STEPS[step]
  return (
    <div className="min-h-screen" style={{ background: '#080D1A' }}>
      <div className="flex items-center justify-between px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <Link href="/" className="font-syne font-black text-lg md:text-xl">Cover<span className="text-accent">AI</span></Link>
        <div className="hidden md:flex gap-4 text-sm text-muted">
          <Link href="/chat" className="hover:text-white transition-colors">AI Assistant</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
        <Link href="/auth?mode=register" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all">
          Get Started
        </Link>
      </div>

      <div className="px-4 py-8 md:py-12">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6 md:mb-10">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent uppercase tracking-widest mb-4"
              style={{ background: 'rgba(244,166,35,.12)', border: '1px solid rgba(244,166,35,.3)' }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <h1 className="font-syne font-black text-3xl md:text-4xl">Find Your Coverage</h1>
            <p className="text-muted text-sm mt-2">Answer 4 quick questions for AI-matched recommendations</p>
          </div>

          {/* Progress */}
          <div className="flex gap-1.5 mb-8">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                style={{ background: i < step ? '#F4A623' : i === step ? 'linear-gradient(90deg, #F4A623, #00C2A8)' : 'rgba(255,255,255,.1)' }} />
            ))}
          </div>

          <div className="p-5 md:p-8 rounded-2xl" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="text-accent text-xs font-semibold uppercase tracking-widest mb-1">Question {step + 1}</div>
            <h2 className="font-syne font-bold text-lg md:text-2xl mb-6">{s.q}</h2>
            <div className="grid grid-cols-2 gap-3">
              {s.options.map((o: any) => (
                <button key={o.label} onClick={() => select(o)}
                  className="p-3 md:p-4 rounded-xl text-left transition-all active:scale-95 hover:brightness-110"
                  style={{
                    background: answers[s.key] === o.label ? 'rgba(26,58,143,.5)' : 'rgba(255,255,255,.04)',
                    border: `1px solid ${answers[s.key] === o.label ? 'rgba(244,166,35,.5)' : 'rgba(255,255,255,.1)'}`,
                  }}>
                  <div className="text-xl md:text-2xl mb-1.5">{o.icon}</div>
                  <div className="font-semibold text-xs md:text-sm leading-tight">{o.label}</div>
                  <div className="text-muted text-xs mt-0.5 leading-tight">{o.sub}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6">
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="text-muted text-sm hover:text-white transition-colors flex items-center gap-1">
                  ← Back
                </button>
              ) : <div />}
              <span className="text-muted text-xs">Select an option to continue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
