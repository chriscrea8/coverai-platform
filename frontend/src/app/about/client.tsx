'use client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

const team = [
  { name: 'Adebayo Okafor', role: 'CEO & Co-Founder', bio: 'Former MD at Leadway Assurance. 15 years in African insurance markets.', avatar: '👨🏿‍💼' },
  { name: 'Chioma Eze', role: 'CTO & Co-Founder', bio: 'Ex-Flutterwave engineering lead. Built payment infrastructure for 50+ fintechs.', avatar: '👩🏿‍💻' },
  { name: 'Emeka Nwosu', role: 'Head of Partnerships', bio: 'Former NAICOM regulatory officer. Expert in Nigerian insurance compliance.', avatar: '👨🏿‍⚖️' },
  { name: 'Amina Bello', role: 'Head of Product', bio: 'Previously at Interswitch. Passionate about making financial products accessible.', avatar: '👩🏾‍🎨' },
]

const values = [
  { icon: '🎯', title: 'Simplicity First', desc: 'Insurance in Nigeria has been confusing for too long. We make every product, process, and policy easy to understand.' },
  { icon: '🤝', title: 'Built for Africans', desc: 'We understand the local market — from Alaba market traders to Lekki tech startups. Our products are designed for real Nigerian businesses.' },
  { icon: '⚡', title: 'Speed & Access', desc: 'No long queues. No paperwork. Get covered in minutes, file claims from your phone, get paid faster than any traditional insurer.' },
  { icon: '🔒', title: 'Trust & Transparency', desc: 'NAICOM regulated. No hidden fees. No small print surprises. We tell you exactly what you are paying for and what you are covered for.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20">
        {/* Hero */}
        <section className="py-20 px-6 text-center" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(26,58,143,0.25) 0%, transparent 70%)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal mb-4 uppercase tracking-widest"
              style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>Our Story</div>
            <h1 className="font-syne font-black text-4xl md:text-6xl mb-6">Insurance That Finally<br /><span className="text-accent">Works for Africa</span></h1>
            <p className="text-muted text-lg leading-relaxed">
              We started CoverAI because we watched our parents, aunties, and fellow entrepreneurs lose everything to fires, floods, and theft — with no insurance to fall back on. Not because insurance doesn't exist, but because it was too confusing, too expensive, or just too hard to access.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 px-6" style={{ background: '#0D1B3E' }}>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-syne font-black text-3xl md:text-4xl mb-5">Our Mission</h2>
              <p className="text-muted leading-relaxed mb-4">
                To make insurance understandable, accessible, and affordable for every African business — from the market trader in Onitsha to the tech startup in Lagos.
              </p>
              <p className="text-muted leading-relaxed mb-6">
                We use AI not to replace human judgment, but to translate complex insurance products into plain language that every business owner can act on.
              </p>
              <div className="flex gap-3">
                <Link href="/coverage" className="px-6 py-3 rounded-xl bg-accent text-ink font-syne font-bold text-sm hover:bg-yellow-400 transition-all">
                  Get Covered →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[['2026', 'Founded'], ['10,000+', 'Businesses Protected'], ['₦2.4B', 'Claims Processed'], ['98%', 'Satisfaction Rate']].map(([v, l]) => (
                <div key={l} className="p-5 rounded-2xl text-center" style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="font-syne font-black text-2xl text-accent">{v}</div>
                  <div className="text-muted text-xs mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-syne font-black text-3xl mb-10 text-center">What We Stand For</h2>
            <div className="grid md:grid-cols-2 gap-5">
              {values.map(v => (
                <div key={v.title} className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-3xl mb-3">{v.icon}</div>
                  <h3 className="font-syne font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 px-6" style={{ background: '#0D1B3E' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="font-syne font-black text-3xl mb-10 text-center">Meet the Team</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {team.map(m => (
                <div key={m.name} className="p-5 rounded-2xl text-center" style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-4xl mb-3">{m.avatar}</div>
                  <div className="font-syne font-bold text-sm">{m.name}</div>
                  <div className="text-accent text-xs mt-0.5 mb-2">{m.role}</div>
                  <p className="text-muted text-xs leading-relaxed">{m.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6 text-center">
          <h2 className="font-syne font-black text-3xl mb-4">Ready to Protect Your Business?</h2>
          <p className="text-muted mb-8">Join thousands of Nigerian businesses already covered by CoverAI.</p>
          <Link href="/auth?mode=register" className="px-8 py-4 rounded-xl bg-accent text-ink font-syne font-bold inline-block hover:bg-yellow-400 transition-all">
            Get Started Free →
          </Link>
        </section>
      </div>
      <Footer />
    </div>
  )
}
