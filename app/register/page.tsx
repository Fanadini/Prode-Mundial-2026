'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-8 rounded-xl shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold text-green-700 mb-6 text-center">Crear cuenta</h1>
        <form onSubmit={register} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="text" placeholder="Tu nombre (ej: Facu)" value={name}
            onChange={e => setName(e.target.value)} required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            type="password" placeholder="Contraseña (mín. 6 caracteres)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-gray-500">
          ¿Ya tenés cuenta? <Link href="/login" className="text-green-600 hover:underline">Entrá</Link>
        </p>
      </div>
    </div>
  )
}
