'use client'
export const dynamic = 'force-dynamic'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { chatApi } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'

const PROMPTS = [
  "What insurance does a small shop need?",
  "Explain third party motor insurance simply",
  "How do I file a claim?",
  "Which insurance covers theft?",
]

const LOCAL_ANSWERS: Record<string, string> = {
  default: `Great question! Let me explain insurance simply.\n\n**Insurance is like a safety net for your business.** You pay a small amount every month or year (called a premium). If something bad happens — fire, theft, accident — the insurance company pays you back so your business can recover instead of you losing everything.\n\nFor Nigerian SMEs, the most important types are:\n- **Fire & Burglary** — protects your shop and stock\n- **Motor (Third Party)** — legally required if you have a vehicle\n- **Business Owner's Policy** — bundles everything in one plan\n\nWhat type of business do you run? I can give you a specific recommendation! 🎯`,
  shop: `For a **retail shop or market stall**, here's what you need:\n\n**1. Fire & Burglary Insurance** *(Most Important)*\nCovers your stock and equipment if there's a fire or break-in. Costs ₦15,000–₦40,000/year.\n\n**2. Public Liability**\nIf a customer gets injured in your shop, this covers you. About ₦10,000/year.\n\n**3. Goods in Transit** *(if you move stock in bulk)*\nProtects your goods while being transported.\n\n**Quick start:** Click "Get Coverage" → answer 4 questions → get matched in 2 minutes! ✅`,
  motor: `**Third Party Motor Insurance — plain English:**\n\nIf you hit someone's car or injure a person while driving, YOU normally pay all their costs — which could be millions of naira.\n\nThird Party insurance means the **insurance company pays the other person** instead of you.\n\n**Key facts:**\n- ✅ LEGALLY REQUIRED by FRSC — you can be fined or impounded without it\n- ✅ Cost: ₦5,000–₦15,000/year for most vehicles\n- ❌ Does NOT cover damage to YOUR own vehicle\n\n**Want more?** Comprehensive insurance covers both parties. More expensive but full protection. 🚗`,
  claim: `**How to file a claim — step by step:**\n\n**Step 1:** Take photos immediately — the more evidence the better 📸\n\n**Step 2:** Report within 24–48 hours via your CoverAI dashboard → "New Claim"\n\n**Step 3:** Fill the form — policy number, date, what happened, estimated loss\n\n**Step 4:** Upload evidence — photos, police report (for theft), receipts\n\n**Step 5:** Claims officer reviews — usually 5–7 working days\n\n**Step 6:** Approved claims paid directly to your bank account 💰\n\n**Tip:** Always keep receipts for expensive items — it speeds everything up!`,
  theft: `**Insurance that covers theft:**\n\n**1. Burglary & House Breaking** *(Best for shops)*\nCovers theft where the thief breaks in — pays for stolen goods and damage repair.\n\n**2. All Risks Insurance**\nCovers theft anywhere — even employee theft or goods stolen during delivery.\n\n**3. Money Insurance**\nSpecifically covers cash stolen from your premises or in transit to the bank.\n\n**For your claim you'll need:**\n- Police report (get this immediately — very important)\n- List of stolen items with values\n- Proof of purchase where available\n\n**Average cost:** ₦20,000–₦80,000/year depending on stock value. 🛡️`,
}

function getLocalAnswer(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('shop') || m.includes('store') || m.includes('market') || m.includes('retail')) return LOCAL_ANSWERS.shop
  if (m.includes('motor') || m.includes('car') || m.includes('vehicle') || m.includes('third party') || m.includes('drive')) return LOCAL_ANSWERS.motor
  if (m.includes('claim') || m.includes('file') || m.includes('submit') || m.includes('how to')) return LOCAL_ANSWERS.claim
  if (m.includes('theft') || m.includes('steal') || m.includes('rob') || m.includes('burglary') || m.includes('stolen')) return LOCAL_ANSWERS.theft
  return LOCAL_ANSWERS.default
}

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', text: "Hello! I'm **ARIA** — your AI Insurance Assistant for Nigerian businesses 🇳🇬\n\nI speak plain language — no confusing jargon. I can help you:\n- Understand what insurance your business actually needs\n- Explain policies in simple terms\n- Guide you through filing a claim\n- Find affordable coverage for your budget\n\nWhat would you like to know? Tap a suggestion below or type your question 👇" }
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
      const finalReply = (reply && reply.length > 80 && !reply.includes("I'm here to help with all your insurance"))
        ? reply : getLocalAnswer(msg)
      setMessages([...newMsgs, { role: 'assistant', text: finalReply }])
    } catch {
      setMessages([...newMsgs, { role: 'assistant', text: getLocalAnswer(msg) }])
    }
    setTyping(false)
  }

  const renderText = (t: string) =>
    t.split('\n').map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^- /, '• ')
      return <div key={i} dangerouslySetInnerHTML={{ __html: html }}
        style={{ marginBottom: line === '' ? 8 : 2, paddingLeft: line.startsWith('•') ? 4 : 0 }} />
    })

  return (
    <div className="min-h-screen bg-ink flex flex-col"
      style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(26,58,143,0.2) 0%, transparent 70%), #0A0F1E' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-white/5 sticky top-0 z-10"
        style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" className="font-syne font-black text-lg md:text-xl">Cover<span className="text-accent">AI</span></Link>
        <div className="flex gap-2 md:gap-3">
          <Link href="/dashboard" className="px-3 md:px-4 py-2 text-xs md:text-sm text-muted hover:text-white transition-colors hidden sm:block">Dashboard</Link>
          <Link href="/coverage" className="px-3 md:px-4 py-2 rounded-xl bg-accent text-ink text-xs md:text-sm font-bold hover:bg-yellow-400 transition-all">Get Coverage</Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-3 md:px-4 py-4 md:py-8">
        <div className="text-center mb-4 md:mb-8">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-teal mb-2 uppercase tracking-widest"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>AI Powered</div>
          <h1 className="font-syne font-black text-2xl md:text-3xl">Insurance Assistant</h1>
          <p className="text-muted text-xs md:text-sm mt-1">Ask anything in plain language — no insurance knowledge needed</p>
        </div>

        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden"
          style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* ARIA header */}
          <div className="px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 border-b border-white/5"
            style={{ background: 'rgba(26,58,143,0.2)' }}>
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl shrink-0"
              style={{ background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' }}>🤖</div>
            <div>
              <div className="font-syne font-bold text-sm">ARIA — Insurance Assistant</div>
              <div className="text-teal text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                Plain language · No jargon
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 md:p-5 overflow-y-auto flex flex-col gap-3 md:gap-4"
            style={{ minHeight: '200px', maxHeight: 'calc(100vh - 360px)' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 md:gap-3 ${m.role === 'user' ? 'ml-auto flex-row-reverse max-w-[85%]' : 'max-w-[92%]'}`}>
                <div className="w-7 md:w-8 h-7 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm shrink-0"
                  style={m.role === 'assistant' ? { background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' } : { background: 'rgba(244,166,35,0.2)' }}>
                  {m.role === 'assistant' ? '🤖' : '👤'}
                </div>
                <div className="text-sm leading-relaxed px-3 md:px-4 py-2.5 md:py-3 rounded-2xl"
                  style={m.role === 'assistant'
                    ? { background: 'rgba(26,58,143,0.35)', border: '1px solid rgba(26,58,143,0.5)', borderBottomLeftRadius: 4 }
                    : { background: '#F4A623', color: '#0A0F1E', fontWeight: 500, borderBottomRightRadius: 4 }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2 max-w-xs">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
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
          <div className="px-3 md:px-4 pt-2 pb-1 flex gap-2 flex-wrap border-t border-white/5">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)}
                className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 md:px-4 py-3 flex gap-2 md:gap-3 items-center border-t border-white/5"
            style={{ background: 'rgba(10,15,30,0.8)' }}>
            <input
              className="flex-1 px-3 md:px-4 py-2.5 md:py-3 rounded-xl text-sm text-white placeholder-muted outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              placeholder="Ask about insurance..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
            />
            <button onClick={() => send(input)} disabled={typing}
              className="w-10 md:w-11 h-10 md:h-11 rounded-xl flex items-center justify-center text-ink text-base transition-all hover:bg-yellow-400 disabled:opacity-50 shrink-0"
              style={{ background: '#F4A623' }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
