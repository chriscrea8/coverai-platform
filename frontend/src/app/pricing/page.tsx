'use client'
export const dynamic = 'force-dynamic'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

const plans = [
  { name: 'Starter', price: '₦0', per: 'Free forever', color: '#00C2A8', features: ['AI Insurance Chatbot (50 msgs/day)', '1 Active Policy', 'Basic Claims Submission', 'Email Support', 'Policy Documents'], notIncluded: ['Priority Claims', 'Phone Support', 'Embedded API', 'Analytics'] },
  { name: 'Business', price: '₦4,999', per: '/month', color: '#F4A623', featured: true, features: ['Unlimited AI Chat', 'Unlimited Policies', 'Priority Claims (48hr SLA)', 'Full SME Dashboard', 'Payment History', 'Phone & Email Support', 'Renewal Reminders'], notIncluded: ['Embedded API', 'Dedicated Manager'] },
  { name: 'Enterprise', price: 'Custom', per: 'Contact us', color: '#7C6BFF', features: ['Everything in Business', 'Embedded Insurance API', 'Dedicated Account Manager', '4hr Claims SLA', 'Custom Integrations', 'White-label Option', 'SLA Guarantee', 'NAICOM Compliance Reports'] },
]

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel your subscription at any time with no penalties. Your coverage continues until the end of your billing period.' },
  { q: 'Are the insurance premiums included in the plan price?', a: 'No. The plan price is for the CoverAI platform subscription. Insurance premiums are separate and paid directly to the insurer. We show you the full cost upfront with no hidden fees.' },
  { q: 'What payment methods do you accept?', a: 'We accept cards, bank transfers, and USSD via Paystack. All major Nigerian banks are supported.' },
  { q: 'Is my business eligible?', a: 'Any registered Nigerian business is eligible. We also serve unregistered micro-businesses. Our AI helps determine the right products for your situation.' },
  { q: 'How quickly can I get covered?', a: 'Most businesses can purchase a policy and receive confirmation within 10 minutes on the Starter and Business plans.' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20">
        <section className="py-20 px-6 text-center">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent mb-4 uppercase tracking-widest"
            style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>Pricing</div>
          <h1 className="font-syne font-black text-4xl md:text-5xl mb-4">Simple, Honest Pricing</h1>
          <p className="text-muted text-lg max-w-lg mx-auto">No hidden fees. No lock-in. Just straightforward pricing that scales with your business.</p>
        </section>

        <section className="pb-20 px-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(p => (
              <div key={p.name} className={`p-8 rounded-2xl relative ${(p as any).featured ? 'ring-2 ring-accent/40' : ''}`}
                style={{ background: (p as any).featured ? 'rgba(26,58,143,0.3)' : 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(p as any).featured && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-accent text-ink text-xs font-black">Most Popular</div>}
                <div className="font-syne font-black text-xl mb-1" style={{ color: p.color }}>{p.name}</div>
                <div className="font-syne font-black text-4xl mt-4 mb-1">{p.price}</div>
                <div className="text-muted text-sm mb-7">{p.per}</div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map(f => <li key={f} className="text-sm flex gap-2 items-start"><span style={{ color: p.color }} className="mt-0.5">✓</span>{f}</li>)}
                  {p.notIncluded?.map(f => <li key={f} className="text-sm flex gap-2 items-start text-muted/40 line-through"><span>✗</span>{f}</li>)}
                </ul>
                <Link href={p.price === 'Custom' ? '/about' : '/auth?mode=register'}
                  className="block text-center py-3 rounded-xl font-syne font-bold text-sm transition-all"
                  style={(p as any).featured ? { background: '#F4A623', color: '#0A0F1E' } : { background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
                  {p.price === 'Custom' ? 'Contact Sales' : 'Get Started Free'}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-6" style={{ background: '#0D1B3E' }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="font-syne font-black text-3xl mb-10 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(f => (
                <div key={f.q} className="p-5 rounded-2xl" style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-syne font-bold mb-2">{f.q}</div>
                  <p className="text-muted text-sm leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
