'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import type { LeaderboardEntry } from '@/lib/types'
import { getPushState, subscribeToPush } from '@/lib/push'

const MEDALS = ['🥇', '🥈', '🥉']

type PredDetail = {
  home_score: number
  away_score: number
  points: number
  match: {
    home_score: number
    away_score: number
    match_date: string | null
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
  const [pushState, setPushState] = useState<'unsupported' | 'denied' | 'granted' | 'default' | null>(null)
  const [enablingPush, setEnablingPush] = useState(false)

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
        getPushState().then(setPushState)
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
          home_score, away_score, match_date,
          home_team:teams!matches_home_team_id_fkey(name, flag),
          away_team:teams!matches_away_team_id_fkey(name, flag)
        )
      `)
      .eq('user_id', targetUserId)
      .gt('points', 0)
    const sorted = [...(data ?? [])].sort((a: any, b: any) =>
      new Date(b.match?.match_date ?? 0).getTime() - new Date(a.match?.match_date ?? 0).getTime()
    )
    setUserDetails(prev => ({ ...prev, [targetUserId]: sorted as unknown as PredDetail[] }))
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

  const enablePush = async () => {
    if (!userId) return
    setEnablingPush(true)
    const ok = await subscribeToPush(supabase, userId)
    setPushState(ok ? 'granted' : Notification.permission as 'denied' | 'default')
    setEnablingPush(false)
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
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Tabla de posiciones</h1>
            <p className="text-zinc-500 text-sm mt-1">Mundial 2026 — USA / México / Canadá</p>
          </div>
          {pushState && pushState !== 'unsupported' && (
            <button
              onClick={pushState === 'default' ? enablePush : undefined}
              disabled={enablingPush || pushState === 'denied'}
              title={
                pushState === 'granted' ? 'Notificaciones activadas' :
                pushState === 'denied' ? 'Notificaciones bloqueadas en tu navegador' :
                'Activar notificaciones'
              }
              className={`flex-none mt-1 p-2 rounded-xl border transition-colors ${
                pushState === 'granted'
                  ? 'border-emerald-800/50 text-emerald-400 bg-emerald-900/20'
                  : pushState === 'denied'
                  ? 'border-pitch-700 text-zinc-600 cursor-not-allowed'
                  : 'border-pitch-700 text-zinc-400 hover:border-gold-600 hover:text-gold-400'
              }`}
            >
              {pushState === 'granted' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
              ) : pushState === 'denied' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 18.69L7.84 6.14 5.27 3.49 4 4.76l2.8 2.8v.01c-.52.99-.8 2.16-.8 3.42V16l-2 2v1h14.73l2 2L22 19.72l-2-1.03zm-8 3.31c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-7.44V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68c-.15.03-.29.08-.43.12L18 10.56v4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
            </button>
          )}
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
                            {/* Match date */}
                            <div className="flex-1 min-w-0">
                              <span className="text-xs text-zinc-600">
                                {d.match.match_date
                                  ? new Date(d.match.match_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })
                                  : ''}
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
            <span>Eliminatorias</span><span className="text-zinc-400">2 pt ganador / 5 pt exacto</span>
            <span>Final</span><span className="text-zinc-400">2 pt ganador / 5 pt exacto</span>
            <span>Campeón</span><span className="text-zinc-400">10 pt</span>
            <span>Goleador</span><span className="text-zinc-400">5 pt</span>
          </div>
        </div>
      </main>
    </div>
  )
}
