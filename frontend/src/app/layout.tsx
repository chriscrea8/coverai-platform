import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import ARIAWidget from '@/components/ARIAWidget'
import IdleWatcher from '@/components/IdleWatcher'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'CoverAI — Insurance for African Businesses',
  description: 'AI-powered insurance platform for SMEs in Nigeria and across Africa.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-dm bg-ink text-white antialiased">
        {children}
        <ARIAWidget />
        <IdleWatcher />
      </body>
    </html>
  )
}
