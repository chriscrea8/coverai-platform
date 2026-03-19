'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { compareApi, leadsApi, api } from '@/lib/api'

const CATEGORIES = [
  { id: 'motor',              label: 'Motor (3rd Party)',    icon: '🚗', desc: 'Legal minimum — covers damage you cause' },
  { id: 'vehicle',            label: 'Comprehensive Auto',   icon: '🚙', desc: 'Full cover — your car + others' },
  { id: 'health',             label: 'Health Insurance',     icon: '❤️', desc: 'Medical cover & HMO plans' },
  { id: 'micro health',       label: 'Micro Health',         icon: '💊', desc: 'Affordable health cover from ₦5,000/yr' },
  { id: 'life',               label: 'Life Insurance',       icon: '🛡️', desc: 'Financial protection for your family' },
  { id: 'personal accident',  label: 'Personal Accident',    icon: '🦺', desc: 'Injury and disability protection' },
  { id: 'fire & burglary',    label: 'Fire & Burglary',      icon: '🏪', desc: 'Shop, office & property protection' },
  { id: 'goods in transit',   label: 'Goods in Transit',     icon: '📦', desc: 'Cargo and stock protection' },
]

const ELIGIBILITY_TYPES = [
  { id: 'motor', label: 'Motor' },
  { id: 'health', label: 'Health' },
  { id: 'life', label: 'Life' },
  { id: 'property', label: 'Property' },
  { id: 'business', label: 'Business' },
]

type Product = {
  id: string
  name: string
  category: string
  premiumMin: number
  premiumMax: number
  description: string
  coverageDetails: Record<string, any>
  isSmeProduct: boolean
  tags: string[]
  insurer?: string
  insurerLogo?: string
  commissionRate?: string
  premiumType?: string
  premiumUnit?: string
  frequencies?: string[]
  benefits?: Array<{ cover: string; benefit: string }>
}

// Normalize Curacel API response to Product shape
function normalizeCuracelProduct(p: any): Product {
  const isRelative = p.premium_type === 'relative'
  return {
    id: String(p.id || p.code),
    name: p.title || p.productName || p.name || 'Insurance Product',
    category: p.product_type?.name || p.category || 'General',
    premiumMin: isRelative ? (p.min_premium || 0) : (p.price || p.premium_rate || p.premiumMin || 0),
    premiumMax: isRelative ? 0 : (p.price || p.premium_rate || p.premiumMax || 0),
    description: p.description?.replace(/<[^>]*>/g, '') || '',
    coverageDetails: {},
    isSmeProduct: ['Goods in Transit', 'Marine', 'Fire and Burglary'].includes(p.product_type?.name),
    tags: [p.product_type?.name, p.insurer?.name].filter(Boolean),
    insurer: p.insurer?.name,
    insurerLogo: p.insurer?.logo_url,
    commissionRate: p.partner_commission_rate,
    premiumType: p.premium_type,
    premiumUnit: p.premium_rate_unit,
    frequencies: p.premium_frequencies,
    benefits: p.cover_benefits || [],
  }
}

function formatCurrency(n: number) {
  if (!n) return 'N/A'
  return `₦${Number(n).toLocaleString()}`
}

function ProductCard({ product, onGetQuote }: { product: Product; onGetQuote: (p: Product) => void }) {
  const [expanded, setExpanded] = useState(false)
  const coverage = product.coverageDetails || {}

  return (
    <div style={{
      background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
      transition: 'all 0.25s',
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, margin: 0, marginBottom: 4 }}>
              {product.name}
            </h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'rgba(26,58,143,0.3)', color: '#7B9FE0', border: '1px solid rgba(26,58,143,0.4)' }}>
                {product.category}
              </span>
              {product.isSmeProduct && (
                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: 'rgba(0,194,168,0.15)', color: '#00C2A8', border: '1px solid rgba(0,194,168,0.3)' }}>
                  SME
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 900, color: '#F4A623' }}>
              {product.premiumType === 'relative' && product.premiumUnit === '%'
                ? `${product.premiumMin || product.commissionRate || '~'}% of value`
                : formatCurrency(product.premiumMin)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7FA3' }}>
              {product.frequencies?.[0] ? `per ${product.frequencies[0]}` : '/yr'}
            </div>
            {product.insurer && (
              <div style={{ fontSize: 10, color: '#4A5568', marginTop: 4 }}>{product.insurer}</div>
            )}
          </div>
        </div>
        <p style={{ color: '#8A9BBF', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{product.description}</p>
      </div>

      {/* Coverage details */}
      {Object.keys(coverage).length > 0 && (
        <div>
          <button onClick={() => setExpanded(e => !e)} style={{
            background: 'none', border: 'none', color: '#6B7FA3', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {expanded ? '▲' : '▼'} {expanded ? 'Hide' : 'Show'} coverage details
          </button>
          {expanded && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(coverage).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#8A9BBF', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                  <span style={{ color: typeof val === 'boolean' ? (val ? '#00C2A8' : '#EF4444') : '#fff', fontWeight: 500 }}>
                    {typeof val === 'boolean' ? (val ? '✅ Covered' : '❌ Not covered') : String(val)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {product.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: '#6B7FA3', border: '1px solid rgba(255,255,255,0.08)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
        <button onClick={() => onGetQuote(product)} style={{
          flex: 1, padding: '11px', borderRadius: 12, background: '#F4A623', border: 'none',
          color: '#0A0F1E', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          fontFamily: 'Syne, sans-serif', transition: 'all 0.2s',
        }}>
          Get Quote →
        </button>
        <Link href="/coverage" style={{
          padding: '11px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
          fontSize: 13, textDecoration: 'none', fontWeight: 500,
        }}>
          Buy Now
        </Link>
      </div>
    </div>
  )
}

export default function ComparePage() {
  const [activeTab, setActiveTab] = useState<'compare'>('compare')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Lead capture modal
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [leadForm, setLeadForm] = useState({ name: '', phone: '' })
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadDone, setLeadDone] = useState(false)
  const [userProfile, setUserProfile] = useState<{ name: string; phone: string } | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Auto-load user profile if logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsLoggedIn(!!token)
    if (token) {
      api.get('/users/profile').then(r => {
        const u = r.data?.data || r.data
        if (u) setUserProfile({ name: u.name || '', phone: u.phone || '' })
      }).catch(() => {})
    }
  }, [])

  const fetchProducts = async (category: string) => {
    setSelectedCategory(category)
    setLoading(true)
    setError('')
    setProducts([])
    try {
      const res = await compareApi.byCategory(category, 6)
      const raw = res.data?.data || res.data || []
      const data = Array.isArray(raw) ? raw.map(normalizeCuracelProduct) : []
      setProducts(data)
    } catch {
      setError('Could not load products. Please try again.')
    }
    setLoading(false)
  }



  const submitLead = async () => {
    const name = userProfile?.name || leadForm.name
    const phone = userProfile?.phone || leadForm.phone
    if (!name && !phone && !isLoggedIn) return
    setLeadSubmitting(true)
    try {
      const product = quoteModal.product as any
      await leadsApi.create({
        insuranceType: product?.category || product?.product_type?.name || 'general',
        name: name || 'Anonymous',
        phone: phone || '',
        notes: `Quote requested for: ${product?.name || product?.title}. Insurer: ${product?.insurer || product?.insurer?.name || 'N/A'}. Price: ${product?.premiumMin || product?.price || 'N/A'}`,
      })
      setLeadDone(true)
    } catch {
      setLeadDone(true)
    }
    setLeadSubmitting(false)
  }

  const inputSty: { [key: string]: string | number } = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(26,58,143,0.2) 0%, transparent 70%), #0A0F1E', color: '#fff' }}>

      <Navbar />
      <div style={{ height: 64 }} />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12,
            fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14,
            background: 'rgba(244,166,35,0.12)', color: '#F4A623', border: '1px solid rgba(244,166,35,0.25)',
          }}>Insurance Comparison</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 38, fontWeight: 900, marginBottom: 12, lineHeight: 1.15 }}>
            Find the Right Cover.<br />At the Right Price.
          </h1>
          <p style={{ color: '#6B7FA3', fontSize: 16, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Compare insurance products side by side — or check what you qualify for in 60 seconds.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 6, maxWidth: 400, margin: '0 auto 32px' }}>
          {[
            { id: 'compare', label: '📊 Compare Products' },

          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', border: 'none',
              background: activeTab === tab.id ? '#F4A623' : 'transparent',
              color: activeTab === tab.id ? '#0A0F1E' : '#6B7FA3',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* COMPARE TAB */}
        {activeTab === 'compare' && (
          <>
            {/* Category selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 36 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => fetchProducts(cat.id)} style={{
                  padding: '20px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.25s', fontFamily: 'inherit', border: 'none',
                  background: selectedCategory === cat.id ? 'rgba(244,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                  borderTop: selectedCategory === cat.id ? '2px solid #F4A623' : '2px solid transparent',
                  boxShadow: selectedCategory === cat.id ? '0 4px 24px rgba(244,166,35,0.15)' : 'none',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{cat.icon}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: selectedCategory === cat.id ? '#F4A623' : '#fff', marginBottom: 4 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7FA3', lineHeight: 1.5 }}>{cat.desc}</div>
                </button>
              ))}
            </div>

            {/* Results */}
            {loading && (
              <div style={{ textAlign: 'center', padding: 60, color: '#6B7FA3' }}>
                <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                <div>Loading products...</div>
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', padding: 40, color: '#EF4444' }}>{error}</div>
            )}

            {!loading && !error && products.length > 0 && (
              <>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, margin: 0 }}>
                    {products.length} Products Found
                  </h2>
                  <span style={{ fontSize: 13, color: '#6B7FA3' }}>Sorted by lowest price</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                  {products.map(p => {
                    const handleQuote = (prod: Product) => { setQuoteModal({ open: true, product: prod }); setLeadDone(false); setLeadForm({ name: '', phone: '' }) };
                    const pc = p as Product;
                    return <div key={pc.id}><ProductCard product={pc} onGetQuote={handleQuote} /></div>
                  })}
                </div>
              </>
            )}

            {!loading && !error && selectedCategory && products.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, marginBottom: 8 }}>No products yet</h3>
                <p style={{ color: '#6B7FA3', marginBottom: 20 }}>No products in this category yet. Ask ARIA for recommendations!</p>
                <Link href="/chat" style={{ padding: '12px 24px', borderRadius: 12, background: '#F4A623', color: '#0A0F1E', fontWeight: 700, textDecoration: 'none', fontFamily: 'Syne, sans-serif' }}>Ask ARIA →</Link>
              </div>
            )}

            {!selectedCategory && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7FA3' }}>
                ↑ Select a category above to compare products
              </div>
            )}
          </>
        )}

      </div>

      {/* Quote Modal */}
      {quoteModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setQuoteModal({ open: false, product: null }) }}>
          <div style={{ background: '#0D1B3E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 32, maxWidth: 420, width: '100%' }}>
            {leadDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, marginBottom: 10 }}>You're all set!</h3>
                <p style={{ color: '#6B7FA3', lineHeight: 1.6, marginBottom: 20 }}>A CoverAI specialist will contact you within 24 hours with the best quote for <strong>{quoteModal.product?.name}</strong>.</p>
                <button onClick={() => setQuoteModal({ open: false, product: null })} style={{ padding: '12px 24px', borderRadius: 12, background: '#F4A623', border: 'none', color: '#0A0F1E', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Get a Quote</h3>

                {/* Product summary */}
                <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(26,58,143,0.25)', border: '1px solid rgba(26,58,143,0.4)', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{(quoteModal.product as any)?.title || quoteModal.product?.name}</div>
                  {(quoteModal.product as any)?.insurer?.name && <div style={{ fontSize: 12, color: '#6B7FA3', marginTop: 2 }}>🏛️ {(quoteModal.product as any).insurer.name}</div>}
                  <div style={{ fontSize: 13, color: '#F4A623', fontWeight: 700, marginTop: 4 }}>
                    {(quoteModal.product as any)?.premium_type === 'relative'
                      ? `${(quoteModal.product as any)?.premium_rate}% of asset value/yr`
                      : `₦${Number((quoteModal.product as any)?.premiumMin || (quoteModal.product as any)?.price || 0).toLocaleString()}/yr`}
                  </div>
                </div>

                {isLoggedIn && userProfile ? (
                  // Logged-in: show auto-populated details, no form needed
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(46,201,126,0.1)', border: '1px solid rgba(46,201,126,0.3)', marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: '#2EC97E', marginBottom: 6, fontWeight: 700 }}>✓ Your details (from profile)</div>
                      <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{userProfile.name}</div>
                      {userProfile.phone && <div style={{ fontSize: 13, color: '#6B7FA3' }}>{userProfile.phone}</div>}
                    </div>
                    <p style={{ color: '#6B7FA3', fontSize: 13, lineHeight: 1.6 }}>
                      A CoverAI specialist will contact you within 24 hours with a personalised quote.
                    </p>
                  </div>
                ) : (
                  // Not logged in: show form
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    <p style={{ color: '#6B7FA3', fontSize: 13, margin: 0 }}>Enter your details and we'll get back to you with the best rate.</p>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Your Name</label>
                      <input style={inputSty} placeholder="Chioma Okonkwo" value={leadForm.name} onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Phone Number</label>
                      <input style={inputSty} type="tel" placeholder="+2348012345678" value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={submitLead} disabled={leadSubmitting || (!isLoggedIn && !leadForm.name)} style={{
                    padding: '13px', borderRadius: 12, background: '#F4A623', border: 'none',
                    color: '#0A0F1E', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    opacity: (leadSubmitting || (!isLoggedIn && !leadForm.name)) ? 0.5 : 1,
                  }}>
                    {leadSubmitting ? 'Submitting...' : '🎯 Request Quote →'}
                  </button>
                  {!isLoggedIn && (
                    <a href="/auth?mode=register" style={{ padding: '10px', borderRadius: 12, background: 'rgba(26,58,143,0.3)', border: '1px solid rgba(26,58,143,0.5)', color: '#7B9FE0', fontWeight: 600, fontSize: 13, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                      Sign up for faster quotes →
                    </a>
                  )}
                  <button onClick={() => setQuoteModal({ open: false, product: null })} style={{ background: 'none', border: 'none', color: '#6B7FA3', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
