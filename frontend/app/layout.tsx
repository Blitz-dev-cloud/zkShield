import type { Metadata, Viewport } from 'next'
import { Manrope, IBM_Plex_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Sidebar } from '@/components/sidebar'

const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: '--font-ibm',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'zkShield++ | Zero-Knowledge Network Firewall',
  description: 'A privacy-preserving firewall where packets prove identity and safety using zero-knowledge cryptography.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0B0F14',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${ibmPlexMono.variable} font-sans antialiased`}>
        <div className="relative flex min-h-screen overflow-hidden circuit-bg">
          <div aria-hidden className="ambient-orb ambient-orb-cyan" />
          <div aria-hidden className="ambient-orb ambient-orb-orange" />
          <div aria-hidden className="scanline-overlay" />
          <Sidebar />
          <main className="relative z-10 flex-1 px-4 pt-6 pb-24 md:ml-72 md:px-10 md:pt-8 md:pb-8">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
