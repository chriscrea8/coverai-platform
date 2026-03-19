'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { curacelApi } from '@/lib/api'

export default function CuracelAdminClient() {
  const [status, setStatus] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [productTypes, setProductTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('')
  const [wallet, setWallet] = useState<any>(null)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [statusRes, typesRes, prodsRes] = await Promise.allSettled([
        curacelApi.getStatus(),
        curacelApi.getProductTypes(),
        curacelApi.getProducts({ calculate_premium: 1 } as any),
      ])
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data)
      if (typesRes.status === 'fulfilled') setProductTypes(typesRes.value.data?.data || [])
      if (prodsRes.status === 'fulfilled') setProducts(prodsRes.value.data?.data || [])

      // Try wallet (needs API key)
      try {
        const walletRes = await curacelApi.getWallet()
        setWallet(walletRes.data?.data || walletRes.data)
      } catch {}
    } catch {}
    setLoading(false)
  }

  const loadByType = async (typeId: string) => {
    setSelectedType(typeId)
    try {
      const res = await curacelApi.getProducts({ type: Number(typeId), calculate_premium: 1 } as any)
      setProducts(res.data?.data || [])
    } catch {}
  }

  const isConnected = status?.connected

  return (
    <div style={{ minHeight: '100vh', background: '#080D1A', color: '#fff' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,15,30,0.95)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/admin" style={{ color: '#6B7FA3', textDecoration: 'none', fontSize: 14 }}>← Admin</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18 }}>🔌 Curacel Integration</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={async () => { try { const r = await (await import('@/lib/api')).curacelApi.syncCatalogue(); alert(r.data?.message || 'Synced!'); await loadAll(); } catch(e: any) { alert(e.message); } }} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(124,107,255,0.15)', border: '1px solid rgba(124,107,255,0.3)', color: '#7C6BFF', cursor: 'pointer', fontSize: 13 }}>📥 Sync to Admin</button>
          <button onClick={async () => { try { const r = await (await import('@/lib/api')).curacelApi.syncPolicies(); alert(r.data?.message || 'Synced!'); } catch {} }} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(0,194,168,0.15)', border: '1px solid rgba(0,194,168,0.3)', color: '#00C2A8', cursor: 'pointer', fontSize: 13 }}>⟳ Sync Policies</button>
          <button onClick={loadAll} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* Connection Status */}
        <div style={{ padding: 24, borderRadius: 20, marginBottom: 28, background: isConnected ? 'rgba(46,201,126,0.1)' : 'rgba(244,166,35,0.1)', border: `1px solid ${isConnected ? 'rgba(46,201,126,0.3)' : 'rgba(244,166,35,0.3)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>{isConnected ? '✅' : '⚠️'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                {isConnected ? `Curacel ${status?.mode === 'production' ? '🟢 PRODUCTION' : '🟡 SANDBOX'}` : '⚡ Passthrough Mode (Static Catalogue)'}
              </div>
              <div style={{ color: '#6B7FA3', fontSize: 14 }}>{status?.message || 'Loading...'}</div>
            </div>
            {!isConnected && (
              <div style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(244,166,35,0.15)', border: '1px solid rgba(244,166,35,0.3)', fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: '#F4A623', marginBottom: 4 }}>To activate live products:</div>
                <div style={{ color: '#6B7FA3' }}>1. Get API key from <strong>grow@curacel.ai</strong></div>
                <div style={{ color: '#6B7FA3' }}>2. Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>CURACEL_API_KEY</code> to Railway</div>
                <div style={{ color: '#6B7FA3' }}>3. Optionally set <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>CURACEL_ENV=production</code></div>
              </div>
            )}
            {isConnected && wallet && (
              <div style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(46,201,126,0.1)', border: '1px solid rgba(46,201,126,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#6B7FA3', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 22, color: '#2EC97E' }}>₦{Number(wallet.balance || 0).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>


        {/* Webhook Config */}
        <div style={{ padding: 20, borderRadius: 16, marginBottom: 28, background: 'rgba(124,107,255,0.1)', border: '1px solid rgba(124,107,255,0.3)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 12 }}>🪝 Webhook Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, color: '#6B7FA3', marginBottom: 4 }}>Set this URL in your Curacel dashboard</div>
              <code style={{ fontSize: 12, color: '#7C6BFF', wordBreak: 'break-all' }}>https://coverai-platform-production.up.railway.app/api/v1/curacel/webhook</code>
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 11, color: '#6B7FA3', marginBottom: 4 }}>Add to Railway env vars</div>
              <div style={{ fontSize: 12, color: '#6B7FA3' }}><code style={{ color: '#F4A623' }}>CURACEL_WEBHOOK_SECRET</code> — from Curacel dashboard</div>
              <div style={{ fontSize: 12, color: '#6B7FA3', marginTop: 4 }}><code style={{ color: '#F4A623' }}>CURACEL_PARTNER_KEY</code> — your partner key UUID</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Products Available', value: products.length, icon: '📦', color: '#7B9FE0' },
            { label: 'Insurance Types', value: productTypes.length, icon: '📊', color: '#F4A623' },
            { label: 'Insurers', value: Array.from(new Set(products.map((p: any) => p.insurer?.name).filter(Boolean))).length, icon: '🏛️', color: '#2EC97E' },
          ].map(s => (
            <div key={s.label} style={{ padding: '20px', borderRadius: 16, background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: s.color }}>{loading ? '...' : s.value}</div>
              <div style={{ fontSize: 12, color: '#6B7FA3' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Product Types Filter */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 12 }}>📂 Product Types</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => loadAll()} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit', background: !selectedType ? '#F4A623' : 'rgba(255,255,255,0.06)', color: !selectedType ? '#0A0F1E' : '#6B7FA3' }}>All</button>
            {productTypes.map((t: any) => (
              <button key={t.id} onClick={() => loadByType(String(t.id))} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                background: selectedType === String(t.id) ? '#F4A623' : 'rgba(255,255,255,0.06)',
                color: selectedType === String(t.id) ? '#0A0F1E' : '#6B7FA3',
              }}>{t.name}</button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 16 }}>
          📦 Products ({products.length})
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>Loading products from Curacel...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {products.map((p: any) => (
              <div key={p.id || p.code} style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(13,27,62,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7FA3' }}>
                      {p.insurer?.name && <span style={{ marginRight: 8 }}>🏛️ {p.insurer.name}</span>}
                      {p.product_type?.name && <span style={{ padding: '1px 8px', borderRadius: 10, background: 'rgba(26,58,143,0.3)', color: '#7B9FE0' }}>{p.product_type.name}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, color: '#F4A623', fontSize: 15 }}>
                      {p.premium_type === 'relative' ? `${p.premium_rate}${p.premium_rate_unit}` : `₦${Number(p.price || p.premium_rate || 0).toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: 10, color: '#4A5568' }}>{p.premium_frequencies?.[0] || 'annual'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4A5568', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                  <span>Code: <code style={{ color: '#6B7FA3' }}>{p.code}</code></span>
                  <span style={{ color: '#2EC97E' }}>Commission: {p.partner_commission_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup Guide */}
        {!isConnected && (
          <div style={{ marginTop: 40, padding: 28, borderRadius: 20, background: 'rgba(13,27,62,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 16 }}>📋 Curacel Setup Guide</div>
            {[
              { step: '1', title: 'Request API Access', desc: 'Email grow@curacel.ai — Subject: "Sandbox API Access — CoverAI InsurTech Platform"' },
              { step: '2', title: 'Get Sandbox Key', desc: 'They\'ll respond within 1–2 business days with your sandbox API key' },
              { step: '3', title: 'Add to Railway', desc: 'Railway → coverai-platform → Variables → Add CURACEL_API_KEY=your_key' },
              { step: '4', title: 'Go Live', desc: 'When ready for production: set CURACEL_ENV=production and get a live key' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 16, marginBottom: 14, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F4A623', color: '#0A0F1E', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>{s.step}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#6B7FA3' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
