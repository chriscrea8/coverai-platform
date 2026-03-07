'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { chatApi } from '@/lib/api'
import { v4 as uuidv4 } from 'uuid'

const PROMPTS = [
  "What insurance does a small shop need?",
  "Explain third party motor insurance",
  "How do I file a claim?",
  "Which insurance covers theft for my business?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', text: "Hello! I'm **ARIA** — your AI Insurance Assistant. I can help you understand insurance, find the right policy for your business, and guide you through claims. What would you like to know? 🤖" }
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
      const reply = res.data.data?.message || res.data.message || 'I had trouble responding, please try again.'
      setMessages([...newMsgs, { role: 'assistant', text: reply }])
    } catch {
      setMessages([...newMsgs, { role: 'assistant', text: "I'm having trouble connecting right now. Please try again in a moment." }])
    }
    setTyping(false)
  }

  const renderText = (t: string) =>
    t.split('\n').map((line, i) => {
      const html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      return <div key={i} dangerouslySetInnerHTML={{ __html: html }} style={{ marginBottom: line === '' ? 6 : 0 }} />
    })

  return (
    <div className="min-h-screen bg-ink flex flex-col" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(26,58,143,0.2) 0%, transparent 70%), #0A0F1E' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <Link href="/" className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></Link>
        <div className="flex gap-3">
          <Link href="/dashboard" className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Dashboard</Link>
          <Link href="/coverage" className="px-4 py-2 rounded-xl bg-accent text-ink text-sm font-bold">Get Coverage</Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-teal mb-3 uppercase tracking-widest"
            style={{ background: 'rgba(0,194,168,0.12)', border: '1px solid rgba(0,194,168,0.25)' }}>AI Powered</div>
          <h1 className="font-syne font-black text-3xl">Insurance Assistant</h1>
          <p className="text-muted text-sm mt-2">Ask anything about insurance in plain language</p>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5" style={{ background: 'rgba(26,58,143,0.2)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' }}>🤖</div>
            <div>
              <div className="font-syne font-bold text-sm">ARIA</div>
              <div className="text-teal text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal dot-pulse inline-block" />
                AI Insurance Assistant · Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto min-h-72 max-h-96 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 max-w-[78%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${m.role === 'assistant' ? '' : ''}`}
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
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #1A3A8F, #00C2A8)' }}>🤖</div>
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ background: 'rgba(26,58,143,0.35)', border: '1px solid rgba(26,58,143,0.5)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted dot-bounce inline-block" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted dot-bounce-2 inline-block" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted dot-bounce-3 inline-block" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {PROMPTS.map(p => (
              <button key={p} onClick={() => send(p)}
                className="px-3 py-1.5 rounded-full text-xs text-muted hover:text-white hover:border-blue-600 transition-all"
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
              placeholder="Ask about insurance..."
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
