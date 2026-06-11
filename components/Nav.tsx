'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

export default function Nav({ isAdmin }: { isAdmin?: boolean }) {
  const router = useRouter()
  const supabase = createClient()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-green-700 text-white px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">🏆 Prode 2026</Link>
      <div className="flex gap-4 text-sm">
        <Link href="/predictions" className="hover:underline">Pronósticos</Link>
        <Link href="/predictions/especiales" className="hover:underline">Especiales</Link>
        <Link href="/" className="hover:underline">Tabla</Link>
        {isAdmin && <Link href="/admin" className="hover:underline font-semibold">Admin</Link>}
        <button onClick={logout} className="hover:underline text-green-200">Salir</button>
      </div>
    </nav>
  )
}
