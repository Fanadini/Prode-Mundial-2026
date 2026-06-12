import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Pronosticá los partidos del Mundial',
  manifest: '/Prode-Mundial-2026/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Prode 2026' },
  icons: {
    icon: '/Prode-Mundial-2026/icon-192.png',
    apple: '/Prode-Mundial-2026/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#080A0C" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-pitch-950 min-h-screen text-white">{children}</body>
    </html>
  )
}
