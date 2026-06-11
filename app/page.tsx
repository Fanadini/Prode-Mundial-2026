'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import Nav from '@/components/Nav'
import { useRouter } from 'next/navigation'
import type { LeaderboardEntry } from '@/lib/types'

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        setUserId(session.user.id)
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin ?? false)
        const { data } = await supabase.from('leaderboard').select('*')
        setLeaderboard((data as LeaderboardEntry[]) ?? [])
        setLoading(false)
      } catch {
        router.push('/login')
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Cargando...</p>
    </div>
  )

  return (
    <div>
      <Nav isAdmin={isAdmin} />
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tabla de posiciones</h1>
        <p className="text-gray-500 text-sm mb-6">Mundial 2026 — USA / México / Canadá</p>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="grid grid-cols-4 bg-green-700 text-white text-xs font-medium px-4 py-2">
            <span>#</span>
            <span className="col-span-2">Jugador</span>
            <span className="text-right">Puntos</span>
          </div>
          {leaderboard.map((entry, i) => (
            <div
              key={entry.id}
              className={`grid grid-cols-4 items-center px-4 py-3 border-b last:border-0 ${
                entry.id === userId ? 'bg-green-50' : ''
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
          {leaderboard.length === 0 && (
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
