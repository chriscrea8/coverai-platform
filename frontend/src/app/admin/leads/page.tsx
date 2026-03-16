import { Suspense } from 'react'
import AdminLeadsClient from './client'

export const metadata = { title: 'Leads Dashboard — CoverAI Admin' }

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7FA3' }}>Loading...</div>}>
      <AdminLeadsClient />
    </Suspense>
  )
}
