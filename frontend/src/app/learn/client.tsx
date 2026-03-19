'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const CATEGORIES = ['All', 'Basics', 'Motor', 'Business', 'Claims', 'Life & Health']

const GUIDES = [
  {
    id: 1,
    category: 'Basics',
    icon: '🛡️',
    title: 'What is Insurance? A Plain English Guide',
    readTime: '3 min',
    difficulty: 'Beginner',
    summary: 'Insurance is a financial safety net. You pay a small amount regularly (premium), and the insurer pays you back if something goes wrong.',
    content: [
      {
        heading: 'The Simple Explanation',
        body: 'Imagine 1,000 people each pay ₦10,000 into a shared pot. Most years, nothing goes wrong for most people. But when one person\'s shop burns down, they get ₦5,000,000 from that pot to rebuild. That\'s insurance — shared risk, mutual protection.',
      },
      {
        heading: 'Key Terms You Need to Know',
        body: '**Premium** — the amount you pay (monthly or yearly)\n**Policy** — your insurance contract\n**Claim** — a request for payment after a loss\n**Coverage** — what your policy protects\n**Excess/Deductible** — the amount you pay first before insurance kicks in',
      },
      {
        heading: 'Why It Matters in Nigeria',
        body: 'Nigeria has one of the lowest insurance penetration rates in Africa — under 1%. Most businesses and families have no protection. A single fire, accident, or flood can wipe out years of savings. Insurance turns catastrophic losses into manageable ones.',
      },
    ],
  },
  {
    id: 2,
    category: 'Motor',
    icon: '🚗',
    title: 'Third Party vs Comprehensive: Which Do You Need?',
    readTime: '4 min',
    difficulty: 'Beginner',
    summary: 'Third Party is legally required and covers damage you cause to others. Comprehensive adds protection for your own vehicle too.',
    content: [
      {
        heading: 'Third Party Motor Insurance',
        body: '**What it covers:** Injury or damage you cause to other people or their property while driving.\n\n**What it doesn\'t cover:** Damage to your own vehicle.\n\n**Cost:** ₦5,000–₦15,000 per year for most vehicles.\n\n**Important:** This is the **legal minimum** in Nigeria. FRSC can fine or impound your vehicle without it.',
      },
      {
        heading: 'Comprehensive Motor Insurance',
        body: '**What it covers:** Everything in Third Party PLUS damage to your own vehicle from accidents, theft, fire, flood, and vandalism.\n\n**Cost:** 2–5% of your vehicle\'s value per year. A ₦4,000,000 car = ₦80,000–₦200,000/year.\n\n**Best for:** Newer or high-value vehicles where repair/replacement costs are significant.',
      },
      {
        heading: 'How to Decide',
        body: 'If your vehicle is worth **under ₦2,000,000** and is more than 10 years old → **Third Party** is probably fine.\n\nIf your vehicle is worth **over ₦3,000,000** or is less than 5 years old → **Comprehensive** is the smarter choice. The peace of mind is worth the extra cost.',
      },
    ],
  },
  {
    id: 3,
    category: 'Business',
    icon: '🏪',
    title: 'The 5 Insurance Types Every Nigerian SME Needs',
    readTime: '5 min',
    difficulty: 'Intermediate',
    summary: 'Running a business without insurance is a gamble. Here are the 5 most important covers for Nigerian small businesses.',
    content: [
      {
        heading: '1. Fire & Burglary Insurance',
        body: '**What it covers:** Your shop, stock, and equipment if there\'s a fire or break-in.\n\n**Why it\'s critical:** One fire can destroy years of investment. This is the most important cover for any physical business.\n\n**Cost:** ₦15,000–₦50,000/year depending on stock value.',
      },
      {
        heading: '2. Public Liability Insurance',
        body: '**What it covers:** If a customer is injured in your premises (slips, falls, accidents), this covers their medical bills and legal costs.\n\n**Why it matters:** Without it, one customer injury could result in a court case that costs millions.\n\n**Cost:** ₦10,000–₦30,000/year.',
      },
      {
        heading: '3. Business Interruption Insurance',
        body: '**What it covers:** Lost income when your business can\'t operate — due to fire, flood, or other covered events.\n\n**Example:** Your shop burns down in January. Rebuilding takes 3 months. Business interruption pays your lost revenue while you\'re closed.\n\n**Often bundled** with Fire & Burglary at a slight extra cost.',
      },
      {
        heading: '4. Equipment/Machinery Cover',
        body: '**What it covers:** Your business equipment — generators, machines, computers, tools — if they break down or are damaged.\n\n**Best for:** Manufacturers, tech companies, caterers, salons — anyone who depends on equipment to operate.\n\n**Cost:** 1–3% of equipment value per year.',
      },
      {
        heading: '5. Goods in Transit',
        body: '**What it covers:** Your stock or goods while being transported — whether by road, sea, or air.\n\n**Best for:** Importers, distributors, e-commerce sellers, or any business that moves goods regularly.\n\n**Cost:** 0.5–1.5% of goods value per shipment.',
      },
    ],
  },
  {
    id: 4,
    category: 'Claims',
    icon: '📋',
    title: 'How to File a Claim & Actually Get Paid',
    readTime: '4 min',
    difficulty: 'Beginner',
    summary: 'Filing a claim correctly is crucial. Here\'s the step-by-step process and common mistakes to avoid.',
    content: [
      {
        heading: 'Step-by-Step Claims Process',
        body: '**Step 1:** Secure the scene — prevent further damage if possible.\n\n**Step 2:** Document everything immediately — photos, videos, witness contacts.\n\n**Step 3:** Report within 24–48 hours — late reporting can invalidate your claim.\n\n**Step 4:** File a police report for theft, accidents, or major incidents.\n\n**Step 5:** Submit your claim via your CoverAI dashboard with all evidence.\n\n**Step 6:** Cooperate with the assessor — don\'t hide anything.\n\n**Step 7:** Review the settlement offer carefully before signing.',
      },
      {
        heading: 'Documents You\'ll Need',
        body: '✅ Policy number and certificate\n✅ Photos/videos of the damage or incident\n✅ Police report (for theft, accidents, fire)\n✅ Purchase receipts or invoices for claimed items\n✅ Repair estimates from certified contractors\n✅ Medical reports (for injury claims)\n✅ Bank details for payment',
      },
      {
        heading: 'Common Mistakes That Get Claims Rejected',
        body: '❌ **Reporting too late** — always report within 48 hours\n❌ **Inflating the claim** — insurers investigate; fraud voids your policy\n❌ **Missing documentation** — keep receipts for everything valuable\n❌ **Not reading your policy** — know what\'s covered and what\'s excluded\n❌ **Repairing before assessment** — get insurer approval first for major repairs',
      },
    ],
  },
  {
    id: 5,
    category: 'Basics',
    icon: '💡',
    title: 'Understanding Insurance Exclusions',
    readTime: '3 min',
    difficulty: 'Intermediate',
    summary: 'Exclusions are what your policy does NOT cover. Understanding them prevents nasty surprises when you need to claim.',
    content: [
      {
        heading: 'What Are Exclusions?',
        body: 'Every insurance policy lists specific situations it will NOT cover. These are called exclusions. For example, a motor policy might exclude damage from driving under the influence, or a property policy might exclude "acts of war."\n\n**Always read the exclusions section before buying any policy.**',
      },
      {
        heading: 'Common Exclusions in Nigeria',
        body: '**Motor:** DUI accidents, using a private vehicle for commercial purposes, unlicensed drivers\n\n**Property:** Flooding (often requires separate flood cover), wear & tear, deliberate damage\n\n**Business:** Employee dishonesty (needs specific crime cover), nuclear risks, terrorism in some policies\n\n**Health:** Pre-existing conditions (often excluded for 12–24 months), elective cosmetic procedures',
      },
      {
        heading: 'How to Handle Exclusions',
        body: 'Ask your insurer: "What is specifically excluded from this policy?"\n\nFor critical risks, you can often buy **endorsements** (add-ons) to cover specific exclusions.\n\nIf something important is excluded and can\'t be added, consider a different insurer or policy.',
      },
    ],
  },
  {
    id: 6,
    category: 'Life & Health',
    icon: '❤️',
    title: 'Life Insurance in Nigeria: Who Needs It and Why',
    readTime: '5 min',
    difficulty: 'Beginner',
    summary: 'Life insurance protects your family financially if you die. In Nigeria\'s informal economy, it\'s more important than ever.',
    content: [
      {
        heading: 'Why Life Insurance Matters',
        body: 'If you are the primary earner in your household and you died tomorrow, what would happen to your family?\n\nLife insurance pays your family a lump sum (called the **sum assured**) when you die. This money can pay for education, clear debts, cover living expenses, or start a business.',
      },
      {
        heading: 'Types of Life Insurance in Nigeria',
        body: '**Term Life:** Pays out only if you die within the policy period (e.g., 20 years). Cheaper — ₦30,000–₦80,000/year for ₦5,000,000 cover.\n\n**Whole Life:** Covers you permanently until death, whenever it occurs. More expensive but guaranteed payout.\n\n**Endowment:** Savings + protection — pays you if you survive to a certain age, or your family if you die. Used for children\'s education planning.\n\n**Group Life:** Employer-provided. PENCOM mandates employers to provide 3x annual salary as group life for employees.',
      },
      {
        heading: 'How Much Cover Do You Need?',
        body: 'A simple rule: **10x your annual income**.\n\nIf you earn ₦2,000,000/year → aim for ₦20,000,000 in life cover.\n\nThis gives your family roughly 10 years to adjust financially without you. Factor in debts (mortgage, loans), children\'s education costs, and your spouse\'s earning ability.',
      },
    ],
  },
  {
    id: 7,
    category: 'Business',
    icon: '⚖️',
    title: 'NAICOM & Nigerian Insurance Regulations Explained',
    readTime: '4 min',
    difficulty: 'Advanced',
    summary: 'NAICOM regulates all insurance in Nigeria. Understanding the rules protects you from scams and ensures your insurer is legit.',
    content: [
      {
        heading: 'What is NAICOM?',
        body: 'NAICOM (National Insurance Commission) is the federal body that regulates and supervises the insurance industry in Nigeria. All legitimate insurance companies in Nigeria must be licensed by NAICOM.\n\n**Always verify your insurer is NAICOM-licensed** before buying a policy. You can check at naicom.gov.ng.',
      },
      {
        heading: 'Compulsory Insurance in Nigeria',
        body: 'The law requires these insurance types:\n\n✅ **Third Party Motor Insurance** — every vehicle\n✅ **Builders Liability** — building under construction\n✅ **Occupiers Liability** — public buildings\n✅ **Group Life Insurance** — for employees (3x annual salary minimum)\n✅ **Healthcare Workers Professional Indemnity**\n✅ **Oil & Gas Insurance** — upstream and downstream operations',
      },
      {
        heading: 'Your Rights as a Policyholder',
        body: '✅ Receive your policy document within 30 days of purchase\n✅ Cancel your policy and receive a pro-rated refund\n✅ File a complaint with NAICOM if your insurer refuses a valid claim\n✅ Receive claims payment within 90 days of a valid claim submission\n\nIf an insurer delays payment beyond 90 days without reason, they are violating NAICOM regulations.',
      },
    ],
  },
  {
    id: 8,
    category: 'Basics',
    icon: '📊',
    title: 'How Insurance Premiums Are Calculated',
    readTime: '4 min',
    difficulty: 'Intermediate',
    summary: 'Your premium isn\'t random — it\'s calculated based on specific risk factors. Understanding this helps you lower your costs.',
    content: [
      {
        heading: 'The Core Principle: Risk',
        body: 'Insurers are in the business of pricing risk. The higher the chance you\'ll make a claim, and the larger the potential claim, the higher your premium.\n\nThis is why young drivers pay more for motor insurance, smokers pay more for life insurance, and shops in high-crime areas pay more for burglary cover.',
      },
      {
        heading: 'Factors That Affect Your Premium',
        body: '**Motor:** Vehicle age & value, engine size, driver age & experience, location, claims history\n\n**Property:** Building value, location, security measures (CCTV, guards, alarms), claims history\n\n**Business:** Industry type, revenue, number of employees, location, risk management practices\n\n**Life/Health:** Age, gender, smoking status, BMI, pre-existing conditions, occupation',
      },
      {
        heading: 'How to Legally Reduce Your Premium',
        body: '✅ **Install security measures** — alarms, CCTV, security guards\n✅ **Choose a higher excess** — paying more out of pocket when claiming reduces your premium\n✅ **Build a no-claims history** — don\'t claim for small losses\n✅ **Bundle policies** — insuring multiple risks with one insurer often earns discounts\n✅ **Pay annually** — monthly payment often costs more overall\n✅ **Improve safety** — driver training for motor, fire prevention for property',
      },
    ],
  },
]

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Beginner: { bg: 'rgba(0,194,168,0.15)', color: 'var(--teal)' },
    Intermediate: { bg: 'rgba(244,166,35,0.15)', color: 'var(--accent)' },
    Advanced: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
  }
  const c = colors[level] || colors.Beginner
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.color, letterSpacing: '0.5px', textTransform: 'uppercase',
    }}>{level}</span>
  )
}

const BADGES = [
  { id: 'first_read', icon: '📖', name: 'First Step', desc: 'Read your first guide', points: 10 },
  { id: 'motor_expert', icon: '🚗', name: 'Motor Expert', desc: 'Read all Motor guides', points: 25 },
  { id: 'business_pro', icon: '🏪', name: 'Business Pro', desc: 'Read all Business guides', points: 25 },
  { id: 'claims_ready', icon: '📋', name: 'Claims Ready', desc: 'Read the Claims guide', points: 20 },
  { id: 'insurance_guru', icon: '🏆', name: 'Insurance Guru', desc: 'Read 5+ guides', points: 50 },
  { id: 'naicom_aware', icon: '⚖️', name: 'NAICOM Aware', desc: 'Read the regulations guide', points: 30 },
]

function useGamification() {
  const [readGuides, setReadGuides] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('coverai_read_guides') || '[]') } catch { return [] }
  })
  const [earnedBadges, setEarnedBadges] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('coverai_badges') || '[]') } catch { return [] }
  })
  const [newBadge, setNewBadge] = useState<typeof BADGES[0] | null>(null)

  const points = readGuides.length * 10 + earnedBadges.reduce((sum, id) => {
    const badge = BADGES.find(b => b.id === id)
    return sum + (badge?.points || 0)
  }, 0)

  const markRead = (guideId: number, guide: typeof GUIDES[0]) => {
    if (readGuides.includes(guideId)) return
    const newRead = [...readGuides, guideId]
    setReadGuides(newRead)
    localStorage.setItem('coverai_read_guides', JSON.stringify(newRead))

    // Check badge eligibility
    const newBadges = [...earnedBadges]
    const checkBadge = (id: string, condition: boolean) => {
      if (condition && !newBadges.includes(id)) {
        newBadges.push(id)
        const badge = BADGES.find(b => b.id === id)!
        setNewBadge(badge)
        setTimeout(() => setNewBadge(null), 4000)
      }
    }
    checkBadge('first_read', newRead.length === 1)
    checkBadge('insurance_guru', newRead.length >= 5)
    checkBadge('claims_ready', guide.category === 'Claims')
    checkBadge('motor_expert', GUIDES.filter(g => g.category === 'Motor').every(g => newRead.includes(g.id)))
    checkBadge('business_pro', GUIDES.filter(g => g.category === 'Business').every(g => newRead.includes(g.id)))
    checkBadge('naicom_aware', guide.title.toLowerCase().includes('naicom'))
    if (newBadges.length > earnedBadges.length) {
      setEarnedBadges(newBadges)
      localStorage.setItem('coverai_badges', JSON.stringify(newBadges))
    }
  }

  return { readGuides, earnedBadges, points, newBadge, markRead }
}

export default function LearnPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedGuide, setSelectedGuide] = useState<typeof GUIDES[0] | null>(null)
  const [expandedSections, setExpandedSections] = useState<number[]>([0])
  const { readGuides, earnedBadges, points, newBadge, markRead } = useGamification()

  const filtered = activeCategory === 'All' ? GUIDES : GUIDES.filter(g => g.category === activeCategory)

  const toggleSection = (idx: number) => {
    setExpandedSections(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  const renderBody = (text: string) =>
    text.split('\n\n').map((para, i) => (
      <p key={i} style={{ marginBottom: 12, lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{
          __html: para
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^([✅❌✅]) /gm, '$1 ')
        }}
      />
    ))

  if (selectedGuide) {
    return (
      <div className='gradient-hero' style={{ minHeight: '100vh', color: '#fff' }}>
        <Navbar />
        <div style={{ height: 64 }} />
        <div style={{ padding: '16px 24px' }}>
          <button onClick={() => { setSelectedGuide(null); setExpandedSections([0]) }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', cursor: 'pointer', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}>
            ← Back to Guides
          </button>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '96px 24px 80px' }}>
          {/* Guide header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 40 }}>{selectedGuide.icon}</span>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>{selectedGuide.category}</span>
                  <DifficultyBadge level={selectedGuide.difficulty} />
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {selectedGuide.readTime} read</span>
                </div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, lineHeight: 1.3, margin: 0 }}>{selectedGuide.title}</h1>
              </div>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, margin: 0, padding: '16px 20px', background: 'rgba(26,58,143,0.15)', borderLeft: '3px solid #1A3A8F', borderRadius: '0 12px 12px 0' }}>
              {selectedGuide.summary}
            </p>
          </div>

          {/* Accordion sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedGuide.content.map((section, idx) => (
              <div key={idx} style={{
                background: 'rgba(13,27,62,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: expandedSections.includes(idx) ? '0 4px 24px rgba(0,0,0,0.3)' : 'none',
              }}>
                <button
                  onClick={() => toggleSection(idx)}
                  style={{
                    width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16,
                  }}
                >
                  {section.heading}
                  <span style={{
                    fontSize: 20, color: 'var(--muted)', transition: 'transform 0.2s',
                    transform: expandedSections.includes(idx) ? 'rotate(45deg)' : 'rotate(0deg)',
                    display: 'inline-block',
                  }}>+</span>
                </button>
                {expandedSections.includes(idx) && (
                  <div style={{ padding: '0 20px 20px', color: '#B8C5D9', fontSize: 15 }}>
                    {renderBody(section.body)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            marginTop: 40, padding: 24, borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(26,58,143,0.4), rgba(0,194,168,0.2))',
            border: '1px solid rgba(26,58,143,0.4)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🛡️</div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Ready to get covered?</h3>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Answer 4 quick questions and get matched with the right insurance in 2 minutes.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/coverage" style={{
                padding: '12px 24px', borderRadius: 12, background: 'var(--accent)', color: '#fff',
                fontWeight: 700, fontSize: 14, textDecoration: 'none', fontFamily: 'Syne, sans-serif',
              }}>Get Coverage →</Link>
              <Link href="/chat" style={{
                padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>Ask ARIA 🤖</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='gradient-hero' style={{ minHeight: '100vh', color: '#fff' }}>
      {/* Badge earned toast */}
      {newBadge && (
        <div style={{
          position: 'fixed', top: 80, right: 20, zIndex: 9999,
          padding: '16px 20px', borderRadius: 16,
          background: 'linear-gradient(135deg, #0D1B3E, #1A3A8F)',
          border: '1px solid rgba(0,194,168,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.4s ease',
          maxWidth: 280,
        }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>{newBadge.icon}</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 4 }}>Badge Earned!</div>
          <div style={{ color: 'var(--teal)', fontWeight: 700 }}>{newBadge.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>+{newBadge.points} points</div>
        </div>
      )}
      <Navbar />
      <div style={{ height: 64 }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px 80px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14,
            background: 'rgba(0,194,168,0.12)', color: 'var(--teal)', border: '1px solid rgba(0,194,168,0.25)',
          }}>Free Education Hub</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 900, marginBottom: 14, lineHeight: 1.15 }}>
            Insurance, Explained Simply
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 17, maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.6 }}>
            No jargon. No confusion. Clear guides for Nigerian businesses and individuals — written by experts, understood by everyone.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            {[
              { value: `${GUIDES.length}`, label: 'Free Guides' },
              { value: '5 min', label: 'Avg. Read Time' },
              { value: '100%', label: 'Jargon-Free' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Gamification — Progress & Badges */}
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 24px', borderRadius: 16, background: 'rgba(26,58,143,0.2)', border: '1px solid rgba(26,58,143,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15 }}>
                🏆 Your Progress
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
                {points} pts
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, height: 8, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min((readGuides.length / GUIDES.length) * 100, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1A3A8F, #00C2A8)', borderRadius: 20, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              {readGuides.length} of {GUIDES.length} guides read
            </div>
            {/* Badges */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {BADGES.map(badge => {
                const earned = earnedBadges.includes(badge.id)
                return (
                  <div key={badge.id} title={`${badge.name}: ${badge.desc} (+${badge.points} pts)`} style={{
                    padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                    background: earned ? 'rgba(0,194,168,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${earned ? 'rgba(0,194,168,0.4)' : 'var(--border)'}`,
                    color: earned ? 'var(--teal)' : '#4A5568',
                    filter: earned ? 'none' : 'grayscale(1)',
                    transition: 'all 0.3s',
                  }}>
                    <span>{badge.icon}</span>
                    <span style={{ fontWeight: earned ? 700 : 400 }}>{badge.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                background: activeCategory === cat ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: activeCategory === cat ? 'var(--ink)' : 'var(--muted)',
                border: activeCategory === cat ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >{cat}</button>
          ))}
        </div>

        {/* Guide grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(guide => (
            <button
              key={guide.id}
              onClick={() => { setSelectedGuide(guide); setExpandedSections([0]); markRead(guide.id, guide) }}
              style={{
                background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 24, textAlign: 'left', cursor: 'pointer',
                transition: 'all 0.25s', color: '#fff', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,166,35,0.3)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span style={{ fontSize: 36 }}>{guide.icon}</span>{readGuides.includes(guide.id) && <span style={{ fontSize: 18 }} title='Read'>✅</span>}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 9px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)' }}>{guide.category}</span>
                <DifficultyBadge level={guide.difficulty} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{guide.readTime}</span>
              </div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{guide.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{guide.summary}</p>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                Read guide <span>→</span>
              </div>
            </button>
          ))}
        </div>

        {/* ARIA CTA */}
        <div style={{
          marginTop: 60, padding: '32px 40px', borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(26,58,143,0.5), rgba(0,194,168,0.2))',
          border: '1px solid rgba(26,58,143,0.4)',
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 60 }}>🤖</div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
              Still have questions?
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, marginBottom: 0 }}>
              Ask ARIA — our AI insurance assistant trained on Nigerian market knowledge. Get instant answers in plain English, 24/7.
            </p>
          </div>
          <Link href="/chat" style={{
            padding: '14px 28px', borderRadius: 14, background: 'var(--accent)', color: '#fff',
            fontWeight: 800, fontSize: 15, textDecoration: 'none', fontFamily: 'Syne, sans-serif',
            whiteSpace: 'nowrap',
          }}>
            Ask ARIA Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
