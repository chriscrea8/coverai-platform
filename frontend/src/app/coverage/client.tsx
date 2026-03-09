'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STEPS = [
  { q: 'What type of business do you run?', options: [
    { icon: '🏪', label: 'Retail Shop', sub: 'Store, market stall, boutique' },
    { icon: '🏭', label: 'Manufacturing', sub: 'Production, processing, factory' },
    { icon: '💻', label: 'Tech / Services', sub: 'Agency, consultancy, software' },
    { icon: '🚗', label: 'Transport / Logistics', sub: 'Fleet, delivery, haulage' },
  ]},
  { q: 'Where is your business?', options: [
    { icon: '🌆', label: 'Lagos', sub: 'Southwest' },
    { icon: '🏛️', label: 'Abuja', sub: 'FCT' },
    { icon: '🌊', label: 'Port Harcourt', sub: 'Rivers State' },
    { icon: '📍', label: 'Other State', sub: 'Rest of Nigeria' },
  ]},
  { q: 'Your main risk concern?', options: [
    { icon: '🔥', label: 'Fire & Damage', sub: 'Property, equipment' },
    { icon: '🔑', label: 'Theft & Burglary', sub: 'Goods, cash, assets' },
    { icon: '⚖️', label: 'Liability', sub: 'Customer injuries' },
    { icon: '🦠', label: 'Business Interruption', sub: 'Revenue loss' },
  ]},
  { q: 'Monthly revenue range?', options: [
    { icon: '💰', label: 'Below ₦500K', sub: 'Micro business' },
    { icon: '💵', label: '₦500K – ₦2M', sub: 'Small business' },
    { icon: '💎', label: '₦2M – ₦10M', sub: 'Medium business' },
    { icon: '🏆', label: 'Above ₦10M', sub: 'Large SME' },
  ]},
]

const PLANS = [
  { name: 'Business Shield Basic', desc: 'Essential coverage for small businesses — property, liability, and theft protection.', price: 18500, tags: ['Property Cover', 'Theft Protection', 'Fire & Damage'], badge: 'Best Value', match: 94 },
  { name: 'SME Complete Package', desc: 'Full protection including business interruption. Most popular among Nigerian SMEs.', price: 42000, tags: ['Full Property', 'Liability', 'Business Interruption'], badge: 'Most Popular', match: 89 },
  { name: 'Enterprise Pro', desc: 'Maximum coverage for high-value businesses and growing enterprises.', price: 95000, tags: ['Cyber Insurance', 'D&O Liability', 'All Risks'], badge: 'Premium', match: 76 },
]

export default function CoveragePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<any>({})
  const [done, setDone] = useState(false)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsLoggedIn(!!token)
  }, [])

  const select = (opt: string) => {
    const next = { ...answers, [step]: opt }
    setAnswers(next)
    if (step < STEPS.length - 1) setTimeout(() => setStep(step + 1), 200)
    else setTimeout(() => setDone(true), 300)
  }

  const purchase = async (plan: any) => {
    if (!isLoggedIn) { router.push('/auth?mode=register'); return }
    setPurchasing(plan.name)
    try {
      const token = localStorage.getItem('access_token')
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const policyRes = await fetch(`${API}/policies/purchase`, {
        method: 'POST', headers,
        body: JSON.stringify({
          productId: '00000000-0000-0000-0000-000000000001',
          providerId: '00000000-0000-0000-0000-000000000001',
          premiumAmount: plan.price,
          policyDetails: { planName: plan.name, answers },
        }),
      })
      const policyData = await policyRes.json()
      const policyId = policyData.data?.id
      const payRes = await fetch(`${API}/payments/create`, {
        method: 'POST', headers,
        body: JSON.stringify({ policyId, amount: plan.price }),
      })
      const payData = await payRes.json()
      const authUrl = payData.data?.authorizationUrl
      if (authUrl) window.location.href = authUrl
      else { setToast('Policy created! Complete payment in your dashboard.'); setTimeout(() => router.push('/dashboard'), 2000) }
    } catch {
      setToast('Error creating policy. Please try again.')
    }
    setPurchasing(null)
  }

  if (done) return (
    <div className="min-h-screen bg-ink px-4 py-10 md:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></Link>
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal mb-3 mt-5 uppercase tracking-widest block"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>Your Matches</div>
          <h1 className="font-syne font-black text-2xl md:text-3xl">Recommended Policies</h1>
          <p className="text-muted text-sm mt-2">Sorted by best match for your business</p>
        </div>
        {toast && <div className="mb-4 p-4 rounded-xl text-sm text-center" style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.3)', color: '#00C2A8' }}>{toast}</div>}
        <div className="space-y-4">
          {PLANS.map(p => (
            <div key={p.name} className="p-5 md:p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-syne font-bold text-base md:text-lg">{p.name}</h3>
                <span className="px-2 py-1 rounded-full text-xs font-bold shrink-0"
                  style={{ background: 'rgba(244,166,35,0.15)', color: '#F4A623', border: '1px solid rgba(244,166,35,0.3)' }}>{p.badge}</span>
              </div>
              <p className="text-muted text-sm mb-3">{p.desc}</p>
              <div className="flex gap-2 flex-wrap mb-4">
                {p.tags.map(t => <span key={t} className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.2)', color: '#00C2A8' }}>{t}</span>)}
              </div>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-syne font-black text-xl md:text-2xl text-accent">₦{p.price.toLocaleString()}<span className="text-muted text-sm font-normal">/year</span></div>
                  <div className="text-teal text-xs mt-1">✓ {p.match}% match for your profile</div>
                </div>
                <button onClick={() => purchase(p)} disabled={!!purchasing}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all disabled:opacity-50">
                  {purchasing === p.name ? 'Processing...' : 'Buy Now →'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { setDone(false); setStep(0); setAnswers({}) }}
          className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-muted hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>← Start Over</button>
      </div>
    </div>
  )

  const s = STEPS[step]
  return (
    <div className="min-h-screen bg-ink">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/5">
        <Link href="/" className="font-syne font-black text-lg md:text-xl">Cover<span className="text-accent">AI</span></Link>
        <div className="hidden md:flex gap-4 text-sm text-muted">
          <Link href="/chat" className="hover:text-white transition-colors">AI Assistant</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
        <Link href="/auth?mode=register" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all">Get Started</Link>
      </div>
      <div className="px-4 py-8 md:py-12">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6 md:mb-10">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent uppercase tracking-widest"
              style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>
              Step {step + 1} of {STEPS.length}
            </div>
            <h1 className="font-syne font-black text-3xl md:text-4xl mt-4">Find Your Coverage</h1>
          </div>
          <div className="flex gap-2 mb-6 md:mb-8">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                style={{ background: i < step ? '#F4A623' : i === step ? 'linear-gradient(90deg, #F4A623, #00C2A8)' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </div>
          <div className="p-5 md:p-8 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-accent text-xs font-semibold uppercase tracking-widest mb-2">Question {step + 1}</div>
            <h2 className="font-syne font-bold text-lg md:text-2xl mb-6 md:mb-8">{s.q}</h2>
            <div className="grid grid-cols-2 gap-3">
              {s.options.map(o => (
                <button key={o.label} onClick={() => select(o.label)}
                  className="p-3 md:p-4 rounded-xl text-left transition-all active:scale-95"
                  style={{ background: answers[step] === o.label ? 'rgba(26,58,143,0.5)' : 'rgba(255,255,255,0.04)', border: `1px solid ${answers[step] === o.label ? '#1A3A8F' : 'rgba(255,255,255,0.1)'}` }}>
                  <div className="text-xl md:text-2xl mb-1.5">{o.icon}</div>
                  <div className="font-semibold text-xs md:text-sm leading-tight">{o.label}</div>
                  <div className="text-muted text-xs mt-0.5 leading-tight">{o.sub}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center mt-5 md:mt-6">
              {step > 0 ? (
                <button onClick={() => setStep(step - 1)} className="text-muted text-sm hover:text-white transition-colors">← Back</button>
              ) : <div />}
              <span className="text-muted text-xs">Select an option to continue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
