'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import { STAGES, stageLabel, formatMatchDate, isEliminationStage } from '@/lib/stages'
import type { Match, Team, Profile } from '@/lib/types'

type MatchWithTeams = Match & { home_team: Team; away_team: Team }
const MATCH_SELECT = '*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)'

export default function AdminPage() {
  const supabase = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'results' | 'users'>('results')

  // Results state
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<Record<number, { home: string; away: string; winner: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [showFinishedStages, setShowFinishedStages] = useState<Set<string>>(new Set())
  const [newStage, setNewStage] = useState('round_of_32')
  const [newHome, setNewHome] = useState('')
  const [newAway, setNewAway] = useState('')
  const [newDate, setNewDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // Users state
  const [users, setUsers] = useState<Profile[]>([])
  const [predCount, setPredCount] = useState<Record<string, number>>({})
  const [editName, setEditName] = useState<Record<string, string>>({})
  const [savingUser, setSavingUser] = useState<string | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setMyId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin, is_scorer').eq('id', session.user.id).single()
        if (!profile?.is_admin && !profile?.is_scorer) { router.push('/'); return }
        setIsAdmin(profile?.is_admin ?? false)

        const [{ data: teamsData }, { data: matchData }, { data: usersData }, { data: predsData }] = await Promise.all([
          supabase.from('teams').select('*').order('name'),
          supabase.from('matches').select(MATCH_SELECT)
            .order('match_date', { ascending: true, nullsFirst: false }).order('id'),
          supabase.from('profiles').select('*').order('display_name'),
          supabase.from('predictions').select('user_id'),
        ])

        setTeams((teamsData as Team[]) ?? [])
        setMatches((matchData as MatchWithTeams[]) ?? [])
        setUsers((usersData as Profile[]) ?? [])

        const counts: Record<string, number> = {}
        for (const p of (predsData ?? []) as { user_id: string }[]) {
          counts[p.user_id] = (counts[p.user_id] ?? 0) + 1
        }
        setPredCount(counts)

        const map: Record<number, { home: string; away: string; winner: string }> = {}
        for (const m of (matchData as MatchWithTeams[]) ?? []) {
          map[m.id] = {
            home: m.home_score !== null ? String(m.home_score) : '',
            away: m.away_score !== null ? String(m.away_score) : '',
            winner: m.winner ?? '',
          }
        }
        setResults(map)

        const nameMap: Record<string, string> = {}
        for (const u of (usersData as Profile[]) ?? []) nameMap[u.id] = u.display_name
        setEditName(nameMap)
      } catch { router.push('/login') }
    }
    load()
  }, [])

  // ── Results ───────────────────────────────────────────
  const createMatch = async () => {
    if (!newHome || !newAway || newHome === newAway) { setCreateError('Elegí dos equipos distintos.'); return }
    setCreating(true); setCreateError('')
    const { data, error } = await supabase.from('matches').insert({
      home_team_id: Number(newHome), away_team_id: Number(newAway),
      stage: newStage, match_date: newDate ? new Date(newDate).toISOString() : null,
    }).select(MATCH_SELECT).single()
    setCreating(false)
    if (error) { setCreateError(error.message); return }
    setMatches(ms => [...ms, data as MatchWithTeams])
    setResults(rs => ({ ...rs, [(data as MatchWithTeams).id]: { home: '', away: '', winner: '' } }))
    setNewHome(''); setNewAway(''); setNewDate('')
  }

  const saveResult = async (matchId: number) => {
    const match = matches.find(m => m.id === matchId)!
    if (isResultLocked(match)) return
    const r = results[matchId]
    if (r.home === '' || r.away === '') return
    const isElim = isEliminationStage(match.stage)
    if (isElim && !r.winner) return

    setSaving(matchId)
    const home_score = Number(r.home), away_score = Number(r.away)
    const winner = isElim ? r.winner : null

    await supabase.from('matches').update({
      home_score, away_score, is_finished: true,
      ...(winner ? { winner } : {}),
    }).eq('id', matchId)

    const { data: preds } = await supabase.from('predictions').select('*').eq('match_id', matchId)

    const getResult = (h: number, a: number) => h > a ? 'home' : a > h ? 'away' : 'draw'
    for (const pred of preds ?? []) {
      let points = 0
      if (isElim) {
        const actual90 = getResult(home_score, away_score)
        const pred90 = pred.home_score != null && pred.away_score != null
          ? getResult(pred.home_score, pred.away_score) : null
        if (pred90 === actual90) {
          const exactScore = pred.home_score === home_score && pred.away_score === away_score
          points = exactScore ? 5 : 2
          if (actual90 === 'draw' && pred.advances_prediction && winner) {
            if (pred.advances_prediction === winner) points += 1
          }
        }
      } else {
        const exactScore = pred.home_score === home_score && pred.away_score === away_score
        const correctResult = getResult(pred.home_score, pred.away_score) === getResult(home_score, away_score)
        points = exactScore ? 3 : correctResult ? 1 : 0
      }
      await supabase.from('predictions').update({ points }).eq('id', pred.id)
    }

    setSaving(null)
    setMatches(ms => ms.map(m => m.id === matchId
      ? { ...m, home_score, away_score, winner: winner ?? null, is_finished: true }
      : m
    ))
  }

  // ── Users ──────────────────────────────────────────────
  const saveUserName = async (userId: string) => {
    const name = editName[userId]?.trim()
    if (!name) return
    setSavingUser(userId)
    await supabase.from('profiles').update({ display_name: name }).eq('id', userId)
    setSavingUser(null)
    setUsers(us => us.map(u => u.id === userId ? { ...u, display_name: name } : u))
  }

  const toggleAdmin = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId)
    setUsers(us => us.map(u => u.id === userId ? { ...u, is_admin: !current } : u))
  }

  const toggleScorer = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_scorer: !current }).eq('id', userId)
    setUsers(us => us.map(u => u.id === userId ? { ...u, is_scorer: !current } : u))
  }

  const toggleHidden = async (userId: string, current: boolean) => {
    await supabase.from('profiles').update({ is_hidden: !current }).eq('id', userId)
    setUsers(us => us.map(u => u.id === userId ? { ...u, is_hidden: !current } : u))
  }

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`¿Borrar a "${name}"?\nSe eliminan todos sus pronósticos. Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', userId)
    if (!error) setUsers(us => us.filter(u => u.id !== userId))
  }

  const deleteMatch = async (matchId: number) => {
    setDeleteError('')
    await supabase.from('predictions').delete().eq('match_id', matchId)
    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (error) { setDeleteError(error.message); setConfirmDelete(null); return }
    setMatches(ms => ms.filter(m => m.id !== matchId))
    setResults(rs => { const next = { ...rs }; delete next[matchId]; return next })
    setConfirmDelete(null)
  }

  const isResultLocked = (match: MatchWithTeams) =>
    match.is_finished && match.match_date != null &&
    Date.now() - new Date(match.match_date).getTime() > 24 * 60 * 60 * 1000

  const toggleFinishedStage = (stage: string) =>
    setShowFinishedStages(prev => {
      const next = new Set(prev)
      next.has(stage) ? next.delete(stage) : next.add(stage)
      return next
    })

  const renderMatchCard = (match: MatchWithTeams) => {
    const r = results[match.id] ?? { home: '', away: '', winner: '' }
    const locked = isResultLocked(match)
    const isElim = isEliminationStage(match.stage)
    const isSaveDisabled = saving === match.id || locked || (isElim && !r.winner)

    return (
      <div key={match.id}
        className={`bg-pitch-800 rounded-2xl border p-4 ${match.is_finished ? 'border-emerald-900/40 opacity-70' : 'border-pitch-700'}`}>
        {match.match_date && (
          <p className="text-center text-xs text-zinc-600 mb-2">{formatMatchDate(match.match_date)}</p>
        )}

        {/* Score inputs */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0 text-right">
            <span className="text-xs font-medium text-white leading-snug">{match.home_team?.name}</span>
            <span className="flex-none">{match.home_team?.flag}</span>
          </div>
          <input type="number" min="0" max="20" value={r.home} disabled={locked}
            onChange={e => setResults(rs => ({ ...rs, [match.id]: { ...r, home: e.target.value } }))}
            className="w-11 h-10 text-center border border-pitch-600 bg-pitch-900 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-gold-500 flex-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-zinc-700 text-sm font-bold flex-none">:</span>
          <input type="number" min="0" max="20" value={r.away} disabled={locked}
            onChange={e => setResults(rs => ({ ...rs, [match.id]: { ...r, away: e.target.value } }))}
            className="w-11 h-10 text-center border border-pitch-600 bg-pitch-900 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-gold-500 flex-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
            <span className="flex-none">{match.away_team?.flag}</span>
            <span className="text-xs font-medium text-white leading-snug">{match.away_team?.name}</span>
          </div>
        </div>

        {/* Who advanced selector (elimination rounds only) */}
        {isElim && (
          <div className="mb-3">
            <p className="text-xs text-zinc-500 text-center mb-1.5">¿Quién avanzó?</p>
            <div className="flex gap-2">
              <button
                disabled={locked}
                onClick={() => setResults(rs => ({ ...rs, [match.id]: { ...r, winner: 'home' } }))}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors truncate ${
                  r.winner === 'home'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-pitch-900 border-pitch-600 text-zinc-400 hover:text-white hover:border-gold-600'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {match.home_team?.flag} {match.home_team?.name}
              </button>
              <button
                disabled={locked}
                onClick={() => setResults(rs => ({ ...rs, [match.id]: { ...r, winner: 'away' } }))}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors truncate ${
                  r.winner === 'away'
                    ? 'bg-gold-500 text-black border-gold-500'
                    : 'bg-pitch-900 border-pitch-600 text-zinc-400 hover:text-white hover:border-gold-600'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {match.away_team?.flag} {match.away_team?.name}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => saveResult(match.id)} disabled={isSaveDisabled}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed ${
              locked
                ? 'bg-pitch-900 text-zinc-700 border border-pitch-700'
                : match.is_finished
                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/60 disabled:opacity-50'
                : 'bg-gold-500 hover:bg-gold-400 text-black disabled:opacity-50'
            }`}>
            {saving === match.id ? 'Guardando...' : locked ? '🔒 Bloqueado (+24hs)' : match.is_finished ? '✓ Actualizar resultado' : 'Guardar resultado'}
          </button>
          {!match.is_finished && isAdmin && (
            confirmDelete === match.id ? (
              <div className="flex gap-1 flex-none">
                <button onClick={() => deleteMatch(match.id)}
                  className="px-3 py-2 rounded-xl text-sm bg-red-900/40 border border-red-700 text-red-400 font-semibold transition-colors flex-none">
                  ¿Confirmar?
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-3 py-2 rounded-xl text-sm border border-pitch-600 text-zinc-500 transition-colors flex-none">
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(match.id)}
                className="px-3 py-2 rounded-xl text-sm border border-red-900/50 text-red-500 hover:bg-red-900/20 transition-colors flex-none">
                Eliminar
              </button>
            )
          )}
        </div>
      </div>
    )
  }

  const stages = STAGES.map(s => s.key).filter(key => matches.some(m => m.stage === key))

  return (
    <div className="bg-pitch-950 min-h-screen">
      <Nav isAdmin={true} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-white mb-5">
          Panel {isAdmin ? 'Admin' : 'Resultados'}
        </h1>

        {/* Tab switcher — solo admins ven la pestaña de usuarios */}
        {isAdmin && (
          <div className="flex gap-2 mb-6">
            {[{ key: 'results', label: '📋 Resultados' }, { key: 'users', label: '👥 Usuarios' }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as 'results' | 'users')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tab === t.key ? 'bg-gold-500 text-black' : 'bg-pitch-800 text-zinc-400 border border-pitch-600 hover:text-white'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {tab === 'results' && (
          <>
            {/* Formulario de nuevo cruce — solo admins */}
            {isAdmin && <div className="bg-pitch-800 rounded-2xl border border-gold-600/30 p-5 mb-8">
              <h2 className="text-sm font-semibold text-gold-400 mb-4">➕ Nuevo cruce de eliminatorias</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select value={newStage} onChange={e => setNewStage(e.target.value)}
                  className="col-span-2 bg-pitch-900 border border-pitch-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500">
                  {STAGES.filter(s => s.key !== 'group').map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <select value={newHome} onChange={e => setNewHome(e.target.value)}
                  className="bg-pitch-900 border border-pitch-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500">
                  <option value="">Local…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
                <select value={newAway} onChange={e => setNewAway(e.target.value)}
                  className="bg-pitch-900 border border-pitch-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500">
                  <option value="">Visitante…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.flag} {t.name}</option>)}
                </select>
                <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="col-span-2 bg-pitch-900 border border-pitch-600 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500" />
              </div>
              {createError && <p className="text-red-400 text-xs mb-2">{createError}</p>}
              <button onClick={createMatch} disabled={creating}
                className="w-full bg-gold-500 hover:bg-gold-400 text-black font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear partido'}
              </button>
            </div>}

            <p className="text-xs text-zinc-600 mb-4">Al guardar un resultado, los puntos se recalculan para todos.</p>
            {deleteError && <p className="text-red-400 text-xs mb-4">Error al eliminar: {deleteError}</p>}

            {stages.map(stage => {
              const stageMatches = matches.filter(m => m.stage === stage)
              const pending = stageMatches.filter(m => !m.is_finished)
              const finished = stageMatches.filter(m => m.is_finished)
              const expanded = showFinishedStages.has(stage)
              return (
                <div key={stage} className="mb-8">
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
                    {stage === 'group' ? 'Fase de grupos' : stageLabel(stage)}
                  </h2>
                  {pending.length === 0 && finished.length > 0 && !expanded && (
                    <p className="text-xs text-zinc-700 mb-2">Todos los partidos cargados.</p>
                  )}
                  <div className="space-y-2">
                    {pending.map(match => renderMatchCard(match))}
                  </div>
                  {finished.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleFinishedStage(stage)}
                        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors w-full py-1">
                        <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        {expanded ? 'Ocultar cargados' : `${finished.length} cargado${finished.length === 1 ? '' : 's'}`}
                      </button>
                      {expanded && (
                        <div className="space-y-2 mt-2">
                          {finished.map(match => renderMatchCard(match))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 mb-4">
              Podés editar nombres, dar/quitar permisos de admin y borrar usuarios.
              Borrar un usuario elimina todos sus pronósticos. Los usuarios ocultos no aparecen en el ranking.
            </p>
            {users.map(user => (
              <div key={user.id}
                className={`bg-pitch-800 rounded-2xl border p-4 transition-opacity ${
                  user.is_hidden ? 'opacity-50 border-pitch-600' : user.id === myId ? 'border-gold-600/40' : 'border-pitch-700'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={editName[user.id] ?? user.display_name}
                      onChange={e => setEditName(n => ({ ...n, [user.id]: e.target.value }))}
                      className="w-full bg-pitch-900 border border-pitch-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
                    />
                  </div>
                  <button
                    onClick={() => saveUserName(user.id)}
                    disabled={savingUser === user.id || editName[user.id] === user.display_name}
                    className="text-xs px-3 py-2 rounded-lg bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-600/40 font-medium disabled:opacity-30 flex-none"
                  >
                    {savingUser === user.id ? '...' : 'Guardar'}
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <button
                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                    disabled={user.id === myId}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors disabled:opacity-40 ${
                      user.is_admin
                        ? 'bg-gold-500/20 text-gold-400 border-gold-600/40'
                        : 'bg-pitch-700 text-zinc-500 border-pitch-600 hover:text-zinc-300'
                    }`}
                  >
                    {user.is_admin ? '⭐ Admin' : 'Usuario'}
                  </button>
                  {!user.is_admin && (
                    <button
                      onClick={() => toggleScorer(user.id, user.is_scorer)}
                      disabled={user.id === myId}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors disabled:opacity-40 ${
                        user.is_scorer
                          ? 'bg-blue-900/40 text-blue-400 border-blue-800/50'
                          : 'bg-pitch-700 text-zinc-600 border-pitch-600 hover:text-zinc-400'
                      }`}
                    >
                      {user.is_scorer ? '📋 Cargador' : 'Sin rol extra'}
                    </button>
                  )}

                  {(predCount[user.id] ?? 0) > 0 ? (
                    <span className="text-xs text-emerald-500 font-medium">
                      ✓ {predCount[user.id]} prono{predCount[user.id] === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">Sin pronósticos</span>
                  )}

                  {user.is_hidden && (
                    <span className="text-xs text-zinc-500 border border-pitch-600 px-2 py-0.5 rounded-full">Oculto</span>
                  )}

                  {user.id === myId && (
                    <span className="text-xs text-zinc-600">(vos)</span>
                  )}

                  <div className="flex-1" />

                  {user.id !== myId && (
                    <>
                      <button
                        onClick={() => toggleHidden(user.id, user.is_hidden)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          user.is_hidden
                            ? 'text-zinc-300 border-pitch-500 hover:bg-pitch-700'
                            : 'text-zinc-500 border-pitch-600 hover:text-zinc-300 hover:border-pitch-500'
                        }`}
                      >
                        {user.is_hidden ? 'Mostrar' : 'Ocultar'}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.display_name)}
                        className="text-xs px-3 py-1.5 rounded-full text-red-500 border border-red-900/50 hover:bg-red-900/20 transition-colors"
                      >
                        Borrar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
