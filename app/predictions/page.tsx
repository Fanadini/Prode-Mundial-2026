'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import { STAGES, formatMatchDate, formatMatchTime, formatCalendarDay, stageLabel, isEliminationStage } from '@/lib/stages'
import type { Match, Prediction, Team } from '@/lib/types'

type MatchWithTeams = Match & { home_team: Team; away_team: Team }
type DayGroup = { key: string; label: string; matches: MatchWithTeams[] }
type PredEntry = { home: string; away: string; advances?: string; points?: number | null }
type MatchPred = { display_name: string; home_score: number | null; away_score: number | null; advances_prediction: string | null; points: number | null }

export default function PredictionsPage() {
  const supabase = createClient()
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [predictions, setPredictions] = useState<Record<number, PredEntry>>({})
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [savingMatch, setSavingMatch] = useState<number | null>(null)
  const [savedMatch, setSavedMatch] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<Record<number, string>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [isScorer, setIsScorer] = useState(false)
  const [selectedStage, setSelectedStage] = useState('group')
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [viewMode, setViewMode] = useState<'groups' | 'calendar'>('groups')
  const [showPast, setShowPast] = useState(false)
  const [overriddenDays, setOverriddenDays] = useState<Set<string>>(new Set())
  const [viewingMatchId, setViewingMatchId] = useState<number | null>(null)
  const [viewingMatch, setViewingMatch] = useState<MatchWithTeams | null>(null)
  const [matchPreds, setMatchPreds] = useState<MatchPred[]>([])
  const [loadingMatchPreds, setLoadingMatchPreds] = useState(false)
  const router = useRouter()

  const refreshMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .order('match_date', { ascending: true, nullsFirst: false })
      .order('id')
    if (data) setMatches(data as MatchWithTeams[])
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin, is_scorer').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin ?? false)
        setIsScorer(profile?.is_scorer ?? false)
        await refreshMatches()
        const { data: predData } = await supabase.from('predictions').select('*').eq('user_id', session.user.id)
        const predMap: Record<number, PredEntry> = {}
        const locked = new Set<number>()
        for (const p of (predData as Prediction[]) ?? []) {
          predMap[p.match_id] = {
            home: String(p.home_score ?? ''),
            away: String(p.away_score ?? ''),
            advances: p.advances_prediction ?? '',
            points: p.points,
          }
          locked.add(p.match_id)
        }
        setPredictions(predMap)
        setSavedIds(locked)
      } catch { router.push('/login') }
    }
    load()
  }, [])

  // Re-fetch matches when tab gets focus so finished results appear automatically
  useEffect(() => {
    const handleFocus = () => { refreshMatches() }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshMatches])

  // Realtime: update match when admin saves a result
  useEffect(() => {
    const channel = supabase
      .channel('matches-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          setMatches(prev => prev.map(m =>
            m.id === (payload.new as Match).id ? { ...m, ...(payload.new as Match) } : m
          ))
          const matchId = (payload.new as Match).id
          supabase.from('predictions').select('*')
            .eq('user_id', userId ?? '')
            .eq('match_id', matchId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setPredictions(prev => ({
                ...prev,
                [matchId]: {
                  home: String(data.home_score ?? ''),
                  away: String(data.away_score ?? ''),
                  advances: data.advances_prediction ?? '',
                  points: data.points,
                }
              }))
            })
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Load all participants' predictions when viewing a finished match
  useEffect(() => {
    if (!viewingMatchId) return
    setLoadingMatchPreds(true)
    setMatchPreds([])
    setViewingMatch(matches.find(m => m.id === viewingMatchId) ?? null)
    ;(async () => {
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_id', viewingMatchId)
      const userIds = [...new Set((preds ?? []).map((p: any) => p.user_id as string))]
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, display_name').in('id', userIds)
        : { data: [] }
      const profileMap: Record<string, string> = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.id, p.display_name])
      )
      const enriched: MatchPred[] = (preds ?? []).map((p: any) => ({
        display_name: profileMap[p.user_id] ?? 'Usuario',
        home_score: p.home_score,
        away_score: p.away_score,
        advances_prediction: p.advances_prediction,
        points: p.points,
      })).sort((a: MatchPred, b: MatchPred) => {
        if (a.points === null && b.points !== null) return 1
        if (b.points === null && a.points !== null) return -1
        return (b.points ?? 0) - (a.points ?? 0)
      })
      setMatchPreds(enriched)
      setLoadingMatchPreds(false)
    })()
  }, [viewingMatchId])

  const groups = [...new Set(matches.filter(m => m.stage === 'group').map(m => m.home_team?.group_name).filter(Boolean))].sort()
  const stageMatches = matches.filter(m => m.stage === selectedStage)
  const groupFilteredMatches = selectedStage === 'group'
    ? stageMatches.filter(m => m.home_team?.group_name === selectedGroup)
    : stageMatches

  const isLocked = (match: MatchWithTeams) => {
    if (match.is_finished) return true
    if (!match.match_date) return false
    return Date.now() >= new Date(match.match_date).getTime() - 60 * 60 * 1000
  }

  const isLive = (match: MatchWithTeams) => {
    if (match.is_finished || !match.match_date) return false
    const kickoff = new Date(match.match_date).getTime()
    const now = Date.now()
    return kickoff <= now && now <= kickoff + 150 * 60 * 1000
  }

  // Build day groups for calendar view
  const dayGroups: DayGroup[] = []
  for (const match of matches) {
    const key = match.match_date ? new Date(match.match_date).toDateString() : 'nodate'
    const last = dayGroups[dayGroups.length - 1]
    if (last?.key === key) {
      last.matches.push(match)
    } else {
      dayGroups.push({ key, label: formatCalendarDay(match.match_date), matches: [match] })
    }
  }
  const pastDayGroups = dayGroups.filter(g => g.matches.every(m => m.is_finished))
  const futureDayGroups = dayGroups.filter(g => !g.matches.every(m => m.is_finished))
  const pastMatchCount = pastDayGroups.reduce((s, g) => s + g.matches.length, 0)

  const isDayExpanded = (key: string, isPast: boolean) =>
    overriddenDays.has(key) ? isPast : !isPast

  const toggleDay = (key: string) =>
    setOverriddenDays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const pastKeys = new Set(pastDayGroups.map(g => g.key))
  const visibleGroups = showPast ? dayGroups : futureDayGroups

  const setAllExpanded = (expand: boolean) =>
    setOverriddenDays(() => {
      const next = new Set<string>()
      for (const g of visibleGroups) {
        const isPast = pastKeys.has(g.key)
        if (expand === isPast) next.add(g.key)
      }
      return next
    })

  const allCollapsed = visibleGroups.length > 0 &&
    visibleGroups.every(g => !isDayExpanded(g.key, pastKeys.has(g.key)))

  const saveMatch = async (matchId: number) => {
    if (!userId) return
    const match = matches.find(m => m.id === matchId)
    if (!match) return
    const v = predictions[matchId]
    if (!v || v.home === '' || v.away === '') return
    const isElim = isEliminationStage(match.stage)
    const isDraw = v.home === v.away
    if (isElim && isDraw && (!v.advances || v.advances === '')) return

    setSavingMatch(matchId)
    setSaveError(e => ({ ...e, [matchId]: '' }))
    const { error } = await supabase.from('predictions').upsert({
      user_id: userId,
      match_id: matchId,
      home_score: Number(v.home),
      away_score: Number(v.away),
      advances_prediction: (isElim && isDraw) ? (v.advances || null) : null,
    }, { onConflict: 'user_id,match_id' })
    setSavingMatch(null)
    if (error) { setSaveError(e => ({ ...e, [matchId]: error.message })); return }
    setSavedIds(prev => new Set([...prev, matchId]))
    setSavedMatch(matchId)
    setTimeout(() => setSavedMatch(m => m === matchId ? null : m), 2000)
  }

  const renderCard = (match: MatchWithTeams, calendarView = false) => {
    const pred = predictions[match.id] ?? { home: '', away: '' }
    const locked = isLocked(match)
    const live = isLive(match)
    const isElim = isEliminationStage(match.stage)
    const timeLabel = calendarView ? formatMatchTime(match.match_date) : formatMatchDate(match.match_date)
    const hasPred = pred.home !== '' && pred.away !== ''

    // For elimination: draw prediction requires advances_prediction
    const isPredDraw = pred.home !== '' && pred.home === pred.away
    const isSaveDisabled = savingMatch === match.id ||
      pred.home === '' || pred.away === '' ||
      (isElim && isPredDraw && (!pred.advances || pred.advances === ''))

    return (
      <div key={match.id}
        className={`bg-pitch-800 rounded-2xl border transition-colors ${
          match.is_finished ? 'border-pitch-700' :
          live ? 'border-red-800/60' :
          locked ? 'border-pitch-700' : 'border-pitch-600'
        }`}>

        {/* Date / time */}
        {timeLabel && (
          <div className="px-4 pt-3 pb-0">
            <p className="text-xs text-zinc-600 text-center">{timeLabel}</p>
          </div>
        )}

        {/* Stage label in calendar view */}
        {calendarView && match.stage === 'group' && match.home_team?.group_name && (
          <p className="text-center text-xs text-zinc-700 pt-1">Grupo {match.home_team.group_name}</p>
        )}
        {calendarView && match.stage !== 'group' && (
          <p className="text-center text-xs text-zinc-700 pt-1">{stageLabel(match.stage)}</p>
        )}

        {/* Live badge */}
        {live && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-semibold tracking-wide">En vivo</span>
          </div>
        )}

        {/* Teams + scores row */}
        <div className="flex items-center gap-2 px-3 py-3">
          {/* Home team */}
          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
            <span className="text-xs font-medium text-white text-right leading-snug">{match.home_team?.name}</span>
            <span className="text-xl flex-none">{match.home_team?.flag}</span>
          </div>

          {/* Score display */}
          <div className="flex items-center gap-1 flex-none">
            {match.is_finished ? (
              <>
                <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-pitch-900 border border-gold-600/50 text-gold-400 font-bold text-lg">
                  {match.home_score}
                </div>
                <span className="text-zinc-600 font-bold text-sm">:</span>
                <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-pitch-900 border border-gold-600/50 text-gold-400 font-bold text-lg">
                  {match.away_score}
                </div>
              </>
            ) : (
              <>
                <input type="number" min="0" max="20" value={pred.home} disabled={locked}
                  onChange={e => setPredictions(p => ({
                    ...p,
                    [match.id]: { ...pred, home: e.target.value, advances: e.target.value !== pred.away ? '' : pred.advances }
                  }))}
                  className={`w-11 h-11 text-center text-lg font-bold rounded-xl border transition-colors ${
                    locked
                      ? 'bg-pitch-900 border-pitch-600 text-zinc-500'
                      : 'bg-pitch-900 border-gold-600 text-white focus:border-gold-400 focus:outline-none'
                  }`}
                />
                <span className="text-zinc-700 font-bold text-sm">:</span>
                <input type="number" min="0" max="20" value={pred.away} disabled={locked}
                  onChange={e => setPredictions(p => ({
                    ...p,
                    [match.id]: { ...pred, away: e.target.value, advances: pred.home !== e.target.value ? '' : pred.advances }
                  }))}
                  className={`w-11 h-11 text-center text-lg font-bold rounded-xl border transition-colors ${
                    locked
                      ? 'bg-pitch-900 border-pitch-600 text-zinc-500'
                      : 'bg-pitch-900 border-gold-600 text-white focus:border-gold-400 focus:outline-none'
                  }`}
                />
              </>
            )}
          </div>

          {/* Away team */}
          <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
            <span className="text-xl flex-none">{match.away_team?.flag}</span>
            <span className="text-xs font-medium text-white leading-snug">{match.away_team?.name}</span>
          </div>
        </div>

        {/* Penalties selector — elimination + draw predicted + not finished + not locked */}
        {isElim && !match.is_finished && !locked && isPredDraw && (
          <div className="px-3 pb-2">
            <p className="text-xs text-zinc-500 text-center mb-1.5">¿Quién gana los penales?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPredictions(p => ({ ...p, [match.id]: { ...pred, advances: 'home' } }))}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors truncate ${
                  pred.advances === 'home'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-pitch-900 border-pitch-600 text-zinc-400 hover:border-gold-500 hover:text-white'
                }`}
              >
                {match.home_team?.flag} {match.home_team?.name}
              </button>
              <button
                onClick={() => setPredictions(p => ({ ...p, [match.id]: { ...pred, advances: 'away' } }))}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors truncate ${
                  pred.advances === 'away'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-pitch-900 border-pitch-600 text-zinc-400 hover:border-gold-500 hover:text-white'
                }`}
              >
                {match.away_team?.flag} {match.away_team?.name}
              </button>
            </div>
          </div>
        )}


        {/* Who advanced — show on finished elimination draws */}
        {isElim && match.is_finished && match.winner && match.home_score === match.away_score && (
          <p className="text-center text-xs text-zinc-500 -mt-1 pb-1">
            Penales: avanza {match.winner === 'home'
              ? `${match.home_team?.flag} ${match.home_team?.name}`
              : `${match.away_team?.flag} ${match.away_team?.name}`}
          </p>
        )}

        {/* Bottom status row */}
        {match.is_finished ? (
          <div className="px-3 pb-3 space-y-2">
            {hasPred ? (
              <p className="text-center text-xs">
                <span className="text-zinc-600">
                  Tu pronóstico: {pred.home} - {pred.away}
                  {isElim && pred.home === pred.away && pred.advances && (
                    <> · {pred.advances === 'home' ? match.home_team?.name : match.away_team?.name} por penales</>
                  )}
                </span>
                {pred.points != null && (
                  <span className={` · font-semibold ${
                    pred.points >= 3 ? 'text-gold-400' :
                    pred.points > 0 ? 'text-emerald-500' : 'text-zinc-600'
                  }`}> {pred.points} {pred.points === 1 ? 'pt' : 'pts'}</span>
                )}
              </p>
            ) : (
              <p className="text-center text-xs text-zinc-700">Sin pronóstico</p>
            )}
            <button
              onClick={() => setViewingMatchId(match.id)}
              className="w-full py-1.5 rounded-xl text-xs font-medium bg-pitch-900 border border-pitch-700 text-zinc-500 hover:text-zinc-300 hover:border-pitch-600 transition-colors">
              Ver pronósticos de todos
            </button>
          </div>
        ) : live ? (
          <div className="px-3 pb-3 text-center space-y-1">
            {hasPred && (
              <p className="text-xs text-zinc-500">
                Tu pronóstico: {pred.home} - {pred.away}
                {isElim && pred.home === pred.away && pred.advances && (
                  <> · {pred.advances === 'home' ? `${match.home_team?.flag} ${match.home_team?.name}` : `${match.away_team?.flag} ${match.away_team?.name}`} por penales</>
                )}
              </p>
            )}
            <p className="text-xs text-zinc-600">El resultado aparece cuando termine</p>
          </div>
        ) : locked ? (
          <div className="px-3 pb-3 text-center space-y-1">
            {hasPred && (
              <p className="text-xs text-zinc-500">
                Tu pronóstico: {pred.home} - {pred.away}
                {isElim && pred.home === pred.away && pred.advances && (
                  <> · {pred.advances === 'home'
                    ? `${match.home_team?.flag} ${match.home_team?.name}`
                    : `${match.away_team?.flag} ${match.away_team?.name}`} por penales</>
                )}
              </p>
            )}
            <p className="text-xs text-zinc-600">🔒 Cerrado — menos de 1h para el partido</p>
          </div>
        ) : (
          <div className="px-3 pb-3">
            {saveError[match.id] && (
              <p className="text-xs text-red-400 text-center mb-1">{saveError[match.id]}</p>
            )}
            <button
              onClick={() => saveMatch(match.id)}
              disabled={isSaveDisabled}
              className={`w-full py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
                savedMatch === match.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gold-500 hover:bg-gold-400 text-black'
              }`}>
              {savingMatch === match.id ? 'Guardando...' : savedMatch === match.id ? '✓ Guardado' : 'Guardar'}
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderDayGroup = (group: DayGroup, isPast: boolean) => {
    const expanded = isDayExpanded(group.key, isPast)
    return (
      <div key={group.key}>
        <button
          onClick={() => toggleDay(group.key)}
          className="flex items-center justify-between w-full py-2.5 text-left"
        >
          <span className={`text-xs font-semibold uppercase tracking-widest capitalize ${isPast ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {group.label}
          </span>
          <span className={`text-xs flex items-center gap-1.5 ${isPast ? 'text-zinc-700' : 'text-zinc-500'}`}>
            {!expanded && <span>{group.matches.length} partidos</span>}
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {expanded && (
          <div className="space-y-3 pb-2">
            {group.matches.map(m => renderCard(m, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={isAdmin} isScorer={isScorer} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-white">Pronósticos</h1>
          <div className="flex bg-pitch-800 rounded-full p-0.5 border border-pitch-700">
            <button
              onClick={() => setViewMode('groups')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'groups' ? 'bg-gold-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}>
              Grupos
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'calendar' ? 'bg-gold-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}>
              Calendario
            </button>
          </div>
        </div>

        {/* Groups view */}
        {viewMode === 'groups' && (
          <>
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

            {groupFilteredMatches.length === 0 && selectedStage !== 'group' && (
              <div className="bg-pitch-800 rounded-2xl p-8 border border-pitch-700 text-center text-sm text-zinc-600">
                Los cruces se cargan cuando se definan los clasificados.
              </div>
            )}

            <div className="space-y-3">
              {groupFilteredMatches.map(m => renderCard(m, false))}
            </div>
          </>
        )}

        {/* Calendar view */}
        {viewMode === 'calendar' && (
          <div>
            {pastMatchCount > 0 && (
              showPast ? (
                <div className="mb-1">
                  {pastDayGroups.map(g => renderDayGroup(g, true))}
                  <button
                    onClick={() => setShowPast(false)}
                    className="w-full text-xs text-zinc-700 hover:text-zinc-500 py-2 transition-colors text-center">
                    Ocultar anteriores ↑
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPast(true)}
                  className="w-full mb-4 flex items-center justify-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 border border-dashed border-pitch-700 hover:border-pitch-600 rounded-xl py-3 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pastMatchCount} partidos anteriores
                </button>
              )
            )}

            {visibleGroups.length > 0 && (
              <div className="flex justify-end gap-4 mb-1">
                <button
                  onClick={() => setAllExpanded(allCollapsed)}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                  {allCollapsed ? 'Mostrar todo' : 'Ocultar todo'}
                </button>
              </div>
            )}

            {futureDayGroups.map(g => renderDayGroup(g, false))}

            {futureDayGroups.length === 0 && (
              <p className="text-center text-zinc-600 text-sm py-8">El torneo ha finalizado.</p>
            )}
          </div>
        )}
      </main>

      {/* Modal: ver pronósticos de todos para un partido terminado */}
      {viewingMatchId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setViewingMatchId(null)}>
          <div
            className="bg-pitch-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md border border-pitch-700 overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Modal header with match info */}
            {viewingMatch && (
              <div className="px-5 pt-5 pb-3 border-b border-pitch-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm">Pronósticos</h3>
                  <button onClick={() => setViewingMatchId(null)} className="text-zinc-500 hover:text-white text-lg leading-none">✕</button>
                </div>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="text-white font-medium">{viewingMatch.home_team?.flag} {viewingMatch.home_team?.name}</span>
                  <span className="text-gold-400 font-bold">
                    {viewingMatch.home_score} - {viewingMatch.away_score}
                  </span>
                  <span className="text-white font-medium">{viewingMatch.away_team?.name} {viewingMatch.away_team?.flag}</span>
                </div>
                {isEliminationStage(viewingMatch.stage) && viewingMatch.winner && viewingMatch.home_score === viewingMatch.away_score && (
                  <p className="text-center text-xs text-zinc-500 mt-1">
                    Penales: avanza {viewingMatch.winner === 'home'
                      ? `${viewingMatch.home_team?.flag} ${viewingMatch.home_team?.name}`
                      : `${viewingMatch.away_team?.flag} ${viewingMatch.away_team?.name}`}
                  </p>
                )}
              </div>
            )}

            {/* Predictions list */}
            <div className="overflow-y-auto max-h-[60vh] px-4 py-3 space-y-2">
              {loadingMatchPreds ? (
                <p className="text-center text-zinc-600 text-sm py-6">Cargando...</p>
              ) : matchPreds.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm py-6">Nadie pronosticó este partido.</p>
              ) : (
                matchPreds.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-pitch-900 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-white truncate flex-1 mr-3">{p.display_name}</span>
                    <div className="flex items-center gap-3 flex-none">
                      <span className="text-sm font-bold text-zinc-300">
                        {p.home_score} - {p.away_score}
                        {viewingMatch && isEliminationStage(viewingMatch.stage) && p.home_score === p.away_score && p.advances_prediction && (
                          <span className="text-zinc-500 font-normal text-xs">
                            {' '}·{' '}
                            {p.advances_prediction === 'home' ? viewingMatch.home_team?.name : viewingMatch.away_team?.name}
                          </span>
                        )}
                      </span>
                      {p.points != null ? (
                        <span className={`text-xs font-semibold w-10 text-right ${
                          p.points >= 3 ? 'text-gold-400' :
                          p.points > 0 ? 'text-emerald-500' : 'text-zinc-600'
                        }`}>
                          {p.points} {p.points === 1 ? 'pt' : 'pts'}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-700 w-10 text-right">—</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 pb-5 pt-2">
              <button
                onClick={() => setViewingMatchId(null)}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-pitch-900 border border-pitch-700 text-zinc-400 hover:text-white transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
