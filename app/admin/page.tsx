'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import { STAGES, stageLabel, formatMatchDate } from '@/lib/stages'
import type { Match, Team } from '@/lib/types'

type MatchWithTeams = Match & { home_team: Team; away_team: Team }

const MATCH_SELECT = '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Record<number, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  // Formulario de nuevo cruce de eliminatorias
  const [newStage, setNewStage] = useState('round_of_32')
  const [newHome, setNewHome] = useState('')
  const [newAway, setNewAway] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        if (!profile?.is_admin) { router.push('/'); return }
        const { data: teamsData } = await supabase.from('teams').select('*').order('name')
        setTeams((teamsData as Team[]) ?? [])
        const { data } = await supabase
          .from('matches')
          .select(MATCH_SELECT)
          .order('match_date', { ascending: true, nullsFirst: false })
          .order('id')
        setMatches((data as MatchWithTeams[]) ?? [])
        const map: Record<number, { home: string; away: string }> = {}
        for (const m of (data as MatchWithTeams[]) ?? []) {
          map[m.id] = {
            home: m.home_score !== null ? String(m.home_score) : '',
            away: m.away_score !== null ? String(m.away_score) : '',
          }
        }
        setResults(map)
      } catch {
        router.push('/login')
      }
    }
    load()
  }, [])

  const createMatch = async () => {
    if (!newHome || !newAway || newHome === newAway) {
      setCreateError('Elegí dos equipos distintos.')
      return
    }
    setCreating(true)
    setCreateError('')
    const { data, error } = await supabase.from('matches').insert({
      home_team_id: Number(newHome),
      away_team_id: Number(newAway),
      stage: newStage,
      match_date: newDate ? new Date(newDate).toISOString() : null,
    }).select(MATCH_SELECT).single()
    setCreating(false)
    if (error) { setCreateError(error.message); return }
    setMatches(ms => [...ms, data as MatchWithTeams])
    setResults(rs => ({ ...rs, [(data as MatchWithTeams).id]: { home: '', away: '' } }))
    setNewHome(''); setNewAway(''); setNewDate('')
  }

  const saveResult = async (matchId: number) => {
    const r = results[matchId]
    if (r.home === '' || r.away === '') return
    setSaving(matchId)

    const home_score = Number(r.home)
    const away_score = Number(r.away)

    await supabase.from('matches').update({
      home_score, away_score, is_finished: true
    }).eq('id', matchId)

    // Recalcular puntos para todas las predicciones de este partido
    const { data: preds } = await supabase
      .from('predictions').select('*').eq('match_id', matchId)

    const match = matches.find(m => m.id === matchId)!

    for (const pred of preds ?? []) {
      const exactScore = pred.home_score === home_score && pred.away_score === away_score
      const getResult = (h: number, a: number) => h > a ? 'home' : a > h ? 'away' : 'draw'
      const correctResult = getResult(pred.home_score, pred.away_score) === getResult(home_score, away_score)
      const stagePoints: Record<string, [number, number]> = {
        group: [1, 3], round_of_32: [2, 5], round_of_16: [2, 5],
        quarter: [3, 6], semi: [3, 6], final: [4, 8],
      }
      const [correct, exact] = stagePoints[match.stage] ?? [1, 3]
      const points = exactScore ? exact : correctResult ? correct : 0
      await supabase.from('predictions').update({ points }).eq('id', pred.id)
    }

    setSaving(null)
    setMatches(ms => ms.map(m => m.id === matchId
      ? { ...m, home_score, away_score, is_finished: true } : m))
  }

  const stages = STAGES.map(s => s.key).filter(key => matches.some(m => m.stage === key))

  return (
    <div>
      <Nav isAdmin={true} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Panel Admin — Cargar resultados</h1>
        <p className="text-sm text-gray-500 mb-6">Al guardar, los puntos se recalculan para todos.</p>

        <div className="bg-white rounded-xl p-4 shadow-sm mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">➕ Agregar cruce de eliminatorias</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select value={newStage} onChange={e => setNewStage(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm col-span-2">
              {STAGES.filter(s => s.key !== 'group').map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <select value={newHome} onChange={e => setNewHome(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">Local…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
            </select>
            <select value={newAway} onChange={e => setNewAway(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm">
              <option value="">Visitante…</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
            </select>
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm col-span-2" />
          </div>
          {createError && <p className="text-red-500 text-xs mb-2">{createError}</p>}
          <button onClick={createMatch} disabled={creating}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {creating ? 'Creando...' : 'Crear partido'}
          </button>
        </div>

        {stages.map(stage => (
          <div key={stage} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              {stage === 'group' ? 'Fase de grupos' : stageLabel(stage)}
            </h2>
            <div className="space-y-3">
              {matches.filter(m => m.stage === stage).map(match => {
                const r = results[match.id] ?? { home: '', away: '' }
                const dateLabel = formatMatchDate(match.match_date)
                return (
                  <div key={match.id} className="bg-white rounded-xl p-4 shadow-sm">
                    {dateLabel && (
                      <p className="text-center text-xs text-gray-400 mb-2">📅 {dateLabel}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right text-sm font-medium">
                        {match.home_team?.flag} {match.home_team?.name}
                      </div>
                      <input
                        type="number" min="0" max="20"
                        value={r.home}
                        onChange={e => setResults(rs => ({ ...rs, [match.id]: { ...r, home: e.target.value } }))}
                        className="w-12 text-center border rounded-lg py-1 font-bold"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number" min="0" max="20"
                        value={r.away}
                        onChange={e => setResults(rs => ({ ...rs, [match.id]: { ...r, away: e.target.value } }))}
                        className="w-12 text-center border rounded-lg py-1 font-bold"
                      />
                      <div className="flex-1 text-sm font-medium">
                        {match.away_team?.name} {match.away_team?.flag}
                      </div>
                      <button
                        onClick={() => saveResult(match.id)}
                        disabled={saving === match.id}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          match.is_finished
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {saving === match.id ? '...' : match.is_finished ? '✓ Guardado' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
