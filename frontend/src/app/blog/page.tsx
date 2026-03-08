'use client'
export const dynamic = 'force-dynamic'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

const posts = [
  { slug: '#', title: 'Why Every Nigerian SME Needs Business Insurance in 2026', category: 'Education', date: 'Mar 5, 2026', read: '5 min read', excerpt: 'Over 70% of Nigerian small businesses have no insurance coverage. We break down the real cost of being uninsured and how to fix it today.', icon: '📊' },
  { slug: '#', title: 'Understanding Third Party Motor Insurance: A Plain English Guide', category: 'How-To', date: 'Feb 28, 2026', read: '4 min read', excerpt: 'The FRSC can impound your vehicle if you don\'t have it. Here\'s exactly what third party motor insurance covers and what it doesn\'t.', icon: '🚗' },
  { slug: '#', title: 'How to File an Insurance Claim and Actually Get Paid', category: 'Guide', date: 'Feb 20, 2026', read: '6 min read', excerpt: 'Most claims get delayed or rejected due to avoidable mistakes. Follow this step-by-step guide to ensure your claim is processed fast.', icon: '⚡' },
  { slug: '#', title: 'Fire Insurance for Lagos Market Traders: What You Need to Know', category: 'SME Focus', date: 'Feb 14, 2026', read: '4 min read', excerpt: 'Alaba, Balogun, Oshodi — market fires in Lagos destroy millions of naira in stock every year. Here\'s how to protect yourself affordably.', icon: '🔥' },
  { slug: '#', title: 'CoverAI Raises Seed Round to Expand Across West Africa', category: 'Company News', date: 'Feb 1, 2026', read: '2 min read', excerpt: 'We\'re excited to announce our seed funding round, led by a consortium of African fintech investors, to bring AI-powered insurance to more markets.', icon: '🚀' },
  { slug: '#', title: 'The Complete Guide to SME Insurance in Nigeria', category: 'Education', date: 'Jan 20, 2026', read: '8 min read', excerpt: 'From fire and burglary to liability and business interruption — a comprehensive breakdown of every insurance product every Nigerian business should consider.', icon: '📚' },
]

const categories = ['All', 'Education', 'How-To', 'Guide', 'SME Focus', 'Company News']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20">
        <section className="py-16 px-6 text-center">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal mb-4 uppercase tracking-widest"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>Blog</div>
          <h1 className="font-syne font-black text-4xl md:text-5xl mb-4">Insurance, Simplified</h1>
          <p className="text-muted max-w-lg mx-auto">Plain-language guides and insights to help Nigerian businesses understand and use insurance effectively.</p>
        </section>

        <section className="pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex gap-2 flex-wrap mb-10 justify-center">
              {categories.map(c => (
                <button key={c} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${c === 'All' ? 'bg-accent text-ink' : 'text-muted hover:text-white'}`}
                  style={c !== 'All' ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' } : {}}>
                  {c}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map(p => (
                <Link key={p.title} href={p.slug}
                  className="p-6 rounded-2xl flex flex-col transition-all hover:-translate-y-1"
                  style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-3xl mb-4">{p.icon}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,194,168,0.12)', color: '#00C2A8' }}>{p.category}</span>
                    <span className="text-muted text-xs">{p.read}</span>
                  </div>
                  <h3 className="font-syne font-bold text-base mb-2 leading-tight flex-1">{p.title}</h3>
                  <p className="text-muted text-sm leading-relaxed mb-4">{p.excerpt}</p>
                  <div className="text-muted text-xs">{p.date}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
