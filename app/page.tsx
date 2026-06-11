import { createClient } from '@/lib/supabase-server'
import Nav from '@/components/Nav'
import { redirect } from 'next/navigation'
import type { LeaderboardEntry } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const { data: leaderboard } = await supabase
    .from('leaderboard').select('*')

  return (
    <div>
      <Nav isAdmin={profile?.is_admin} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tabla de posiciones</h1>
        <p className="text-gray-500 text-sm mb-6">Mundial 2026 — USA / México / Canadá</p>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="grid grid-cols-4 bg-green-700 text-white text-xs font-medium px-4 py-2">
            <span>#</span>
            <span className="col-span-2">Jugador</span>
            <span className="text-right">Puntos</span>
          </div>
          {(leaderboard as LeaderboardEntry[])?.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-4 items-center px-4 py-3 border-b last:border-0 ${
                entry.id === user.id ? 'bg-green-50' : ''
              }`}
            >
              <span className="text-gray-400 text-sm font-mono">{i + 1}</span>
              <div className="col-span-2">
                <p className="font-medium text-gray-800">{entry.display_name}</p>
                <p className="text-xs text-gray-400">{entry.exact_scores} exactos</p>
              </div>
              <p className="text-right font-bold text-green-700">{entry.total_points} pts</p>
            </div>
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <p className="text-center text-gray-400 py-8 text-sm">
              Nadie cargó pronósticos todavía.
            </p>
          )}
        </div>

        <div className="mt-6 bg-gray-100 rounded-xl p-4 text-xs text-gray-500">
          <p className="font-semibold text-gray-600 mb-1">Sistema de puntos</p>
          <p>Fase de grupos: 1pt ganador / 3pt resultado exacto</p>
          <p>Eliminatorias: 2pt / 5pt exacto</p>
          <p>Final: 4pt / 8pt exacto</p>
          <p>Campeón: 10pt · Goleador: 5pt</p>
        </div>
      </main>
    </div>
  )
}
