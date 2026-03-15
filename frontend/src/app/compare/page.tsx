import { Suspense } from 'react'
import ComparePage from './client'

export const metadata = {
  title: 'Compare Insurance Products — CoverAI',
  description: 'Compare insurance products side by side. Find the best coverage at the right price for your needs.',
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0A0F1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6B7FA3' }}>Loading...</div>
      </div>
    }>
      <ComparePage />
    </Suspense>
  )
}
