'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { chatApi } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'

const PROMPTS = [
  "What insurance does a small shop need?",
  "Explain third party motor insurance simply",
  "How do I file a claim step by step?",
  "Which insurance covers theft for my business?",
]

// Rich local fallbacks — used when API is unavailable
const LOCAL_ANSWERS: Record<string, string> = {
  default: `Great question! Let me help you understand insurance for your business.\n\nHere's a simple way to think about it: **insurance is like a safety net**. You pay a small amount (called a premium) every month or year. If something bad happens — fire, theft, accident — the insurance company pays you back so your business can recover.\n\nFor Nigerian SMEs, the most common types are:\n- **Fire & Burglary** – protects your shop and goods\n- **Motor (Third Party)** – legally required if you have a vehicle\n- **Business Owner's Policy (BOP)** – bundles multiple covers in one\n\nWhat type of business do you run? I can give you a more specific recommendation! 🎯`,

  shop: `For a **retail shop or market stall**, here's what you need:\n\n**1. Fire & Burglary Insurance** *(Most Important)*\nCovers your shop contents, stock, and equipment if there's a fire or someone breaks in. Costs roughly ₦15,000–₦40,000/year depending on stock value.\n\n**2. Public Liability Insurance**\nIf a customer slips and falls in your shop, this covers you. Very affordable — around ₦10,000/year.\n\n**3. Goods in Transit** *(If you buy or sell goods in bulk)*\nProtects your stock while it's being transported.\n\n**Where to start:** Click "Get Coverage" above and answer 4 simple questions. We'll match you with the right plan in under 2 minutes! ✅`,

  motor: `**Third Party Motor Insurance** is the simplest to understand:\n\n**What it means in plain language:**\nImagine you're driving and you accidentally hit someone's car or injure a person. Without insurance, YOU pay all their repair bills and medical costs — which could be millions of naira.\n\nThird Party insurance means the **insurance company pays the other person** instead of you.\n\n**Key facts for Nigeria:**\n- ✅ It is **LEGALLY REQUIRED** — FRSC can impound your vehicle without it\n- ✅ Cost: ₦5,000–₦15,000/year for most vehicles\n- ❌ It does NOT cover damage to YOUR own vehicle\n\n**Want more protection?** Comprehensive insurance covers BOTH the other person AND your own car. Costs more but gives full peace of mind.\n\nWant me to help you figure out which is right for you? 🚗`,

  claim: `**How to file a claim — step by step:**\n\n**Step 1: Don't panic, document everything** 📸\nTake photos immediately. The more evidence, the faster your claim.\n\n**Step 2: Report within 24-48 hours**\nLog into your CoverAI dashboard and click "New Claim". Late reporting can reduce your payout.\n\n**Step 3: Fill the claim form**\nYou'll need: policy number, date of incident, what happened, estimated loss amount.\n\n**Step 4: Submit evidence**\nUpload photos, police report (for theft), receipts or invoices for stolen/damaged items.\n\n**Step 5: Wait for assessment**\nA claims officer reviews your case — usually within 5-7 working days.\n\n**Step 6: Get paid**\nApproved claims are paid directly to your bank account. 💰\n\n**Pro tip:** Keep all purchase receipts for expensive items — it speeds up your claim significantly!`,

  theft: `**Insurance that covers theft for businesses:**\n\n**1. Burglary & House Breaking Insurance** *(Best for shops)*\nCovers theft where the thief breaks in — broken doors, forced entry. Pays for stolen goods and repair of damage.\n\n**2. All Risks Insurance** *(Comprehensive)*\nCovers theft anywhere — even if an employee steals or goods disappear during delivery.\n\n**3. Money Insurance**\nSpecifically covers cash stolen from your premises or while in transit to the bank.\n\n**What you need to make a claim:**\n- Police report (very important — get this immediately)\n- List of stolen items with estimated values\n- Proof of purchase where possible\n\n**Average cost:** ₦20,000–₦80,000/year depending on your stock value and location.\n\nWant a personalized quote? Click "Get Coverage" → answer 4 questions → see your options instantly! 🛡️`,
}

function getLocalAnswer(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('shop') || m.includes('store') || m.includes('market') || m.includes('retail') || m.includes('small business')) return LOCAL_ANSWERS.shop
  if (m.includes('motor') || m.includes('car') || m.includes('vehicle') || m.includes('third party') || m.includes('drive')) return LOCAL_ANSWERS.motor
  if (m.includes('claim') || m.includes('file') || m.includes('submit') || m.includes('how to')) return LOCAL_ANSWERS.claim
  if (m.includes('theft') || m.includes('steal') || m.includes('rob') || m.includes('burglary') || m.includes('stolen')) return LOCAL_ANSWERS.theft
  return LOCAL_ANSWERS.default
}

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', text: "Hello! I'm **ARIA** — your AI Insurance Assistant for Nigerian businesses 🇳🇬\n\nI speak plain language — no confusing insurance jargon. I can help you:\n- Understand what insurance your business actually needs\n- Explain what each policy covers in simple terms\n- Guide you through filing a claim\n- Find the most affordable coverage for your budget\n\nWhat would you like to know? You can type your question or tap one of the suggestions below 👇" }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const send = async (msg: string) => {
    if (!msg.trim() || typing) return
    const newMsgs = [...messages, { role: 'user', text: msg }]
    setMessages(newMsgs)
    setInput('')
    setTyping(true)
    try {
      const res = await chatApi.send(msg, sessionId)
      const reply = res.data?.data?.message || res.data?.message
      // If API returns a useful reply, use it; otherwise use our rich local fallback
      const finalReply = (reply && reply.length > 80 && !reply.includes("I'm here to help with all your insurance"))
        ? reply
        : getLocalAnswer(msg)
      setMessages([...newMsgs, { role: 'assistant', text: finalReply }])
    } catch {
      // API unavailable — use rich local answer
      setMessages([...newMsgs, { role: 'assistant', text: getLocalAnswer(msg) }])
    }
    setTyping(false)
  }

  const renderText = (t: string) =>
    t.split('\n').map((line, i) => {
      const html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- /, '• ')
      return <div key={i} dangerouslySetInnerHTML={{ __html: html }}
        style={{ marginBottom: line === '' ? 8 : 2, paddingLeft: line.startsWith('•') ? 4 : 0 }} />
    })

  return (
    <div className="min-h-screen bg-ink flex flex-col"
      style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(26,58,143,0.2) 0%, transparent 70%), #0A0F1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></Link>
        <div className="flex gap-3">
          <Link href="/dashboard" className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Dashboard</Link>
          <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold hover:bg-yellow-400 transition-all">Get Coverage</Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal mb-3 uppercase tracking-widest"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>AI Powered</div>
          <h1 className="font-syne font-black text-3xl">Insurance Assistant</h1>
          <p className="text-muted text-sm mt-2">Ask anything in plain language — no insurance knowledge needed</p>
        </div>

        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
          {/* ARIA header */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(26,58,143,0.2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' }}>🤖</div>
            <div>
              <div className="font-syne font-bold text-sm">ARIA — Insurance Assistant</div>
              <div className="text-teal text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" style={{ animation: 'pulse 2s infinite' }} />
                Speaks plain language · No jargon
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto min-h-72 max-h-[480px] flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'ml-auto flex-row-reverse max-w-[85%]' : 'max-w-[90%]'}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                  style={m.role === 'assistant' ? { background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' } : { background: 'rgba(244,166,35,0.2)' }}>
                  {m.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className="text-sm leading-relaxed px-4 py-3 rounded-2xl"
                  style={m.role === 'assistant'
                    ? { background: 'rgba(26,58,143,0.35)', border: '1px solid rgba(26,58,143,0.5)', borderBottomLeftRadius: 4 }
                    : { background: '#F4A623', color: '#0A0F1E', fontWeight: 500, borderBottomRightRadius: 4 }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-3 max-w-xs">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' }}>🤖</div>
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center"
                  style={{ background: 'rgba(26,58,143,0.35)', border: '1px solid rgba(26,58,143,0.5)' }}>
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 rounded-full bg-muted inline-block"
                      style={{ animation: `bounce 1s ${d}ms infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          <div className="px-4 pb-3 pt-1 flex gap-2 flex-wrap border-t border-white/5 pt-3">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)}
                className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-white hover:border-accent/50 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-3 flex gap-3 items-center border-t border-white/5" style={{ background: 'rgba(10,15,30,0.8)' }}>
            <input
              className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-muted outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Ask about insurance in plain language..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
            />
            <button onClick={() => send(input)} disabled={typing}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-ink text-lg transition-all hover:bg-yellow-400 disabled:opacity-50 shrink-0"
              style={{ background: '#F4A623' }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
