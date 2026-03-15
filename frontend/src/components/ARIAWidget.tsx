'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { chatApi } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'

const QUICK_PROMPTS = [
  "What insurance do I need?",
  "How do claims work?",
  "Motor insurance basics",
  "SME coverage options",
]

const LOCAL_ANSWERS: Record<string, string> = {
  default: `Hi! I'm **ARIA**, your AI insurance guide 🇳🇬\n\nI can help you:\n- Find the right insurance for your business\n- Explain policies in plain language\n- Guide you through filing a claim\n\nWhat would you like to know?`,
  shop: `For a **retail shop or market stall**:\n\n**Fire & Burglary** — protects your stock and shop (₦15k–₦40k/yr)\n**Public Liability** — covers customer injuries (₦10k/yr)\n**Goods in Transit** — if you move stock regularly\n\nClick "Get Coverage" to get matched in 2 minutes! ✅`,
  motor: `**Third Party Motor Insurance:**\n\n✅ Legally required by FRSC\n✅ Covers damage you cause to others\n❌ Does NOT cover your own vehicle\n\nCost: ₦5,000–₦15,000/year\n\n**Comprehensive** covers both parties — more expensive but full protection 🚗`,
  claim: `**How to file a claim:**\n\n1. Take photos immediately 📸\n2. Go to Dashboard → New Claim\n3. Fill in details + upload evidence\n4. Submit — reviewed in 5–7 days\n5. Approved claims paid to your bank 💰\n\nAlways keep receipts for expensive items!`,
  theft: `**Insurance covering theft:**\n\n**Burglary & Housebreaking** — shop break-ins\n**All Risks** — theft anywhere, even by employees\n**Money Insurance** — cash stolen on premises\n\nYou'll need a police report + item list for any theft claim 🛡️`,
  sme: `**For SMEs & small businesses:**\n\n**Business Owner's Policy (BOP)** — bundles property + liability + theft in one plan\n**Equipment Cover** — protects your machinery and tools\n**Business Interruption** — income replacement if forced to close\n\nMost SMEs start with a BOP — affordable and comprehensive!`,
}

function getLocalAnswer(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('shop') || m.includes('store') || m.includes('market') || m.includes('retail')) return LOCAL_ANSWERS.shop
  if (m.includes('motor') || m.includes('car') || m.includes('vehicle') || m.includes('third party')) return LOCAL_ANSWERS.motor
  if (m.includes('claim') || m.includes('file') || m.includes('submit')) return LOCAL_ANSWERS.claim
  if (m.includes('theft') || m.includes('steal') || m.includes('burglary') || m.includes('stolen')) return LOCAL_ANSWERS.theft
  if (m.includes('sme') || m.includes('business') || m.includes('small')) return LOCAL_ANSWERS.sme
  return LOCAL_ANSWERS.default
}

function renderText(t: string) {
  return t.split('\n').map((line, i) => {
    const html = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- /, '• ')
    return (
      <div
        key={i}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{ marginBottom: line === '' ? 6 : 1, paddingLeft: line.startsWith('•') ? 4 : 0, lineHeight: 1.55 }}
      />
    )
  })
}

export default function ARIAWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: LOCAL_ANSWERS.default }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [pulse, setPulse] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, open])

  useEffect(() => {
    if (open) {
      setPulse(false)
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  const send = async (msg: string) => {
    if (!msg.trim() || typing) return
    const newMsgs = [...messages, { role: 'user', text: msg }]
    setMessages(newMsgs)
    setInput('')
    setTyping(true)
    try {
      const res = await chatApi.send(msg, sessionId)
      const reply = res.data?.data?.message || res.data?.message
      // Always trust OpenAI response — only fall back if completely empty
      const finalReply = (reply && reply.trim().length > 0) ? reply : getLocalAnswer(msg)
      setMessages([...newMsgs, { role: 'assistant', text: finalReply }])
    } catch {
      setMessages([...newMsgs, { role: 'assistant', text: getLocalAnswer(msg) }])
    }
    setTyping(false)
  }

  return (
    <>
      {/* Widget Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          width: open ? 360 : 0,
          height: open ? 520 : 0,
          borderRadius: 20,
          overflow: 'hidden',
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 9998,
          background: 'linear-gradient(160deg, #0D1B3E 0%, #0A0F1E 100%)',
          border: open ? '1px solid rgba(255,255,255,0.1)' : 'none',
          boxShadow: open ? '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(26,58,143,0.3)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transformOrigin: 'bottom right',
          transform: open ? 'scale(1)' : 'scale(0.85)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'linear-gradient(135deg, rgba(26,58,143,0.4) 0%, rgba(0,194,168,0.1) 100%)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', fontFamily: 'Syne, sans-serif' }}>ARIA</div>
            <div style={{ fontSize: 11, color: '#00C2A8', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C2A8', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              AI Insurance Assistant
            </div>
          </div>
          <Link
            href="/chat"
            style={{ fontSize: 11, color: '#6B7FA3', textDecoration: 'none', padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Full chat ↗
          </Link>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#6B7FA3', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}
          >×</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 8,
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              maxWidth: '100%',
            }}>
              {m.role === 'assistant' && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
                }}>🤖</div>
              )}
              <div style={{
                fontSize: 13,
                lineHeight: 1.5,
                padding: '10px 12px',
                borderRadius: m.role === 'assistant' ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                maxWidth: '82%',
                ...(m.role === 'assistant'
                  ? { background: 'rgba(26,58,143,0.4)', border: '1px solid rgba(26,58,143,0.5)', color: '#E8EDF5' }
                  : { background: '#F4A623', color: '#0A0F1E', fontWeight: 600 }
                )
              }}>
                {renderText(m.text)}
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>🤖</div>
              <div style={{
                padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
                background: 'rgba(26,58,143,0.4)', border: '1px solid rgba(26,58,143,0.5)',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                {[0, 150, 300].map(d => (
                  <span key={d} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#6B7FA3',
                    display: 'inline-block',
                    animation: `bounce 1s ${d}ms infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ padding: '8px 12px 6px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)} style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#6B7FA3', cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#fff'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#6B7FA3'; (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
            >{p}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,15,30,0.8)', flexShrink: 0,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask about insurance..."
            style={{
              flex: 1, padding: '9px 13px', borderRadius: 12, fontSize: 13,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={typing || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10, background: '#F4A623',
              border: 'none', cursor: 'pointer', fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: typing || !input.trim() ? 0.5 : 1,
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >➤</button>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: open ? '#F4A623' : 'linear-gradient(135deg, #1A3A8F, #00C2A8)',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: open ? 'rotate(0deg) scale(1)' : 'scale(1)',
        }}
        title="Ask ARIA — AI Insurance Assistant"
      >
        {open ? '✕' : '🤖'}
        {/* Pulse ring */}
        {pulse && !open && (
          <span style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(0,194,168,0.5)',
            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
          }} />
        )}
      </button>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  )
}
