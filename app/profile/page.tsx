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
  const [isScorer, setIsScorer] = useState(false)
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
          .from('profiles').select('display_name, is_admin, is_scorer').eq('id', session.user.id).single()
        setDisplayName(profile?.display_name ?? '')
        setIsAdmin(profile?.is_admin ?? false)
        setIsScorer(profile?.is_scorer ?? false)
      } catch { router.push('/login') }
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
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={isAdmin} isScorer={isScorer} />
      <main className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-6">Mi perfil</h1>

        <div className="bg-pitch-800 rounded-2xl border border-pitch-700 p-5">
          <label className="block text-sm font-semibold text-white mb-1">
            Nombre en la tabla
          </label>
          <p className="text-xs text-zinc-500 mb-3">Así te ven tus amigos en el ranking.</p>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={30}
            placeholder="Tu nombre"
            className="w-full bg-pitch-900 border border-pitch-600 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold-500"
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <button
          onClick={save}
          disabled={saving || !displayName.trim()}
          className="mt-5 w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar nombre'}
        </button>
      </main>
    </div>
  )
}
