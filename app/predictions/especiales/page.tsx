'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import type { Team } from '@/lib/types'

export default function EspecialesPage() {
  const supabase = createClient()
  const [teams, setTeams] = useState<Team[]>([])
  const [championId, setChampionId] = useState<string>('')
  const [topScorer, setTopScorer] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isScorer, setIsScorer] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin, is_scorer').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin ?? false)
        setIsScorer(profile?.is_scorer ?? false)
        const { data: teamsData } = await supabase.from('teams').select('*').order('name')
        setTeams((teamsData as Team[]) ?? [])
        const { data: special } = await supabase
          .from('special_predictions').select('*').eq('user_id', session.user.id).single()
        if (special) {
          setChampionId(String(special.champion_team_id ?? ''))
          setTopScorer(special.top_scorer ?? '')
        }
      } catch { router.push('/login') }
    }
    load()
  }, [])

  const save = async () => {
    if (!userId) return
    setSaving(true)
    await supabase.from('special_predictions').upsert({
      user_id: userId,
      champion_team_id: championId ? Number(championId) : null,
      top_scorer: topScorer,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={isAdmin} isScorer={isScorer} />
      <main className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-2">Especiales</h1>
        <p className="text-zinc-500 text-sm mb-6">Pronósticos globales del torneo</p>

        <div className="space-y-4">
          <div className="bg-pitch-800 rounded-2xl border border-pitch-700 p-5">
            <label className="block text-sm font-semibold text-white mb-1">
              🏆 Campeón del mundo
            </label>
            <p className="text-xs text-gold-500 mb-3">+10 pts si acertás</p>
            <select
              value={championId}
              onChange={e => setChampionId(e.target.value)}
              className="w-full bg-pitch-900 border border-pitch-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-500"
            >
              <option value="">— Elegí un equipo —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-pitch-800 rounded-2xl border border-pitch-700 p-5">
            <label className="block text-sm font-semibold text-white mb-1">
              ⚽ Goleador del torneo
            </label>
            <p className="text-xs text-gold-500 mb-3">+5 pts si acertás</p>
            <input
              type="text"
              value={topScorer}
              onChange={e => setTopScorer(e.target.value)}
              placeholder="Nombre del jugador"
              className="w-full bg-pitch-900 border border-pitch-600 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-gold-500"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar'}
        </button>
      </main>
    </div>
  )
}
