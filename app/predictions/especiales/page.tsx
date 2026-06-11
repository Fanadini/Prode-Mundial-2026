'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      setIsAdmin(profile?.is_admin ?? false)

      const { data: teamsData } = await supabase.from('teams').select('*').order('name')
      setTeams((teamsData as Team[]) ?? [])

      const { data: special } = await supabase
        .from('special_predictions').select('*').eq('user_id', user.id).single()
      if (special) {
        setChampionId(String(special.champion_team_id ?? ''))
        setTopScorer(special.top_scorer ?? '')
      }
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
    <div>
      <Nav isAdmin={isAdmin} />
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Pronósticos especiales</h1>

        <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏆 Campeón del mundo
              <span className="ml-2 text-xs text-green-600 font-normal">(10 pts si acertás)</span>
            </label>
            <select
              value={championId}
              onChange={e => setChampionId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">-- Elegí un equipo --</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.flag} {t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⚽ Goleador del torneo
              <span className="ml-2 text-xs text-green-600 font-normal">(5 pts si acertás)</span>
            </label>
            <input
              type="text"
              value={topScorer}
              onChange={e => setTopScorer(e.target.value)}
              placeholder="Nombre del jugador"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar'}
        </button>
      </main>
    </div>
  )
}
