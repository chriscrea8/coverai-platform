'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new:       { bg: 'rgba(26,58,143,0.3)',  color: '#7B9FE0' },
  contacted: { bg: 'rgba(244,166,35,0.2)', color: 'var(--accent)' },
  converted: { bg: 'rgba(46,201,126,0.2)', color: 'var(--green)' },
  lost:      { bg: 'rgba(232,69,69,0.2)',  color: 'var(--red)' },
}

const SOURCE_ICON: Record<string, string> = {
  web: '🌐', whatsapp: '📱', ussd: '📞', unknown: '❓',
}

export default function AdminLeadsClient() {
  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.allSettled([
        api.get('/leads'),
        api.get('/leads/stats'),
      ])
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.data?.data || leadsRes.value.data || [])
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || statsRes.value.data)
    } catch {}
    setLoading(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await api.patch(`/leads/${id}/status`, { status })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch {}
    setUpdating(null)
  }

  const filtered = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
    return true
  })

  const conversionRate = leads.length > 0
    ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,15,30,0.95)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 14 }}>← Admin</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18 }}>Leads Dashboard</span>
        </div>
        <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Leads', value: leads.length, icon: '📊', color: '#7B9FE0' },
            { label: 'New', value: leads.filter(l => l.status === 'new').length, icon: '🔵', color: '#7B9FE0' },
            { label: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, icon: '🟡', color: 'var(--accent)' },
            { label: 'Converted', value: leads.filter(l => l.status === 'converted').length, icon: '🟢', color: 'var(--green)' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, icon: '📈', color: 'var(--teal)' },
            { label: 'WhatsApp', value: leads.filter(l => l.source === 'whatsapp').length, icon: '📱', color: 'var(--green)' },
            { label: 'Web', value: leads.filter(l => l.source === 'web').length, icon: '🌐', color: '#7B9FE0' },
            { label: 'USSD', value: leads.filter(l => l.source === 'ussd').length, icon: '📞', color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px 20px', borderRadius: 16, background: 'var(--glass-1)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 24, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'new', 'contacted', 'converted', 'lost'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', fontFamily: 'inherit',
                background: filter === s ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: filter === s ? 'var(--ink)' : 'var(--muted)',
              }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
            {['all', 'web', 'whatsapp', 'ussd'].map(s => (
              <button key={s} onClick={() => setSourceFilter(s)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: 'none', fontFamily: 'inherit',
                background: sourceFilter === s ? '#1A3A8F' : 'rgba(255,255,255,0.04)',
                color: sourceFilter === s ? '#fff' : 'var(--muted)',
              }}>{SOURCE_ICON[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
            {filtered.length} leads
          </div>
        </div>

        {/* Leads Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div>No leads found for these filters.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(lead => (
              <div key={lead.id} style={{
                padding: '16px 20px', borderRadius: 16,
                background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 16, alignItems: 'center',
              }}>
                {/* Contact Info */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{lead.name || 'Anonymous'}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 12 }}>
                    {lead.phone && <span>📞 {lead.phone}</span>}
                    {lead.email && <span>✉️ {lead.email}</span>}
                  </div>
                  {lead.location && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>📍 {lead.location}</div>}
                </div>

                {/* Insurance Info */}
                <div>
                  <div style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, display: 'inline-block', background: 'rgba(244,166,35,0.15)', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    {lead.insuranceType}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {SOURCE_ICON[lead.source || 'web']} {lead.source?.toUpperCase() || 'WEB'}
                    {' · '}
                    {new Date(lead.createdAt).toLocaleDateString('en-NG')}
                  </div>
                  {lead.notes && <div style={{ fontSize: 11, color: '#4A5568', marginTop: 4, overflow: 'hidden', maxWidth: 240, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{lead.notes}</div>}
                </div>

                {/* Status */}
                <div>
                  <div style={{ fontSize: 13, padding: '4px 12px', borderRadius: 20, display: 'inline-block', fontWeight: 700, ...STATUS_COLORS[lead.status] }}>
                    {lead.status?.toUpperCase()}
                  </div>
                  {lead.routedTo && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>→ {lead.routedTo}</div>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                  {lead.status === 'new' && (
                    <button onClick={() => updateStatus(lead.id, 'contacted')} disabled={updating === lead.id}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(244,166,35,0.15)', border: '1px solid rgba(244,166,35,0.3)', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Mark Contacted
                    </button>
                  )}
                  {lead.status === 'contacted' && (
                    <button onClick={() => updateStatus(lead.id, 'converted')} disabled={updating === lead.id}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(46,201,126,0.15)', border: '1px solid rgba(46,201,126,0.3)', color: 'var(--green)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Mark Converted ✓
                    </button>
                  )}
                  {lead.status !== 'lost' && lead.status !== 'converted' && (
                    <button onClick={() => updateStatus(lead.id, 'lost')} disabled={updating === lead.id}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)', color: 'var(--red)', cursor: 'pointer', fontSize: 11 }}>
                      Mark Lost
                    </button>
                  )}
                  {lead.phone && (
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', fontSize: 11, textDecoration: 'none', textAlign: 'center', fontWeight: 700 }}>
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
