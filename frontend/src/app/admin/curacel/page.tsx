import { Suspense } from 'react'
import CuracelAdminClient from './client'
export const metadata = { title: 'Curacel Integration — CoverAI Admin' }
export default function Page() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080D1A' }} />}><CuracelAdminClient /></Suspense>
}
