'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function Nav({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/predictions', label: 'Pronósticos' },
    { href: '/predictions/especiales', label: 'Especiales' },
    { href: '/', label: 'Tabla' },
    { href: '/profile', label: 'Mi perfil' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className="bg-pitch-900 border-b border-pitch-700">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/Prode-Mundial-2026/wc26-logo.jpg"
            alt="FIFA World Cup 2026"
            className="w-8 h-8 rounded-md object-cover"
          />
          <span className="font-bold text-white tracking-tight">
            Prode <span className="text-gold-400">2026</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-5 text-sm">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-zinc-400 hover:text-gold-400 transition-colors ${l.label === 'Admin' ? 'text-gold-400 font-semibold' : ''}`}>
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
            Salir
          </button>
        </div>

        {/* Mobile hamburger */}
        <button className="sm:hidden text-zinc-400 hover:text-white p-1" onClick={() => setOpen(o => !o)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-pitch-700 py-2">
          {links.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className={`block px-4 py-3 text-sm hover:bg-pitch-800 transition-colors ${l.label === 'Admin' ? 'text-gold-400 font-semibold' : 'text-zinc-300'}`}>
              {l.label}
            </Link>
          ))}
          <button onClick={logout}
            className="block w-full text-left px-4 py-3 text-sm text-zinc-500 hover:bg-pitch-800 transition-colors">
            Salir
          </button>
        </div>
      )}
    </nav>
  )
}
