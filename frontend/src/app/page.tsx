import { Suspense } from 'react'
import HomePage from './home-client'

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#080D1A' }}></div>
    }>
      <HomePage />
    </Suspense>
  )
}
