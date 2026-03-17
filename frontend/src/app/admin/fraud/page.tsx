import { Suspense } from 'react'
import FraudClient from './client'
export const metadata = { title: 'Fraud Flags — CoverAI Admin' }
export default function Page() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080D1A' }} />}><FraudClient /></Suspense>
}
