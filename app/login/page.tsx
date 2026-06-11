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
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold text-green-700 mb-6 text-center">🏆 Prode Mundial 2026</h1>
        <form onSubmit={login} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-gray-500">
          ¿No tenés cuenta? <Link href="/register" className="text-green-600 hover:underline">Registrate</Link>
        </p>
      </div>
    </div>
  )
}
