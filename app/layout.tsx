import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prode Mundial 2026',
  description: 'Pronosticá los partidos del Mundial',
  manifest: '/Prode-Mundial-2026/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prode 2026',
  },
  icons: {
    icon: '/Prode-Mundial-2026/icon-192.png',
    apple: '/Prode-Mundial-2026/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#15803d" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
