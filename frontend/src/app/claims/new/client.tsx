'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { claimsApi, policiesApi } from '@/lib/api'
import { useAuthStore, hydrateAuth } from '@/lib/store'

export default function NewClaimPage() {
  const router = useRouter()
  const { isLoggedIn } = useAuthStore()
  const [policies, setPolicies] = useState<any[]>([])
  const [form, setForm] = useState({ policyId: '', claimAmount: '', description: '', incidentDate: '', incidentLocation: '' })
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    hydrateAuth()
    if (!isLoggedIn()) { router.push('/auth'); return }
    policiesApi.getAll().then(r => setPolicies(r.data.data || [])).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid = Array.from(incoming).filter(f => f.size <= 10 * 1024 * 1024)
    const invalid = Array.from(incoming).filter(f => f.size > 10 * 1024 * 1024)
    if (invalid.length) setError(`${invalid.length} file(s) exceed 10MB limit`)
    setFiles(prev => [...prev, ...valid])
  }

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const submit = async () => {
    if (!form.policyId || !form.description || !form.incidentDate || !form.claimAmount) {
      setError('Please fill in all required fields'); return
    }
    setLoading(true); setError('')
    try {
      const res = await claimsApi.create({ ...form, claimAmount: Number(form.claimAmount) })
      const claim = res.data.data
      setSuccess(`Claim ${claim.claimNumber} submitted successfully! Redirecting...`)
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (e: any) {
      const msg = e.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : msg || 'Failed to submit claim')
    }
    setLoading(false)
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all"
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="min-h-screen bg-ink px-4 py-8 md:py-12">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <Link href="/" className="font-syne font-black text-xl">Cover<span className="text-accent">AI</span></Link>
          <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-accent mb-3 mt-6 uppercase tracking-widest block"
            style={{ background: 'rgba(244,166,35,0.12)', border: '1px solid rgba(244,166,35,0.3)' }}>Claims</div>
          <h1 className="font-syne font-black text-3xl">Submit a Claim</h1>
        </div>

        <div className="p-5 md:p-8 rounded-2xl space-y-5" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Policy selector */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Policy *</label>
            <select className={inputCls} style={{ ...inputStyle, background: 'rgba(13,27,62,0.9)' }}
              value={form.policyId} onChange={e => set('policyId', e.target.value)}>
              <option value="">Select a policy</option>
              {policies.filter(p => p.policyStatus === 'active').map(p => (
                <option key={p.id} value={p.id}>{p.policyNumber}</option>
              ))}
            </select>
            {policies.filter(p => p.policyStatus === 'active').length === 0 && (
              <p className="text-muted text-xs mt-1.5">No active policies. <Link href="/coverage" className="text-accent hover:underline">Get coverage →</Link></p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Claim Amount (₦) *</label>
            <input className={inputCls} style={inputStyle} type="number" placeholder="e.g. 250000"
              value={form.claimAmount} onChange={e => set('claimAmount', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Incident Date *</label>
            <input className={inputCls} style={inputStyle} type="date"
              value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Incident Location</label>
            <input className={inputCls} style={inputStyle} placeholder="e.g. 14 Broad Street, Lagos"
              value={form.incidentLocation} onChange={e => set('incidentLocation', e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Description *</label>
            <textarea className={inputCls} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6' }} rows={4}
              placeholder="Describe what happened in detail..."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* File upload — fully wired */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Upload Evidence</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
              style={{ borderColor: dragging ? '#F4A623' : 'rgba(255,255,255,0.15)', background: dragging ? 'rgba(244,166,35,0.05)' : 'transparent' }}>
              <div className="text-3xl mb-2">📎</div>
              <p className="text-sm"><span className="text-accent font-semibold">Click to upload</span> or drag & drop</p>
              <p className="text-muted text-xs mt-1">Photos, police report, receipts (max 10MB each)</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.2)' }}>
                    <div className="flex items-center gap-2 text-sm">
                      <span>📄</span>
                      <span className="text-white truncate max-w-xs">{f.name}</span>
                      <span className="text-muted text-xs">({(f.size / 1024).toFixed(0)}KB)</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-muted hover:text-red-400 text-xs ml-2">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="p-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)' }}>{error}</div>}
          {success && <div className="p-3 rounded-xl text-sm text-teal" style={{ background: 'rgba(0,194,168,0.1)', border: '1px solid rgba(0,194,168,0.3)' }}>{success}</div>}

          <button onClick={submit} disabled={loading}
            className="w-full py-3.5 rounded-xl font-syne font-bold text-ink transition-all hover:bg-yellow-400 disabled:opacity-50"
            style={{ background: '#F4A623' }}>
            {loading ? 'Submitting...' : 'Submit Claim →'}
          </button>
        </div>

        <div className="text-center mt-4">
          <Link href="/dashboard" className="text-muted text-sm hover:text-white transition-colors">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
