'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { api } from '@/lib/api'

type VerificationResult = {
  status: 'valid' | 'expired' | 'not_found' | 'error'
  plate?: string
  policy_number?: string
  policy_type?: string
  provider?: string
  expiry_date?: string
  days_remaining?: number
  message?: string
  source?: string
  checked_at?: string
}

const STATUS_CONFIG = {
  valid:     { icon: '✅', label: 'Valid Insurance', color: '#2EC97E', bg: 'rgba(46,201,126,0.12)', border: 'rgba(46,201,126,0.3)' },
  expired:   { icon: '⚠️', label: 'Insurance Expired', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  not_found: { icon: '❌', label: 'Not Found', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  error:     { icon: '⚡', label: 'Service Error', color: '#6B7FA3', bg: 'rgba(107,127,163,0.12)', border: 'rgba(107,127,163,0.3)' },
}

export default function VerifyClient() {
  const [plate, setPlate] = useState('')
  const [policyNum, setPolicyNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [mode, setMode] = useState<'plate' | 'policy'>('plate')

  const verify = async () => {
    const query = mode === 'plate' ? plate.trim() : policyNum.trim()
    if (!query) return
    setLoading(true); setResult(null)
    try {
      const params = mode === 'plate' ? { plate: query.toUpperCase() } : { policy: query.toUpperCase() }
      const res = await api.get('/insurance/verify', { params })
      setResult(res.data)
    } catch (e: any) {
      setResult({ status: 'error', message: e.response?.data?.message || 'Verification service unavailable. Please try again.' })
    }
    setLoading(false)
  }

  const cfg = result ? STATUS_CONFIG[result.status] : null

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(26,58,143,0.3) 0%, transparent 60%), #080D1A', color: '#fff' }}>
      <Navbar />
      <div style={{ height: 64 }} />

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14, background: 'rgba(0,194,168,0.12)', color: '#00C2A8', border: '1px solid rgba(0,194,168,0.25)' }}>
            Free Verification Tool
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 900, marginBottom: 14, lineHeight: 1.2 }}>
            Vehicle Insurance<br /><span style={{ color: '#F4A623' }}>Verification</span>
          </h1>
          <p style={{ color: '#6B7FA3', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Check if a vehicle has valid insurance coverage in Nigeria. Instant results by plate number or policy number.
          </p>
        </div>

        {/* Search Card */}
        <div style={{ padding: 32, borderRadius: 20, background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>

          {/* Mode Toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4 }}>
            {(['plate', 'policy'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setResult(null) }} style={{
                flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: mode === m ? '#F4A623' : 'transparent',
                color: mode === m ? '#0A0F1E' : '#6B7FA3',
              }}>
                {m === 'plate' ? '🚗 Plate Number' : '📋 Policy Number'}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={mode === 'plate' ? plate : policyNum}
              onChange={e => mode === 'plate' ? setPlate(e.target.value.toUpperCase()) : setPolicyNum(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder={mode === 'plate' ? 'e.g. KJA123AB or ABC-234-XY' : 'e.g. POL-2026-001234'}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: 12, fontSize: 16, fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', outline: 'none', fontFamily: 'inherit', letterSpacing: 1,
              }}
            />
            <button onClick={verify} disabled={loading || !(mode === 'plate' ? plate : policyNum).trim()}
              style={{
                padding: '14px 28px', borderRadius: 12, background: '#F4A623', border: 'none',
                color: '#0A0F1E', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap',
              }}>
              {loading ? '🔍 Checking...' : 'Verify →'}
            </button>
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: '#4A5568', textAlign: 'center' }}>
            Data sourced from CoverAI policy database. For full NIID verification visit <span style={{ color: '#F4A623' }}>naicom.gov.ng</span>
          </div>
        </div>

        {/* Result Card */}
        {result && cfg && (
          <div style={{ padding: 28, borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 40 }}>{cfg.icon}</span>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 22, color: cfg.color }}>{cfg.label}</div>
                {result.plate && <div style={{ fontSize: 13, color: '#6B7FA3', marginTop: 2 }}>Plate: <strong style={{ color: '#fff', letterSpacing: 1 }}>{result.plate}</strong></div>}
              </div>
            </div>

            {result.status === 'valid' || result.status === 'expired' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Policy Number', value: result.policy_number },
                  { label: 'Policy Type', value: result.policy_type },
                  { label: 'Insurance Provider', value: result.provider },
                  { label: 'Expiry Date', value: result.expiry_date, highlight: result.status === 'expired' },
                  result.days_remaining !== undefined && result.days_remaining !== null
                    ? { label: 'Days Remaining', value: result.days_remaining > 0 ? `${result.days_remaining} days` : 'Expired', highlight: result.days_remaining <= 30 }
                    : null,
                  { label: 'Data Source', value: result.source || 'CoverAI' },
                ].filter(Boolean).map((item: any) => (
                  <div key={item.label} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 11, color: '#6B7FA3', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, color: item.highlight ? cfg.color : '#fff', fontSize: 14 }}>{item.value || 'N/A'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6B7FA3', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{result.message}</p>
            )}

            {result.message && (result.status === 'valid' || result.status === 'expired') && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,0.06)', fontSize: 13, color: '#6B7FA3', borderLeft: `3px solid ${cfg.color}` }}>
                {result.message}
              </div>
            )}

            {result.checked_at && (
              <div style={{ marginTop: 12, fontSize: 11, color: '#4A5568', textAlign: 'right' }}>
                Checked at {new Date(result.checked_at).toLocaleString('en-NG')}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {result?.status === 'not_found' || result?.status === 'expired' ? (
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(26,58,143,0.2)', border: '1px solid rgba(26,58,143,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 6 }}>
              {result.status === 'expired' ? 'Renew Your Insurance Today' : 'Get Insured — It\'s Easy'}
            </div>
            <p style={{ color: '#6B7FA3', fontSize: 13, marginBottom: 16 }}>
              {result.status === 'expired' ? 'Your policy has lapsed. Renew now to stay protected and legally compliant.' : 'Driving without insurance is illegal in Nigeria. Get covered in minutes from ₦5,000/year.'}
            </p>
            <Link href="/coverage" style={{ padding: '12px 24px', borderRadius: 12, background: '#F4A623', color: '#0A0F1E', fontWeight: 700, textDecoration: 'none', fontFamily: 'Syne, sans-serif', display: 'inline-block' }}>
              Get Covered Now →
            </Link>
          </div>
        ) : null}

        {/* Info boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 40 }}>
          {[
            { icon: '🔍', title: 'Instant Check', desc: 'Results in under 2 seconds' },
            { icon: '🔒', title: 'Secure', desc: 'No data stored from lookups' },
            { icon: '🇳🇬', title: 'Nigeria-wide', desc: 'All insurers on the platform' },
          ].map(item => (
            <div key={item.title} style={{ padding: '20px 16px', borderRadius: 14, background: 'rgba(13,27,62,0.6)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#6B7FA3' }}>{item.desc}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
