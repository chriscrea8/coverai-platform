/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress specific build warnings
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'coverai-documents.s3.amazonaws.com' },
    ],
  },
  // Ensure all pages are treated as dynamic (no static prerender issues)
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = nextConfig
