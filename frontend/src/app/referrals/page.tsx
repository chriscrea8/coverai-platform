import { Suspense } from 'react'
import ReferralsClient from './client'
export const metadata = { title: 'Refer & Earn — CoverAI' }
export default function Page() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080D1A' }} />}><ReferralsClient /></Suspense>
}
