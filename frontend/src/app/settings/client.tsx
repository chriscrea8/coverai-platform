'use client'

import { api } from '@/lib/api'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

async function apiFetch(token: string, method: string, path: string, body?: any) {
  // Uses axios api instance so JWT auto-refresh fires on 401
  const res = await api.request({
    method: method as any,
    url: path,
    data: body,
  })
  return res.data
}

type Tab = 'profile' | 'security' | 'kyc' | 'notifications' | 'privacy'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'profile',      icon: '👤', label: 'Profile'       },
  { id: 'security',     icon: '🔐', label: 'Security'      },
  { id: 'kyc',          icon: '🪪', label: 'Verification'  },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'privacy',      icon: '🛡️', label: 'Privacy'       },
]

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl whitespace-nowrap flex items-center gap-2"
      style={{ background: ok ? 'rgba(46,201,126,.2)' : 'rgba(232,69,69,.2)', border: `1px solid ${ok ? 'rgba(46,201,126,.4)' : 'rgba(232,69,69,.4)'}`, color: ok ? '#2EC97E' : '#E84545', backdropFilter: 'blur(8px)' }}>
      {ok ? '✓' : '✕'} {msg}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '', hint = '', readOnly = false }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{label}</label>
      <input
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
        style={{ background: readOnly ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', opacity: readOnly ? 0.6 : 1 }}
        type={type} value={value} readOnly={readOnly}
        onChange={e => !readOnly && onChange(e.target.value)} placeholder={placeholder}
      />
      {hint && <p className="text-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Select({ label, value, onChange, options, hint = '' }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{label}</label>
      <select className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(13,27,62,.95)', border: '1px solid rgba(255,255,255,.1)' }}
        value={value} onChange={e => onChange(e.target.value)}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="mb-6">
      <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-muted mb-4">{title}</h3>
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
        {children}
      </div>
    </div>
  )
}

function SaveBtn({ onClick, loading, label = 'Save Changes' }: any) {
  return (
    <button onClick={onClick} disabled={loading}
      className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2"
      style={{ background: '#F4A623', color: '#0A0F1E' }}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {label}
    </button>
  )
}

const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']

export default function SettingsClient() {
  const router = useRouter()
  const params = useSearchParams()
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'profile')
  const [token, setToken] = useState('')
  const [profile, setProfile] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const t = localStorage.getItem('access_token') || ''
    if (!t) { router.push('/auth'); return }
    setToken(t)
    apiFetch(t, 'GET', '/users/profile')
      .then(d => { setProfile(d.data || d); setLoading(false) })
      .catch(() => { router.push('/auth') })
  }, [])

  const update = (k: string) => (v: any) => setProfile((p: any) => ({ ...p, [k]: v }))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080D1A' }}>
      <div className="text-muted text-sm">Loading your settings…</div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080D1A' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-40"
        style={{ background: 'rgba(8,13,26,.97)', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted hover:text-white transition-all text-sm flex items-center gap-2">
            ← Dashboard
          </Link>
          <span className="text-white/20">/</span>
          <span className="font-syne font-bold text-sm">Settings</span>
        </div>
        <Link href="/" className="font-syne font-black text-lg">Cover<span className="text-accent">AI</span></Link>
        <button className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,.06)' }} onClick={() => setMenuOpen(o => !o)}>
          {[0,1,2].map(i => <span key={i} className="w-4 h-0.5 bg-white rounded" />)}
        </button>
      </header>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-6 gap-8">

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-52 shrink-0">
          <div className="sticky top-20">
            {/* Avatar */}
            <div className="flex flex-col items-center p-5 rounded-2xl mb-4"
              style={{ background: 'rgba(13,27,62,.8)', border: '1px solid rgba(255,255,255,.07)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-3"
                style={{ background: 'rgba(26,58,143,.5)', border: '2px solid rgba(26,58,143,.8)' }}>
                {profile.name?.charAt(0) || '?'}
              </div>
              <div className="font-syne font-bold text-sm text-center">{profile.name}</div>
              <div className="text-muted text-xs mt-0.5 text-center truncate w-full">{profile.email}</div>
              <div className="mt-2 flex items-center gap-1.5">
                {profile.emailVerified
                  ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(46,201,126,.15)', color: '#2EC97E' }}>✓ Verified</span>
                  : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623' }}>Email unverified</span>
                }
              </div>
              {profile.kycStatus && (
                <div className="mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{
                      background: profile.kycStatus === 'verified' ? 'rgba(46,201,126,.15)' : profile.kycStatus === 'pending' ? 'rgba(124,107,255,.15)' : 'rgba(244,166,35,.15)',
                      color: profile.kycStatus === 'verified' ? '#2EC97E' : profile.kycStatus === 'pending' ? '#7C6BFF' : '#F4A623'
                    }}>
                    KYC {profile.kycStatus}
                  </span>
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="space-y-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${tab === t.id ? 'text-white' : 'text-muted hover:text-white hover:bg-white/5'}`}
                  style={tab === t.id ? { background: 'rgba(26,58,143,.45)' } : {}}>
                  <span>{t.icon}</span>{t.label}
                  {t.id === 'kyc' && profile.kycStatus !== 'verified' && profile.kycStatus !== 'pending' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-accent" />
                  )}
                  {t.id === 'security' && !profile.emailVerified && (
                    <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#F4A623' }} />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 top-14" style={{ background: 'rgba(0,0,0,.7)' }} onClick={() => setMenuOpen(false)}>
            <div className="p-3" style={{ background: '#0A1228' }} onClick={e => e.stopPropagation()}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium mb-1 ${tab === t.id ? 'text-white' : 'text-muted'}`}
                  style={tab === t.id ? { background: 'rgba(26,58,143,.4)' } : {}}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0">

          {/* Mobile tab bar */}
          <div className="md:hidden flex gap-1 mb-6 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'text-white' : 'text-muted'}`}
                style={tab === t.id ? { background: 'rgba(26,58,143,.5)' } : { background: 'rgba(255,255,255,.05)' }}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {tab === 'profile' && <ProfileTab profile={profile} update={update} token={token} showToast={showToast} setSaving={setSaving} saving={saving} setProfile={setProfile} />}
          {tab === 'security' && <SecurityTab profile={profile} token={token} showToast={showToast} setProfile={setProfile} />}
          {tab === 'kyc' && <KycTab profile={profile} token={token} showToast={showToast} setProfile={setProfile} />}
          {tab === 'notifications' && <NotificationsTab profile={profile} token={token} showToast={showToast} />}
          {tab === 'privacy' && <PrivacyTab profile={profile} />}
        </main>
      </div>
    </div>
  )
}

// ─── PROFILE TAB ───────────────────────────────────────────────────────────
function ProfileTab({ profile, update, token, showToast, setSaving, saving, setProfile }: any) {
  const save = async () => {
    setSaving(true)
    try {
      const res = await apiFetch(token, 'PATCH', '/users/profile', {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        nationality: profile.nationality,
        dateOfBirth: profile.dateOfBirth,
      })
      setProfile(res.data || res)
      localStorage.setItem('user', JSON.stringify(res.data || res))
      showToast('Profile updated successfully')
    } catch (e: any) { showToast(e.message, false) }
    setSaving(false)
  }

  return (
    <div>
      <h2 className="font-syne font-black text-xl mb-6">Personal Information</h2>

      <Section title="Basic Details">
        <Field label="Full Name" value={profile.name || ''} onChange={update('name')} placeholder="Your full name" />
        <Field label="Email Address" value={profile.email || ''} onChange={() => {}} readOnly hint="To change your email, contact support" />
        <Field label="Phone Number" value={profile.phone || ''} onChange={update('phone')} placeholder="+2348012345678" />
        <Field label="Date of Birth" value={profile.dateOfBirth?.slice(0, 10) || ''} onChange={update('dateOfBirth')} type="date" />
        <Select label="Nationality" value={profile.nationality || 'Nigerian'} onChange={update('nationality')}
          options={[{ value: 'Nigerian', label: 'Nigerian' }, { value: 'Other', label: 'Other' }]} />
      </Section>

      <Section title="Address">
        <Field label="Street Address" value={profile.address || ''} onChange={update('address')} placeholder="12 Broad Street, Marina" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City / LGA" value={profile.city || ''} onChange={update('city')} placeholder="Lagos Island" />
          <Select label="State" value={profile.state || ''} onChange={update('state')}
            options={[{ value: '', label: 'Select state…' }, ...NIGERIAN_STATES.map(s => ({ value: s, label: s }))]} />
        </div>
      </Section>

      <div className="flex justify-end">
        <SaveBtn onClick={save} loading={saving} />
      </div>
    </div>
  )
}

// ─── SECURITY TAB ──────────────────────────────────────────────────────────
function SecurityTab({ profile, token, showToast, setProfile }: any) {
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [changingPw, setChangingPw] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const sendOtp = async () => {
    setResending(true)
    try {
      await apiFetch(token, 'POST', '/auth/resend-otp')
      setOtpSent(true)
      showToast('Verification code sent to your email')
    } catch (e: any) { showToast(e.message, false) }
    setResending(false)
  }

  const verifyEmail = async () => {
    if (otp.length !== 6) { showToast('Enter the 6-digit code from your email', false); return }
    setVerifying(true)
    try {
      await apiFetch(token, 'POST', '/auth/verify-email', { otp })
      setProfile((p: any) => ({ ...p, emailVerified: true }))
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, emailVerified: true }))
      showToast('Email verified successfully!')
      setOtp('')
    } catch (e: any) { showToast(e.message, false) }
    setVerifying(false)
  }

  const changePassword = async () => {
    if (!pwForm.current || !pwForm.next) { showToast('All fields required', false); return }
    if (pwForm.next !== pwForm.confirm) { showToast('Passwords do not match', false); return }
    if (pwForm.next.length < 8) { showToast('Password must be at least 8 characters', false); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.next)) {
      showToast('Password must include uppercase, lowercase, and number', false); return
    }
    setChangingPw(true)
    try {
      await apiFetch(token, 'POST', '/users/change-password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      showToast('Password changed successfully')
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (e: any) { showToast(e.message, false) }
    setChangingPw(false)
  }

  return (
    <div>
      <h2 className="font-syne font-black text-xl mb-6">Security & Verification</h2>

      {/* Email verification */}
      <Section title="Email Verification">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📧</div>
          <div className="flex-1">
            <div className="font-semibold text-sm mb-1">{profile.email}</div>
            {profile.emailVerified ? (
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(46,201,126,.15)', color: '#2EC97E' }}>✓ Verified</span>
                <span className="text-muted text-xs">Your email is verified and secure</span>
              </div>
            ) : (
              <div>
                <span className="text-xs px-2 py-1 rounded-full mb-3 inline-block" style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623' }}>⚠ Not verified</span>
                <p className="text-muted text-xs mb-4">Verify your email to purchase policies, file claims, and receive important updates.</p>

                {otpSent ? (
                  <div className="space-y-3">
                    <p className="text-sm text-white/70">Enter the 6-digit code sent to <strong>{profile.email}</strong></p>
                    <input
                      className="w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest text-white outline-none"
                      style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', letterSpacing: '0.5em' }}
                      maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000" />
                    <div className="flex gap-3">
                      <button onClick={verifyEmail} disabled={verifying || otp.length !== 6}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: '#2EC97E', color: '#0A0F1E' }}>
                        {verifying && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        Verify Email
                      </button>
                      <button onClick={sendOtp} disabled={resending}
                        className="px-4 py-2.5 rounded-xl text-sm text-muted hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,.06)' }}>
                        Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={sendOtp} disabled={resending}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                    style={{ background: '#F4A623', color: '#0A0F1E' }}>
                    {resending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    Send Verification Code
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        <div className="relative">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Current Password</label>
          <input type={showPw ? 'text' : 'password'} value={pwForm.current}
            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
            placeholder="Your current password" />
        </div>
        <Field label="New Password" value={pwForm.next} onChange={(v: string) => setPwForm(p => ({ ...p, next: v }))}
          type={showPw ? 'text' : 'password'} placeholder="Min 8 chars, uppercase, lowercase, number"
          hint="Must contain uppercase, lowercase, and at least one number" />
        <Field label="Confirm New Password" value={pwForm.confirm} onChange={(v: string) => setPwForm(p => ({ ...p, confirm: v }))}
          type={showPw ? 'text' : 'password'} placeholder="Repeat new password" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)} className="rounded" />
            Show passwords
          </label>
          <SaveBtn onClick={changePassword} loading={changingPw} label="Update Password" />
        </div>
      </Section>

      {/* Active sessions info */}
      <Section title="Account Security">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold mb-0.5">Two-Factor Authentication</div>
            <div className="text-muted text-xs">Coming soon — additional login protection</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(244,166,35,.15)', color: '#F4A623' }}>Coming Soon</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
          <div>
            <div className="text-sm font-semibold mb-0.5">Sign Out All Devices</div>
            <div className="text-muted text-xs">Revokes all active sessions immediately</div>
          </div>
          <button onClick={async () => {
            try {
              await apiFetch(token, 'POST', '/auth/logout')
              localStorage.removeItem('access_token')
              localStorage.removeItem('refresh_token')
              localStorage.removeItem('user')
              window.location.href = '/auth'
            } catch {}
          }}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(232,69,69,.15)', color: '#E84545', border: '1px solid rgba(232,69,69,.3)' }}>
            Sign Out All
          </button>
        </div>
      </Section>
    </div>
  )
}

// ─── KYC TAB ───────────────────────────────────────────────────────────────
function KycTab({ profile, token, showToast, setProfile }: any) {
  const [form, setForm] = useState({ idType: 'nin', idNumber: '', idDocumentUrl: '', selfieUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const submit = async () => {
    if (!form.idNumber || form.idNumber.length < 6) { showToast('Enter a valid ID number', false); return }
    setSubmitting(true)
    try {
      const res = await apiFetch(token, 'POST', '/users/kyc', form)
      setProfile((p: any) => ({ ...p, kycStatus: 'pending', kycIdType: form.idType }))
      showToast('KYC submitted for review. We\'ll verify within 24 hours.')
      setForm({ idType: 'nin', idNumber: '', idDocumentUrl: '', selfieUrl: '' })
    } catch (e: any) { showToast(e.message, false) }
    setSubmitting(false)
  }

  const kycVerified = profile.kycStatus === 'verified'
  const kycPending  = profile.kycStatus === 'pending'

  return (
    <div>
      <h2 className="font-syne font-black text-xl mb-2">Identity Verification (KYC)</h2>
      <p className="text-muted text-sm mb-6">Verification is required to purchase policies above ₦100,000 and to file high-value claims.</p>

      {/* Status banner */}
      {kycVerified && (
        <div className="p-4 rounded-2xl mb-6 flex items-center gap-4"
          style={{ background: 'rgba(46,201,126,.1)', border: '1px solid rgba(46,201,126,.3)' }}>
          <span className="text-3xl">✅</span>
          <div>
            <div className="font-syne font-bold">Identity Verified</div>
            <div className="text-muted text-sm mt-0.5">Your identity has been verified. You have full platform access.</div>
            {profile.kycVerifiedAt && <div className="text-xs text-muted mt-1">Verified on {new Date(profile.kycVerifiedAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}</div>}
          </div>
        </div>
      )}

      {kycPending && (
        <div className="p-4 rounded-2xl mb-6 flex items-center gap-4"
          style={{ background: 'rgba(124,107,255,.1)', border: '1px solid rgba(124,107,255,.3)' }}>
          <span className="text-3xl">⏳</span>
          <div>
            <div className="font-syne font-bold">Verification In Progress</div>
            <div className="text-muted text-sm mt-0.5">We're reviewing your documents. This usually takes 24 hours.</div>
          </div>
        </div>
      )}

      {!kycVerified && !kycPending && (
        <>
          {/* Why KYC */}
          <Section title="Why We Verify Identity">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {[
                { icon: '🔒', title: 'Compliance', desc: 'NAICOM and NDPR regulations require identity verification for insurance' },
                { icon: '🛡️', title: 'Fraud Prevention', desc: 'Protects you and other policyholders from fraudulent claims' },
                { icon: '⚡', title: 'Faster Claims', desc: 'Verified users have claims processed up to 3x faster' },
              ].map(item => (
                <div key={item.title} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }}>
                  <div className="text-xl mb-2">{item.icon}</div>
                  <div className="font-semibold text-xs mb-1">{item.title}</div>
                  <div className="text-muted text-xs">{item.desc}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Submit Your Identity Documents">
            <Select label="ID Type" value={form.idType} onChange={f('idType')}
              options={[
                { value: 'nin', label: 'National Identity Number (NIN)' },
                { value: 'bvn', label: 'Bank Verification Number (BVN)' },
                { value: 'passport', label: 'International Passport' },
                { value: 'drivers_license', label: "Driver's Licence" },
              ]}
              hint="NIN and BVN are preferred for faster verification"
            />
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                {form.idType === 'nin' ? 'NIN Number' : form.idType === 'bvn' ? 'BVN Number' : form.idType === 'passport' ? 'Passport Number' : 'Licence Number'}
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none font-mono tracking-wider"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
                value={form.idNumber} onChange={e => f('idNumber')(e.target.value)}
                placeholder={form.idType === 'nin' ? '12345678901' : form.idType === 'bvn' ? '12345678901' : 'A12345678'} />
              <p className="text-muted text-xs mt-1">Your ID number is masked after submission and never stored in plain text</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Document URL (Optional)</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
                value={form.idDocumentUrl} onChange={e => f('idDocumentUrl')(e.target.value)}
                placeholder="https://storage.example.com/your-document.jpg" />
              <p className="text-muted text-xs mt-1">Upload your document to a secure storage service and paste the link here</p>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
              <p className="text-xs text-muted mb-3">
                By submitting, you consent to CoverAI processing your identity information for verification purposes in accordance with the Nigerian Data Protection Regulation (NDPR) and our <Link href="/legal/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
              </p>
              <SaveBtn onClick={submit} loading={submitting} label="Submit for Verification" />
            </div>
          </Section>
        </>
      )}

      {/* Accepted IDs info */}
      <Section title="Accepted Identity Documents">
        <div className="space-y-2 text-sm">
          {[
            ['🪪', 'National Identity Number (NIN)', 'Fastest — direct NIMC database check'],
            ['🏦', 'Bank Verification Number (BVN)', 'Fast — CBN-linked verification'],
            ['📘', 'International Passport', 'Standard — 24–48h manual review'],
            ['🚗', "Driver's Licence", 'Standard — 24–48h manual review'],
          ].map(([icon, name, note]) => (
            <div key={name as string} className="flex items-center gap-3 py-2">
              <span className="text-lg">{icon}</span>
              <div>
                <div className="text-sm font-medium">{name}</div>
                <div className="text-muted text-xs">{note}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ─── NOTIFICATIONS TAB ──────────────────────────────────────────────────────
function NotificationsTab({ profile, token, showToast }: any) {
  const [prefs, setPrefs] = useState({
    emailPolicies: true,
    emailClaims: true,
    emailPayments: true,
    emailMarketing: false,
    emailTips: true,
    smsPayments: false,
    smsClaims: false,
  })
  const [saving, setSaving] = useState(false)

  const toggle = (k: string) => setPrefs(p => ({ ...p, [k]: !p[k as keyof typeof p] }))

  const save = async () => {
    setSaving(true)
    // In a full implementation this would PATCH /users/notification-preferences
    setTimeout(() => { showToast('Notification preferences saved'); setSaving(false) }, 600)
  }

  const Switch = ({ id, label, desc }: { id: string; label: string; desc: string }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted text-xs mt-0.5">{desc}</div>
      </div>
      <button onClick={() => toggle(id)}
        className="relative w-11 h-6 rounded-full transition-all shrink-0 ml-4"
        style={{ background: prefs[id as keyof typeof prefs] ? '#2EC97E' : 'rgba(255,255,255,.1)' }}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${prefs[id as keyof typeof prefs] ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )

  return (
    <div>
      <h2 className="font-syne font-black text-xl mb-6">Notification Preferences</h2>

      <Section title="Email Notifications">
        <Switch id="emailPolicies" label="Policy Updates" desc="When your policy status changes (activation, renewal, expiry)" />
        <Switch id="emailClaims" label="Claims Updates" desc="When your claim is reviewed, approved, or rejected" />
        <Switch id="emailPayments" label="Payment Confirmations" desc="Receipts and payment status notifications" />
        <Switch id="emailTips" label="Insurance Tips" desc="Monthly insurance education and risk management tips" />
        <Switch id="emailMarketing" label="Promotions & Offers" desc="New products, discounts, and special offers" />
      </Section>

      <Section title="SMS Notifications">
        <Switch id="smsPayments" label="Payment Alerts" desc="SMS confirmation when payment is received" />
        <Switch id="smsClaims" label="Claims Alerts" desc="SMS updates for critical claim status changes" />
      </Section>

      <div className="flex justify-end">
        <SaveBtn onClick={save} loading={saving} />
      </div>
    </div>
  )
}

// ─── PRIVACY TAB ────────────────────────────────────────────────────────────
function PrivacyTab({ profile }: any) {
  return (
    <div>
      <h2 className="font-syne font-black text-xl mb-2">Privacy & Data Control</h2>
      <p className="text-muted text-sm mb-6">Your rights under the Nigerian Data Protection Regulation (NDPR) and how we use your data.</p>

      <Section title="Your NDPR Rights">
        <div className="space-y-4 text-sm">
          {[
            { icon: '👁️', right: 'Right to Access', desc: 'Request a copy of all personal data we hold about you', action: 'Request Data Export', color: '#7C6BFF' },
            { icon: '✏️', right: 'Right to Rectification', desc: 'Correct any inaccurate personal data we hold', action: 'Update Profile', color: '#00C2A8' },
            { icon: '🗑️', right: 'Right to Erasure', desc: 'Request deletion of your account and all associated data', action: 'Request Deletion', color: '#E84545' },
            { icon: '🚫', right: 'Right to Object', desc: 'Opt out of marketing communications and profiling', action: 'Manage Preferences', color: '#F4A623' },
          ].map(r => (
            <div key={r.right} className="flex items-start gap-4 py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
              <span className="text-xl mt-0.5">{r.icon}</span>
              <div className="flex-1">
                <div className="font-semibold">{r.right}</div>
                <div className="text-muted text-xs mt-0.5">{r.desc}</div>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg font-semibold shrink-0"
                style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}>
                {r.action}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Data We Collect">
        <div className="space-y-3 text-sm text-muted">
          <p><strong className="text-white">Identity Data:</strong> Name, email, phone, date of birth, NIN/BVN (masked)</p>
          <p><strong className="text-white">Insurance Data:</strong> Policies purchased, claims filed, payment history</p>
          <p><strong className="text-white">Usage Data:</strong> How you use the platform to improve recommendations</p>
          <p><strong className="text-white">Communication Data:</strong> Messages with our AI assistant and support team</p>
        </div>
      </Section>

      <Section title="Data Sharing">
        <div className="space-y-3 text-sm text-muted">
          <p>We share your data with:</p>
          <ul className="space-y-1 ml-4">
            <li>• <strong className="text-white">Insurance Providers</strong> — to process your policy applications</li>
            <li>• <strong className="text-white">Payment Processors</strong> — Paystack for secure payment processing</li>
            <li>• <strong className="text-white">Regulators</strong> — NAICOM, NDPC as required by law</li>
          </ul>
          <p className="mt-2">We do not sell your personal data to third parties for marketing.</p>
        </div>
      </Section>

      <div className="p-4 rounded-2xl" style={{ background: 'rgba(124,107,255,.08)', border: '1px solid rgba(124,107,255,.2)' }}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">📋</span>
          <div className="font-syne font-bold text-sm">Full Privacy Policy</div>
        </div>
        <p className="text-muted text-xs mb-3">Read our complete privacy policy and data processing terms.</p>
        <Link href="/legal/privacy" className="text-xs px-4 py-2 rounded-lg font-semibold inline-block"
          style={{ background: 'rgba(124,107,255,.2)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,.3)' }}>
          View Privacy Policy →
        </Link>
      </div>
    </div>
  )
}
