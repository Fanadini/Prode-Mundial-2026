'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import type { Match, Prediction, Team } from '@/lib/types'

type MatchWithTeams = Match & { home_team: Team; away_team: Team }

export default function PredictionsPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [predictions, setPredictions] = useState<Record<number, { home: string; away: string }>>({})
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('A')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setUserId(user.id)

        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setIsAdmin(profile?.is_admin ?? false)

        const { data: matchData } = await supabase
          .from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
          .eq('stage', 'group')
          .order('id')

        setMatches((matchData as MatchWithTeams[]) ?? [])

        const { data: predData } = await supabase
          .from('predictions').select('*').eq('user_id', user.id)

        const predMap: Record<number, { home: string; away: string }> = {}
        const locked = new Set<number>()
        for (const p of (predData as Prediction[]) ?? []) {
          predMap[p.match_id] = { home: String(p.home_score), away: String(p.away_score) }
          locked.add(p.match_id)
        }
        setPredictions(predMap)
        setSavedIds(locked)
      } catch {
        router.push('/login')
      }
    }
    load()
  }, [])

  const groups = [...new Set(matches.map(m => m.home_team?.group_name).filter(Boolean))]
  const filteredMatches = matches.filter(m => m.home_team?.group_name === selectedGroup)

  const save = async () => {
    if (!userId) return
    setSaving(true)
    // Solo se insertan pronósticos nuevos: los ya guardados quedan bloqueados
    const rows = Object.entries(predictions)
      .filter(([matchId, v]) => v.home !== '' && v.away !== '' && !savedIds.has(Number(matchId)))
      .map(([matchId, v]) => ({
        user_id: userId,
        match_id: Number(matchId),
        home_score: Number(v.home),
        away_score: Number(v.away),
      }))

    if (rows.length > 0) {
      const { error } = await supabase.from('predictions').insert(rows)
      if (!error) {
        setSavedIds(prev => new Set([...prev, ...rows.map(r => r.match_id)]))
      }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <Nav isAdmin={isAdmin} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Pronósticos — Fase de grupos</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g!)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedGroup === g
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Grupo {g}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredMatches.map(match => {
            const pred = predictions[match.id] ?? { home: '', away: '' }
            const locked = match.is_finished || savedIds.has(match.id)
            return (
              <div key={match.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <span className="text-lg">{match.home_team?.flag}</span>
                    <span className="ml-2 font-medium text-sm">{match.home_team?.name}</span>
                  </div>
                  <input
                    type="number" min="0" max="20"
                    value={pred.home}
                    disabled={locked}
                    onChange={e => setPredictions(p => ({ ...p, [match.id]: { ...pred, home: e.target.value } }))}
                    className="w-12 text-center border rounded-lg py-1 text-lg font-bold disabled:bg-gray-100"
                  />
                  <span className="text-gray-400 text-sm">vs</span>
                  <input
                    type="number" min="0" max="20"
                    value={pred.away}
                    disabled={locked}
                    onChange={e => setPredictions(p => ({ ...p, [match.id]: { ...pred, away: e.target.value } }))}
                    className="w-12 text-center border rounded-lg py-1 text-lg font-bold disabled:bg-gray-100"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">{match.away_team?.name}</span>
                    <span className="ml-2 text-lg">{match.away_team?.flag}</span>
                  </div>
                </div>
                {match.is_finished ? (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Resultado: {match.home_score} - {match.away_score}
                  </p>
                ) : savedIds.has(match.id) && (
                  <p className="text-center text-xs text-green-600 mt-2">
                    🔒 Pronóstico guardado — no se puede modificar
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar pronósticos'}
        </button>
      </main>
    </div>
  )
}
