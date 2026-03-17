'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function BrokerClient() {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [partner, setPartner] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [policies, setPolicies] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'leads' | 'policies' | 'api'>('leads')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check stored credentials
  useEffect(() => {
    const storedKey = localStorage.getItem('broker_api_key')
    if (storedKey) { setApiKey(storedKey); validateKey(storedKey) }
  }, [])

  const validateKey = async (key: string) => {
    setLoading(true); setError('')
    try {
      const res = await api.get('/partner/leads', { headers: { 'x-api-key': key } })
      setLeads(res.data?.data || res.data || [])
      setAuthed(true)
      localStorage.setItem('broker_api_key', key)
    } catch {
      setError('Invalid API key. Please check your credentials.')
      setAuthed(false)
    }
    setLoading(false)
  }

  const loadData = async () => {
    try {
      const [leadsRes, polRes] = await Promise.allSettled([
        api.get('/partner/leads', { headers: { 'x-api-key': apiKey } }),
        api.get('/partner/policies', { headers: { 'x-api-key': apiKey } }),
      ])
      if (leadsRes.status === 'fulfilled') setLeads(leadsRes.value.data?.data || [])
      if (polRes.status === 'fulfilled') setPolicies(polRes.value.data?.data || [])
    } catch {}
  }

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/leads/${id}/status`, { status }, { headers: { 'x-api-key': apiKey } })
      setLeads(prev => prev.map((l: any) => l.id === id ? { ...l, status } : l))
    } catch {}
  }

  const inputSty: { [key: string]: string | number } = {
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(26,58,143,0.2) 0%, transparent 70%), #080D1A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, textDecoration: 'none', color: '#fff' }}>
              Cover<span style={{ color: '#F4A623' }}>AI</span>
            </Link>
            <div style={{ marginTop: 8, color: '#6B7FA3', fontSize: 14 }}>Partner & Broker Portal</div>
          </div>

          <div style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Welcome, Partner</h2>
            <p style={{ color: '#6B7FA3', fontSize: 14, marginBottom: 24 }}>Enter your API credentials to access the broker dashboard.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>API Key</label>
                <input style={inputSty} placeholder="ck_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>API Secret</label>
                <input style={inputSty} type="password" placeholder="cs_..." value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
              </div>
              {error && <div style={{ color: '#EF4444', fontSize: 13, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)' }}>{error}</div>}
              <button onClick={() => validateKey(apiKey)} disabled={loading || !apiKey}
                style={{ padding: 14, borderRadius: 12, background: '#F4A623', border: 'none', color: '#0A0F1E', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'Syne, sans-serif', opacity: !apiKey ? 0.5 : 1 }}>
                {loading ? 'Authenticating...' : 'Access Portal →'}
              </button>
            </div>

            <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Don't have credentials?</div>
              <div style={{ fontSize: 12, color: '#6B7FA3', lineHeight: 1.6 }}>
                Contact CoverAI admin to get your Partner API key and secret. Email: <span style={{ color: '#F4A623' }}>partners@coverai.ng</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080D1A', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,15,30,0.95)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, textDecoration: 'none', color: '#fff' }}>
          Cover<span style={{ color: '#F4A623' }}>AI</span>
          <span style={{ fontSize: 12, color: '#6B7FA3', fontWeight: 400, marginLeft: 8, fontFamily: 'DM Sans, sans-serif' }}>Partner Portal</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
          <button onClick={() => { localStorage.removeItem('broker_api_key'); setAuthed(false); setApiKey('') }}
            style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(232,69,69,0.1)', border: '1px solid rgba(232,69,69,0.2)', color: '#E84545', cursor: 'pointer', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Total Leads', value: leads.length, icon: '📊', color: '#7B9FE0' },
            { label: 'New Leads', value: leads.filter((l: any) => l.status === 'new').length, icon: '🔵', color: '#7B9FE0' },
            { label: 'Converted', value: leads.filter((l: any) => l.status === 'converted').length, icon: '✅', color: '#2EC97E' },
            { label: 'Policies', value: policies.length, icon: '📋', color: '#F4A623' },
          ].map(s => (
            <div key={s.label} style={{ padding: '16px', borderRadius: 14, background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 22, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6B7FA3' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 5 }}>
          {([['leads', '📊 Leads'], ['policies', '📋 Policies'], ['api', '🔑 API Docs']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit',
              background: activeTab === id ? '#F4A623' : 'transparent',
              color: activeTab === id ? '#0A0F1E' : '#6B7FA3',
            }}>{label}</button>
          ))}
        </div>

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div>No leads assigned to you yet.</div>
              </div>
            ) : leads.map((lead: any) => (
              <div key={lead.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{lead.name || 'Anonymous'}</div>
                  <div style={{ fontSize: 13, color: '#6B7FA3' }}>
                    {lead.phone && `📞 ${lead.phone}`} {lead.location && `· 📍 ${lead.location}`}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 20, background: 'rgba(244,166,35,0.15)', color: '#F4A623', fontWeight: 700, textTransform: 'uppercase' }}>{lead.insuranceType}</span>
                    <span style={{ color: '#6B7FA3', marginLeft: 8 }}>{new Date(lead.createdAt).toLocaleDateString('en-NG')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {lead.phone && (
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                      style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(37,211,102,0.15)', color: '#25D366', textDecoration: 'none', fontSize: 12, fontWeight: 700, border: '1px solid rgba(37,211,102,0.3)' }}>
                      💬 WhatsApp
                    </a>
                  )}
                  {lead.status !== 'converted' && (
                    <button onClick={() => updateLeadStatus(lead.id, 'converted')}
                      style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(46,201,126,0.15)', color: '#2EC97E', border: '1px solid rgba(46,201,126,0.3)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      Mark Converted
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {policies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>No policies found.</div>
            ) : policies.map((pol: any) => (
              <div key={pol.id} style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{pol.policyNumber}</div>
                    <div style={{ fontSize: 13, color: '#6B7FA3' }}>₦{Number(pol.premiumAmount || 0).toLocaleString()} · {pol.policyStatus}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7FA3' }}>{new Date(pol.createdAt).toLocaleDateString('en-NG')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Docs Tab */}
        {activeTab === 'api' && (
          <div style={{ padding: 24, borderRadius: 16, background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 16 }}>🔑 API Integration Guide</h3>
            <p style={{ color: '#6B7FA3', marginBottom: 20, lineHeight: 1.6 }}>
              Use your API key to integrate CoverAI into your own systems. All endpoints require the <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>x-api-key</code> header.
            </p>
            {[
              { method: 'GET', path: '/api/v1/partner/leads', desc: 'Get all leads routed to you' },
              { method: 'GET', path: '/api/v1/partner/policies', desc: 'Get policies you created' },
              { method: 'POST', path: '/api/v1/partner/policies', desc: 'Create a policy for a user' },
              { method: 'POST', path: '/api/v1/partner/claims', desc: 'Submit a claim on behalf of user' },
              { method: 'PATCH', path: '/api/v1/leads/:id/status', desc: 'Update lead status (contacted/converted)' },
            ].map(ep => (
              <div key={ep.path} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, minWidth: 50, textAlign: 'center', background: ep.method === 'GET' ? 'rgba(46,201,126,0.2)' : ep.method === 'POST' ? 'rgba(26,58,143,0.3)' : 'rgba(244,166,35,0.2)', color: ep.method === 'GET' ? '#2EC97E' : ep.method === 'POST' ? '#7B9FE0' : '#F4A623' }}>{ep.method}</span>
                <code style={{ fontSize: 13, color: '#E8EDF5', flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 12, color: '#6B7FA3' }}>{ep.desc}</span>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: 'rgba(244,166,35,0.08)', border: '1px solid rgba(244,166,35,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#F4A623' }}>Your API Key</div>
              <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{apiKey}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
