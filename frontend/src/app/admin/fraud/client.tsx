'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

const LEVEL_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)',   color: '#EF4444' },
  high:     { bg: 'rgba(245,158,11,0.2)',  color: '#F59E0B' },
  medium:   { bg: 'rgba(124,107,255,0.2)', color: '#7C6BFF' },
  low:      { bg: 'rgba(107,127,163,0.2)', color: '#6B7FA3' },
}

export default function FraudClient() {
  const [flags, setFlags] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved')
  const [resolving, setResolving] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  useEffect(() => { loadData() }, [filter])

  const loadData = async () => {
    setLoading(true)
    try {
      const [flagsRes, statsRes] = await Promise.allSettled([
        api.get('/fraud', { params: filter === 'unresolved' ? { resolved: false } : {} }),
        api.get('/fraud/stats'),
      ])
      if (flagsRes.status === 'fulfilled') setFlags(flagsRes.value.data || [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
    } catch {}
    setLoading(false)
  }

  const resolve = async (id: string) => {
    setResolving(id)
    try {
      await api.patch(`/fraud/${id}/resolve`, { notes: notes[id] || 'Reviewed and resolved by admin' })
      setFlags(prev => prev.filter(f => f.id !== id))
    } catch {}
    setResolving(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080D1A', color: '#fff' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,15,30,0.95)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: '#6B7FA3', textDecoration: 'none', fontSize: 14 }}>← Admin</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18 }}>🚨 Fraud Detection</span>
        </div>
        <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Flags', value: stats.total, icon: '🚩', color: '#7B9FE0' },
              { label: 'Unresolved', value: stats.unresolved, icon: '⏳', color: '#F59E0B' },
              { label: 'Critical', value: stats.critical, icon: '🔴', color: '#EF4444' },
              { label: 'High Risk', value: stats.high, icon: '🟠', color: '#F97316' },
            ].map(s => (
              <div key={s.label} style={{ padding: '20px', borderRadius: 16, background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B7FA3' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['unresolved', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: filter === f ? '#EF4444' : 'rgba(255,255,255,0.06)',
              color: filter === f ? '#fff' : '#6B7FA3',
            }}>{f === 'unresolved' ? '⏳ Unresolved' : '📋 All Flags'}</button>
          ))}
        </div>

        {/* Flags List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>Loading fraud flags...</div>
        ) : flags.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ color: '#2EC97E', fontFamily: 'Syne, sans-serif', fontWeight: 800 }}>No {filter === 'unresolved' ? 'unresolved ' : ''}fraud flags</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flags.map(flag => {
              const lvl = LEVEL_COLORS[flag.riskLevel] || LEVEL_COLORS.low
              return (
                <div key={flag.id} style={{ padding: '20px 24px', borderRadius: 16, background: 'rgba(13,27,62,0.7)', border: `1px solid ${lvl.bg}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', ...lvl }}>{flag.riskLevel}</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: lvl.color }}>Risk Score: {flag.riskScore}/100</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{flag.ruleTriggered}</div>
                      <div style={{ fontSize: 12, color: '#6B7FA3', lineHeight: 1.5 }}>{flag.reason}</div>
                      <div style={{ fontSize: 11, color: '#4A5568', marginTop: 6 }}>
                        Claim: {flag.claimId?.slice(0, 8) || 'N/A'} · User: {flag.userId?.slice(0, 8)} · {new Date(flag.flaggedAt).toLocaleString('en-NG')}
                      </div>
                    </div>
                    {!flag.resolved && (
                      <div style={{ marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
                        <input
                          placeholder="Resolution notes..."
                          value={notes[flag.id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [flag.id]: e.target.value }))}
                          style={{ padding: '8px 10px', borderRadius: 8, fontSize: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: 'inherit' }}
                        />
                        <button onClick={() => resolve(flag.id)} disabled={resolving === flag.id}
                          style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(46,201,126,0.15)', border: '1px solid rgba(46,201,126,0.3)', color: '#2EC97E', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                          {resolving === flag.id ? 'Resolving...' : '✓ Resolve'}
                        </button>
                      </div>
                    )}
                    {flag.resolved && (
                      <span style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(46,201,126,0.15)', color: '#2EC97E', fontSize: 12, fontWeight: 700 }}>Resolved</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
