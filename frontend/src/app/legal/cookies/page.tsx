'use client'
export const dynamic = 'force-dynamic'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <div className="pt-20 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="py-12">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-semibold text-muted mb-4 uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.06)' }}>Legal</div>
            <h1 className="font-syne font-black text-4xl mb-2">Cookie Policy</h1>
            <p className="text-muted text-sm">Last updated: March 1, 2026</p>
          </div>
          <div className="prose prose-invert space-y-8 text-sm leading-relaxed text-muted">
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-syne font-bold text-white text-lg mb-3">1. Overview</h2>
              <p>CoverAI Technologies Ltd ("CoverAI", "we", "us") is a technology company incorporated in Nigeria (RC 1234567) that provides an AI-powered insurance distribution platform. We are regulated by the National Insurance Commission (NAICOM) as an insurance intermediary.</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-syne font-bold text-white text-lg mb-3">2. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal information at any time. To exercise these rights, contact us at <a href="mailto:legal@coverai.ng" className="text-accent hover:underline">legal@coverai.ng</a>. We will respond to all requests within 30 days.</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: 'rgba(13,27,62,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-syne font-bold text-white text-lg mb-3">3. Contact Us</h2>
              <p>For any legal queries, privacy concerns, or complaints:</p>
              <div className="mt-3 space-y-1">
                <p>📧 <a href="mailto:legal@coverai.ng" className="text-accent hover:underline">legal@coverai.ng</a></p>
                <p>📍 14 Broad Street, Lagos Island, Lagos, Nigeria</p>
                <p>📞 +234 800 COVERAI</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
