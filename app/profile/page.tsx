'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase
          .from('profiles').select('display_name, is_admin').eq('id', session.user.id).single()
        setDisplayName(profile?.display_name ?? '')
        setIsAdmin(profile?.is_admin ?? false)
      } catch {
        router.push('/login')
      }
    }
    load()
  }, [])

  const save = async () => {
    if (!userId || !displayName.trim()) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('profiles').update({ display_name: displayName.trim() }).eq('id', userId)
    setSaving(false)
    if (err) { setError('Error al guardar. Intentá de nuevo.'); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <Nav isAdmin={isAdmin} />
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Mi perfil</h1>

        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre en la tabla de posiciones
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder="Tu nombre"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Así te van a ver tus amigos en la tabla.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={save}
            disabled={saving || !displayName.trim()}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </div>
      </main>
    </div>
  )
}
