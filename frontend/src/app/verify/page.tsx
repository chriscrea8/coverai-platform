import { Suspense } from 'react'
import VerifyClient from './client'
export const metadata = { title: 'Vehicle Insurance Verification — CoverAI', description: 'Check if a vehicle has valid insurance in Nigeria. Instant verification by plate number.' }
export default function Page() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080D1A' }} />}><VerifyClient /></Suspense>
}
