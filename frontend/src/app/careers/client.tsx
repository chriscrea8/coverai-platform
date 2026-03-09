'use client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const roles = [
  { title: 'Senior Backend Engineer', dept: 'Engineering', type: 'Full-time · Remote', location: 'Lagos / Remote', desc: 'Build and scale our NestJS backend. Experience with PostgreSQL, TypeORM, and fintech APIs required.' },
  { title: 'Product Designer', dept: 'Product', type: 'Full-time · Lagos', location: 'Lagos', desc: 'Design user experiences for Nigerian SME owners. Must understand the local market deeply.' },
  { title: 'Insurance Partnerships Manager', dept: 'Business', type: 'Full-time · Lagos', location: 'Lagos', desc: 'Onboard and manage relationships with NAICOM-regulated insurance companies across Nigeria.' },
  { title: 'AI/ML Engineer', dept: 'Engineering', type: 'Full-time · Remote', location: 'Remote', desc: 'Improve ARIA, our AI insurance assistant. Work on NLP, RAG systems, and insurance domain adaptation.' },
  { title: 'Customer Success Agent', dept: 'Operations', type: 'Full-time · Lagos', location: 'Lagos', desc: 'Support SME customers through their insurance journey. Yoruba, Igbo, or Hausa is a plus.' },
]

const perks = [
  { icon: '💰', title: 'Competitive Pay', desc: 'Market-rate salaries with equity options' },
  { icon: '🏥', title: 'Health Insurance', desc: 'Full medical, dental and vision coverage' },
  { icon: '📚', title: 'Learning Budget', desc: '₦300K/year for courses and conferences' },
  { icon: '🌍', title: 'Remote Friendly', desc: 'Work from anywhere in Africa' },
  { icon: '⚡', title: 'Fast Growth', desc: 'Early stage — your work has direct impact' },
  { icon: '🤝', title: 'Great Culture', desc: 'Diverse, inclusive team that moves fast' },
]

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20">
        <section className="py-16 px-6 text-center" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(26,58,143,0.25) 0%, transparent 70%)' }}>
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent mb-4 uppercase tracking-widest"
            style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>We're Hiring</div>
          <h1 className="font-syne font-black text-4xl md:text-5xl mb-4">Build the Future of<br /><span className="text-accent">African Insurance</span></h1>
          <p className="text-muted max-w-xl mx-auto text-lg">Join a small, focused team solving a massive problem across the continent. Every role here has outsized impact.</p>
        </section>

        <section className="py-12 px-6" style={{ background: '#0D1B3E' }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="font-syne font-black text-2xl mb-8 text-center">Why Work at CoverAI?</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {perks.map(p => (
                <div key={p.title} className="p-5 rounded-2xl" style={{ background: 'rgba(10,15,30,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-2xl mb-2">{p.icon}</div>
                  <div className="font-syne font-bold text-sm mb-1">{p.title}</div>
                  <p className="text-muted text-xs">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-syne font-black text-2xl mb-8">Open Roles</h2>
            <div className="space-y-4">
              {roles.map(r => (
                <div key={r.title} className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex flex-wrap justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-syne font-bold text-lg">{r.title}</h3>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(0,194,168,0.12)', color: '#00C2A8' }}>{r.dept}</span>
                        <span className="text-muted text-xs">{r.type}</span>
                        <span className="text-muted text-xs">📍 {r.location}</span>
                      </div>
                    </div>
                    <a href="mailto:careers@coverai.ng"
                      className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all h-fit">
                      Apply Now
                    </a>
                  </div>
                  <p className="text-muted text-sm">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-muted text-sm mt-8 text-center">
              Don't see your role? Email us at <a href="mailto:careers@coverai.ng" className="text-accent hover:underline">careers@coverai.ng</a>
            </p>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
