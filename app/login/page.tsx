'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pitch-950 px-4">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-2xl font-bold text-white">Prode <span className="text-gold-400">Mundial 2026</span></h1>
        <p className="text-zinc-500 text-sm mt-1">by FB</p>
      </div>

      <div className="w-full max-w-sm bg-pitch-800 rounded-2xl p-6 border border-pitch-700">
        <h2 className="text-lg font-semibold text-white mb-5">Entrar</h2>
        <form onSubmit={login} className="space-y-4">
          <input
            className="w-full bg-pitch-900 border border-pitch-600 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold-500"
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full bg-pitch-900 border border-pitch-600 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold-500"
            type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-zinc-500">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-gold-400 hover:text-gold-300">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
