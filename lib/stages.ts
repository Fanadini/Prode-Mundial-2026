export const ELIMINATION_STAGES = new Set(['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'])

export function isEliminationStage(stage: string): boolean {
  return ELIMINATION_STAGES.has(stage)
}

export const STAGES = [
  { key: 'group', label: 'Grupos' },
  { key: 'round_of_32', label: '16avos' },
  { key: 'round_of_16', label: 'Octavos' },
  { key: 'quarter', label: 'Cuartos' },
  { key: 'semi', label: 'Semis' },
  { key: 'final', label: 'Final' },
] as const

export function stageLabel(key: string) {
  return STAGES.find(s => s.key === key)?.label ?? key
}

export function formatMatchDate(date: string | null) {
  if (!date) return null
  const d = new Date(date)
  const day = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time} hs`
}

export function formatMatchTime(date: string | null) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
}

export function formatCalendarDay(date: string | null) {
  if (!date) return 'Sin fecha'
  return new Date(date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}
