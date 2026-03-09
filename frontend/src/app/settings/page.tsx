import { Suspense } from 'react'
import SettingsClient from './client'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6B7FA3', fontSize: '14px' }}>Loading settings…</div>
      </div>
    }>
      <SettingsClient />
    </Suspense>
  )
}
