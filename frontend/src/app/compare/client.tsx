'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { compareApi, leadsApi } from '@/lib/api'

const CATEGORIES = [
  { id: 'motor', label: 'Motor Insurance', icon: '🚗', desc: 'Vehicle protection — Third Party & Comprehensive' },
  { id: 'property', label: 'Fire & Burglary', icon: '🏪', desc: 'Shop, office & property protection' },
  { id: 'health', label: 'Health Insurance', icon: '❤️', desc: 'Medical cover & HMO plans' },
  { id: 'life', label: 'Life Insurance', icon: '🛡️', desc: 'Financial protection for your family' },
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
}

type EligibilityResult = {
  eligible: boolean
  products: any[]
  message: string
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
              {formatCurrency(product.premiumMin)}
            </div>
            <div style={{ fontSize: 11, color: '#6B7FA3' }}>
              {product.premiumMax ? `– ${formatCurrency(product.premiumMax)}` : ''}/yr
            </div>
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
  const [activeTab, setActiveTab] = useState<'compare' | 'eligibility'>('compare')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Eligibility state
  const [eligibilityForm, setEligibilityForm] = useState({ insuranceType: '', location: '', age: '', hasCar: false, hasBusiness: false })
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null)
  const [eligLoading, setEligLoading] = useState(false)

  // Lead capture modal
  const [quoteModal, setQuoteModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [leadForm, setLeadForm] = useState({ name: '', phone: '' })
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadDone, setLeadDone] = useState(false)

  const fetchProducts = async (category: string) => {
    setSelectedCategory(category)
    setLoading(true)
    setError('')
    setProducts([])
    try {
      const res = await compareApi.byCategory(category, 6)
      const data = res.data?.data || res.data || []
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setError('Could not load products. Please try again.')
    }
    setLoading(false)
  }

  const checkEligibility = async () => {
    if (!eligibilityForm.insuranceType || !eligibilityForm.location) return
    setEligLoading(true)
    setEligibilityResult(null)
    try {
      const res = await compareApi.checkEligibility({
        insuranceType: eligibilityForm.insuranceType,
        location: eligibilityForm.location,
        age: eligibilityForm.age ? parseInt(eligibilityForm.age) : undefined,
        hasCar: eligibilityForm.hasCar,
        hasBusiness: eligibilityForm.hasBusiness,
      })
      setEligibilityResult(res.data?.data || res.data)
    } catch {
      setEligibilityResult({ eligible: false, products: [], message: 'Could not check eligibility. Please try again.' })
    }
    setEligLoading(false)
  }

  const submitLead = async () => {
    if (!leadForm.name || !leadForm.phone) return
    setLeadSubmitting(true)
    try {
      await leadsApi.create({
        insuranceType: quoteModal.product?.category || 'general',
        name: leadForm.name,
        phone: leadForm.phone,
        notes: `Quote requested for: ${quoteModal.product?.name}`,
      })
      setLeadDone(true)
    } catch {
      setLeadDone(true) // Still show success UI even if API fails
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
            { id: 'eligibility', label: '✅ Check Eligibility' },
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
                    return <ProductCard key={p.id} product={p as Product} onGetQuote={handleQuote} />
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

        {/* ELIGIBILITY TAB */}
        {activeTab === 'eligibility' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: 32 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Eligibility Check</h2>
              <p style={{ color: '#6B7FA3', fontSize: 14, marginBottom: 28 }}>Answer a few quick questions to see which products you qualify for.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                    Insurance Type *
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ELIGIBILITY_TYPES.map(t => (
                      <button key={t.id} onClick={() => setEligibilityForm(f => ({ ...f, insuranceType: t.id }))} style={{
                        padding: '8px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                        fontFamily: 'inherit', border: 'none', transition: 'all 0.2s',
                        background: eligibilityForm.insuranceType === t.id ? '#F4A623' : 'rgba(255,255,255,0.06)',
                        color: eligibilityForm.insuranceType === t.id ? '#0A0F1E' : '#6B7FA3',
                        fontWeight: eligibilityForm.insuranceType === t.id ? 700 : 400,
                      }}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Location (State) *</label>
                  <input style={inputSty} placeholder="e.g. Lagos, Abuja, Port Harcourt"
                    value={eligibilityForm.location} onChange={e => setEligibilityForm(f => ({ ...f, location: e.target.value }))} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Age</label>
                  <input style={inputSty} type="number" placeholder="Your age" min="18" max="99"
                    value={eligibilityForm.age} onChange={e => setEligibilityForm(f => ({ ...f, age: e.target.value }))} />
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, padding: '12px 16px', borderRadius: 12, background: eligibilityForm.hasCar ? 'rgba(244,166,35,0.1)' : 'rgba(255,255,255,0.04)', border: eligibilityForm.hasCar ? '1px solid rgba(244,166,35,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" checked={eligibilityForm.hasCar} onChange={e => setEligibilityForm(f => ({ ...f, hasCar: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#F4A623' }} />
                    <span style={{ fontSize: 14 }}>I have a car 🚗</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, padding: '12px 16px', borderRadius: 12, background: eligibilityForm.hasBusiness ? 'rgba(244,166,35,0.1)' : 'rgba(255,255,255,0.04)', border: eligibilityForm.hasBusiness ? '1px solid rgba(244,166,35,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
                    <input type="checkbox" checked={eligibilityForm.hasBusiness} onChange={e => setEligibilityForm(f => ({ ...f, hasBusiness: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#F4A623' }} />
                    <span style={{ fontSize: 14 }}>I run a business 🏪</span>
                  </label>
                </div>

                <button onClick={checkEligibility} disabled={eligLoading || !eligibilityForm.insuranceType || !eligibilityForm.location} style={{
                  padding: '14px', borderRadius: 14, background: '#F4A623', border: 'none',
                  color: '#0A0F1E', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', opacity: (!eligibilityForm.insuranceType || !eligibilityForm.location) ? 0.5 : 1,
                }}>
                  {eligLoading ? 'Checking...' : 'Check Eligibility →'}
                </button>
              </div>

              {/* Results */}
              {eligibilityResult && (
                <div style={{ marginTop: 28, padding: 20, borderRadius: 16, background: eligibilityResult.eligible ? 'rgba(0,194,168,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${eligibilityResult.eligible ? 'rgba(0,194,168,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{eligibilityResult.eligible ? '✅' : '❌'}</div>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: eligibilityResult.eligible ? '#00C2A8' : '#EF4444' }}>
                    {eligibilityResult.message}
                  </p>
                  {eligibilityResult.products.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {eligibilityResult.products.map((p: any) => (
                        <div key={p.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ fontSize: 13, color: '#6B7FA3' }}>{p.description}</div>
                          <div style={{ fontSize: 13, color: '#F4A623', marginTop: 6, fontWeight: 700 }}>
                            {formatCurrency(p.premiumMin)}{p.premiumMax ? ` – ${formatCurrency(p.premiumMax)}` : ''}/yr
                          </div>
                        </div>
                      ))}
                      <Link href="/coverage" style={{ padding: '12px', borderRadius: 12, background: '#F4A623', color: '#0A0F1E', fontWeight: 700, textDecoration: 'none', textAlign: 'center', fontFamily: 'Syne, sans-serif', marginTop: 8, display: 'block' }}>
                        Get Covered Now →
                      </Link>
                    </div>
                  )}
                  {!eligibilityResult.eligible && (
                    <Link href="/chat" style={{ padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 600, textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: 12 }}>
                      Ask ARIA for Help 🤖
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
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
                <p style={{ color: '#6B7FA3', fontSize: 14, marginBottom: 24 }}>
                  We'll connect you with a specialist for <strong style={{ color: '#fff' }}>{quoteModal.product?.name}</strong>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>Your Name *</label>
                    <input style={inputSty} placeholder="Chioma Okonkwo" value={leadForm.name} onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#8A9BBF', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 7 }}>Phone Number *</label>
                    <input style={inputSty} type="tel" placeholder="+2348012345678" value={leadForm.phone} onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <button onClick={submitLead} disabled={leadSubmitting || !leadForm.name || !leadForm.phone} style={{
                    padding: '13px', borderRadius: 12, background: '#F4A623', border: 'none',
                    color: '#0A0F1E', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif', opacity: (!leadForm.name || !leadForm.phone) ? 0.5 : 1,
                  }}>
                    {leadSubmitting ? 'Submitting...' : 'Request Quote →'}
                  </button>
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
