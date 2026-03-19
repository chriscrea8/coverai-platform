'use client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function EmbeddedApiPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20">
        <section className="py-20 px-6 text-center" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124,107,255,0.2) 0%, transparent 70%)' }}>
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-widest" style={{ background: 'rgba(124,107,255,0.12)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,0.3)' }}>For Developers</div>
          <h1 className="font-syne font-black text-4xl md:text-6xl mb-6">Embedded Insurance API</h1>
          <p className="text-muted text-lg max-w-2xl mx-auto mb-8">Add insurance products directly into your fintech app, BNPL platform, or e-commerce checkout. One API. All of Nigeria's top insurers.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="mailto:api@coverai.ng" className="px-8 py-4 rounded-xl bg-accent text-ink font-syne font-bold hover:bg-yellow-400 transition-all">Request API Access</a>
            <Link href="/about" className="px-8 py-4 rounded-xl text-white font-syne font-semibold hover:bg-white/10 transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>Talk to Sales</Link>
          </div>
        </section>

        <section className="py-16 px-6" style={{ background: 'var(--navy)' }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-syne font-black text-3xl mb-10 text-center">What You Can Build</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: '💳', title: 'BNPL + Insurance Bundles', desc: 'Offer device or goods insurance at the point of purchase. Increase transaction value and customer trust.' },
                { icon: '🚚', title: 'Logistics & Delivery Protection', desc: 'Automatically insure shipments. Offer goods-in-transit coverage inside your logistics app.' },
                { icon: '🏦', title: 'SME Banking Products', desc: 'Bundle business insurance with SME loans, current accounts, or POS terminals via your banking super-app.' },
                { icon: '🛒', title: 'E-commerce Checkout Insurance', desc: 'Add product protection at checkout. Customers buy coverage in one tap without leaving your platform.' },
                { icon: '🚗', title: 'Mobility & Fleet', desc: 'Ride-hailing, car rental, and fleet management apps can offer motor insurance natively.' },
                { icon: '🤖', title: 'White-label AI Assistant', desc: 'Embed ARIA, our AI insurance chatbot, directly into your customer-facing product.' },
              ].map(f => (
                <div key={f.title} className="p-6 rounded-2xl" style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-syne font-bold mb-2">{f.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-syne font-black text-3xl mb-8 text-center">Simple Integration</h2>
            <div className="p-6 rounded-2xl font-mono text-sm" style={{ background: 'var(--ink)', border: '1px solid rgba(124,107,255,0.3)' }}>
              <div className="text-muted mb-2">{'// Get insurance quote'}</div>
              <div><span className="text-purple-400">const</span> <span className="text-blue-300">quote</span> = <span className="text-purple-400">await</span> <span className="text-yellow-300">coverai</span>.<span className="text-green-300">quotes</span>.<span className="text-blue-200">create</span>{'({'}</div>
              <div className="ml-4"><span className="text-orange-300">businessType</span>: <span className="text-green-200">'retail'</span>,</div>
              <div className="ml-4"><span className="text-orange-300">coverageType</span>: <span className="text-green-200">'fire_burglary'</span>,</div>
              <div className="ml-4"><span className="text-orange-300">assetValue</span>: <span className="text-blue-300">5000000</span>,</div>
              <div className="ml-4"><span className="text-orange-300">location</span>: <span className="text-green-200">'Lagos'</span>,</div>
              <div>{'});'}</div>
              <div className="mt-4 text-muted">{'// Response'}</div>
              <div><span className="text-green-200">{'{ premium: 18500, provider: "Leadway", policyId: "..." }'}</span></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {[['99.9%', 'Uptime SLA'], ['< 200ms', 'API Response Time'], ['5 mins', 'Integration Time']].map(([v, l]) => (
                <div key={l} className="p-5 rounded-2xl text-center" style={{ background: 'var(--glass-1)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-syne font-black text-2xl text-accent">{v}</div>
                  <div className="text-muted text-xs mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6 text-center" style={{ background: 'var(--navy)' }}>
          <h2 className="font-syne font-black text-3xl mb-4">Ready to integrate?</h2>
          <p className="text-muted mb-8">Contact our partnerships team to get API credentials and sandbox access.</p>
          <a href="mailto:api@coverai.ng" className="px-8 py-4 rounded-xl bg-accent text-ink font-syne font-bold inline-block hover:bg-yellow-400 transition-all">Get API Access →</a>
        </section>
      </div>
      <Footer />
    </div>
  )
}
