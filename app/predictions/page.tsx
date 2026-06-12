'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import { STAGES, formatMatchDate } from '@/lib/stages'
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
  const [selectedStage, setSelectedStage] = useState('group')
  const [selectedGroup, setSelectedGroup] = useState('A')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin ?? false)
        const { data: matchData } = await supabase
          .from('matches')
          .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
          .order('match_date', { ascending: true, nullsFirst: false })
          .order('id')
        setMatches((matchData as MatchWithTeams[]) ?? [])
        const { data: predData } = await supabase.from('predictions').select('*').eq('user_id', session.user.id)
        const predMap: Record<number, { home: string; away: string }> = {}
        const locked = new Set<number>()
        for (const p of (predData as Prediction[]) ?? []) {
          predMap[p.match_id] = { home: String(p.home_score), away: String(p.away_score) }
          locked.add(p.match_id)
        }
        setPredictions(predMap)
        setSavedIds(locked)
      } catch { router.push('/login') }
    }
    load()
  }, [])

  const groups = [...new Set(matches.filter(m => m.stage === 'group').map(m => m.home_team?.group_name).filter(Boolean))].sort()
  const stageMatches = matches.filter(m => m.stage === selectedStage)
  const filteredMatches = selectedStage === 'group'
    ? stageMatches.filter(m => m.home_team?.group_name === selectedGroup)
    : stageMatches

  const isLocked = (match: MatchWithTeams) => {
    if (match.is_finished) return true
    if (!match.match_date) return false
    return Date.now() >= new Date(match.match_date).getTime() - 60 * 60 * 1000
  }

  const save = async () => {
    if (!userId) return
    setSaving(true)
    const rows = Object.entries(predictions)
      .filter(([matchId, v]) => {
        if (v.home === '' || v.away === '') return false
        const match = matches.find(m => m.id === Number(matchId))
        return match && !isLocked(match)
      })
      .map(([matchId, v]) => ({
        user_id: userId,
        match_id: Number(matchId),
        home_score: Number(v.home),
        away_score: Number(v.away),
      }))
    if (rows.length > 0) {
      const { error } = await supabase.from('predictions')
        .upsert(rows, { onConflict: 'user_id,match_id' })
      if (!error) setSavedIds(prev => new Set([...prev, ...rows.map(r => r.match_id)]))
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={isAdmin} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-5">Pronósticos</h1>

        {/* Stage tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide w-full">
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setSelectedStage(s.key)}
              className={`flex-none px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                selectedStage === s.key
                  ? 'bg-gold-500 text-black'
                  : 'bg-pitch-800 text-zinc-400 hover:text-white border border-pitch-600'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Group tabs */}
        {selectedStage === 'group' && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide w-full">
            {groups.map(g => (
              <button key={g} onClick={() => setSelectedGroup(g!)}
                className={`flex-none px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedGroup === g
                    ? 'bg-white text-black'
                    : 'bg-pitch-800 text-zinc-500 hover:text-white border border-pitch-600'
                }`}>
                Grp {g}
              </button>
            ))}
          </div>
        )}

        {filteredMatches.length === 0 && selectedStage !== 'group' && (
          <div className="bg-pitch-800 rounded-2xl p-8 border border-pitch-700 text-center text-sm text-zinc-600">
            Los cruces se cargan cuando se definan los clasificados.
          </div>
        )}

        <div className="space-y-3">
          {filteredMatches.map(match => {
            const pred = predictions[match.id] ?? { home: '', away: '' }
            const locked = isLocked(match)
            const dateLabel = formatMatchDate(match.match_date)
            return (
              <div key={match.id}
                className={`bg-pitch-800 rounded-2xl border transition-colors ${
                  locked ? 'border-pitch-700' : 'border-pitch-600'
                }`}>
                {dateLabel && (
                  <div className="px-4 pt-3 pb-0">
                    <p className="text-xs text-zinc-600 text-center">{dateLabel}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-3">
                  {/* Home team */}
                  <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                    <span className="text-xs font-medium text-white text-right leading-snug">{match.home_team?.name}</span>
                    <span className="text-xl flex-none">{match.home_team?.flag}</span>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-1 flex-none">
                    <input type="number" min="0" max="20" value={pred.home} disabled={locked}
                      onChange={e => setPredictions(p => ({ ...p, [match.id]: { ...pred, home: e.target.value } }))}
                      className={`w-11 h-11 text-center text-lg font-bold rounded-xl border transition-colors ${
                        locked
                          ? 'bg-pitch-900 border-pitch-600 text-zinc-500'
                          : 'bg-pitch-900 border-gold-600 text-white focus:border-gold-400 focus:outline-none'
                      }`}
                    />
                    <span className="text-zinc-700 font-bold text-sm">:</span>
                    <input type="number" min="0" max="20" value={pred.away} disabled={locked}
                      onChange={e => setPredictions(p => ({ ...p, [match.id]: { ...pred, away: e.target.value } }))}
                      className={`w-11 h-11 text-center text-lg font-bold rounded-xl border transition-colors ${
                        locked
                          ? 'bg-pitch-900 border-pitch-600 text-zinc-500'
                          : 'bg-pitch-900 border-gold-600 text-white focus:border-gold-400 focus:outline-none'
                      }`}
                    />
                  </div>

                  {/* Away team */}
                  <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
                    <span className="text-xl flex-none">{match.away_team?.flag}</span>
                    <span className="text-xs font-medium text-white leading-snug">{match.away_team?.name}</span>
                  </div>
                </div>

                {match.is_finished ? (
                  <p className="text-center text-xs text-gold-500 pb-3 font-medium">
                    Final: {match.home_score} - {match.away_score}
                  </p>
                ) : locked ? (
                  <p className="text-center text-xs text-zinc-600 pb-3">
                    🔒 Cerrado — menos de 1h para el partido
                  </p>
                ) : savedIds.has(match.id) ? (
                  <p className="text-center text-xs text-emerald-600 pb-3">
                    ✏️ Podés modificar hasta 1h antes
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        {filteredMatches.length > 0 && (
          <button onClick={save} disabled={saving}
            className="mt-5 w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-3.5 rounded-2xl transition-colors disabled:opacity-50">
            {saved ? '✓ Guardado!' : saving ? 'Guardando...' : 'Guardar pronósticos'}
          </button>
        )}
      </main>
    </div>
  )
}
