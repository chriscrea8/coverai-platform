import { Suspense } from 'react'
import BrokerClient from './client'

export const metadata = {
  title: 'Partner & Broker Portal — CoverAI',
  description: 'CoverAI Partner Portal for insurance brokers and agents.',
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7FA3' }}>
        Loading...
      </div>
    }>
      <BrokerClient />
    </Suspense>
  )
}
