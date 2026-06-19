'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import type { LeaderboardEntry } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

type PredDetail = {
  home_score: number
  away_score: number
  points: number
  match: {
    home_score: number
    away_score: number
    home_team: { name: string; flag: string }
    away_team: { name: string; flag: string }
  }
}

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isScorer, setIsScorer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<Record<string, PredDetail[]>>({})
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin, is_scorer').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin ?? false)
        setIsScorer(profile?.is_scorer ?? false)
        const { data } = await supabase.from('leaderboard').select('*')
        setLeaderboard((data as LeaderboardEntry[]) ?? [])
        setLoading(false)
      } catch {
        router.push('/login')
      }
    }
    load()
  }, [])

  const loadUserDetail = async (targetUserId: string) => {
    if (userDetails[targetUserId] !== undefined) return
    setLoadingDetail(true)
    const { data } = await supabase
      .from('predictions')
      .select(`
        home_score, away_score, points,
        match:matches(
          home_score, away_score,
          home_team:teams!matches_home_team_id_fkey(name, flag),
          away_team:teams!matches_away_team_id_fkey(name, flag)
        )
      `)
      .eq('user_id', targetUserId)
      .gt('points', 0)
      .order('points', { ascending: false })
    setUserDetails(prev => ({ ...prev, [targetUserId]: (data ?? []) as unknown as PredDetail[] }))
    setLoadingDetail(false)
  }

  const toggleUser = (targetUserId: string) => {
    if (expandedUserId === targetUserId) {
      setExpandedUserId(null)
    } else {
      setExpandedUserId(targetUserId)
      loadUserDetail(targetUserId)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-pitch-950">
      <div className="text-center">
        <img src="/Prode-Mundial-2026/wc26-logo.jpg" alt="FIFA World Cup 2026" className="w-14 h-14 rounded-xl object-cover mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Cargando...</p>
      </div>
    </div>
  )

  return (
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={isAdmin} isScorer={isScorer} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Tabla de posiciones</h1>
          <p className="text-zinc-500 text-sm mt-1">Mundial 2026 — USA / México / Canadá</p>
        </div>

        <div className="bg-pitch-800 rounded-2xl border border-pitch-700 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-3 border-b border-pitch-700">
            <span className="col-span-1 text-zinc-600 text-xs font-medium">#</span>
            <span className="col-span-8 text-zinc-600 text-xs font-medium uppercase tracking-wide">Jugador</span>
            <span className="col-span-3 text-right text-zinc-600 text-xs font-medium uppercase tracking-wide">Pts</span>
          </div>

          {leaderboard.map((entry, i) => {
            const isMe = entry.id === userId
            const isExpanded = expandedUserId === entry.id
            const details = userDetails[entry.id]

            return (
              <div key={entry.id} className={`border-b border-pitch-700 last:border-0 ${isMe ? 'bg-pitch-700/60' : ''}`}>
                {/* Main row — clickable */}
                <button
                  onClick={() => toggleUser(entry.id)}
                  className={`grid grid-cols-12 items-center px-4 py-4 w-full text-left transition-colors ${
                    isMe ? 'hover:bg-pitch-600/30' : 'hover:bg-pitch-700/50'
                  }`}
                >
                  <div className="col-span-1">
                    {i < 3
                      ? <span className="text-base">{MEDALS[i]}</span>
                      : <span className="text-zinc-600 text-sm font-mono">{i + 1}</span>
                    }
                  </div>
                  <div className="col-span-8">
                    <p className={`font-semibold text-sm ${isMe ? 'text-gold-400' : 'text-white'}`}>
                      {entry.display_name} {isMe && <span className="text-xs text-zinc-500">(vos)</span>}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">{entry.exact_scores} exactos</p>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <div className="text-right">
                      <span className={`text-base font-bold ${i === 0 ? 'text-gold-400' : 'text-white'}`}>
                        {entry.total_points}
                      </span>
                      <span className="text-zinc-600 text-xs ml-0.5">pts</span>
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 text-zinc-600 flex-none transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {loadingDetail && !details ? (
                      <p className="text-xs text-zinc-600 text-center py-3">Cargando...</p>
                    ) : !details || details.length === 0 ? (
                      <p className="text-xs text-zinc-600 text-center py-3">Sin puntos por ahora.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {details.map((d, j) => (
                          <div key={j} className="flex items-center bg-pitch-900 rounded-xl px-3 py-2.5 gap-3">
                            {/* Match result */}
                            <div className="flex items-center gap-1 flex-none text-sm">
                              <span>{d.match.home_team.flag}</span>
                              <span className="text-gold-400 font-bold tabular-nums">
                                {d.match.home_score}-{d.match.away_score}
                              </span>
                              <span>{d.match.away_team.flag}</span>
                            </div>
                            {/* Prediction */}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-zinc-600">
                                pronó {d.home_score}-{d.away_score}
                              </span>
                            </div>
                            {/* Points */}
                            <span className={`text-xs font-bold flex-none ${
                              d.points >= 5 ? 'text-gold-400' :
                              d.points >= 3 ? 'text-gold-500' :
                              'text-emerald-500'
                            }`}>
                              +{d.points} {d.points === 1 ? 'pt' : 'pts'}
                            </span>
                          </div>
                        ))}
                        <p className="text-xs text-zinc-700 text-right pt-1">
                          {details.length} {details.length === 1 ? 'acierto' : 'aciertos'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {leaderboard.length === 0 && (
            <p className="text-center text-zinc-600 py-10 text-sm">
              Nadie cargó pronósticos todavía.
            </p>
          )}
        </div>

        {/* Prize */}
        <div className="mt-6 bg-pitch-800 rounded-2xl border border-gold-600/40 p-4">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-wide mb-1">🥩 Premio</p>
          <p className="text-sm text-white font-medium">Un asado para el ganador</p>
          <p className="text-xs text-zinc-500 mt-1">Invitado por el resto de los jugadores</p>
        </div>

        {/* Point system */}
        <div className="mt-4 bg-pitch-800 rounded-2xl border border-pitch-700 p-4">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-wide mb-3">Sistema de puntos</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-500">
            <span>Fase de grupos</span><span className="text-zinc-400">1 pt ganador / 3 pt exacto</span>
            <span>Eliminatorias</span><span className="text-zinc-400">2 pt / 5 pt exacto</span>
            <span>Final</span><span className="text-zinc-400">4 pt / 8 pt exacto</span>
            <span>Campeón</span><span className="text-zinc-400">10 pt</span>
            <span>Goleador</span><span className="text-zinc-400">5 pt</span>
          </div>
        </div>
      </main>
    </div>
  )
}
