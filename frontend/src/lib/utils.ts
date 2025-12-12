import { format, parseISO } from 'date-fns'

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'yyyy-MM-dd')
  }
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date | string): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'MMM d, yyyy')
  }
  return format(date, 'MMM d, yyyy')
}

export function getMoodEmoji(score: number): string {
  if (score >= 5) return '🤩'
  if (score >= 4) return '😊'
  if (score >= 3) return '😐'
  if (score >= 2) return '😕'
  return '😢'
}

export function getMoodColor(score: number): string {
  if (score >= 8) return 'text-green-500'
  if (score >= 6) return 'text-blue-500'
  if (score >= 4) return 'text-yellow-500'
  return 'text-red-500'
}

export function getCorrelationColor(correlation: number): string {
  const abs = Math.abs(correlation)
  if (abs >= 0.7) return correlation > 0 ? 'text-green-600' : 'text-red-600'
  if (abs >= 0.4) return correlation > 0 ? 'text-green-500' : 'text-red-500'
  if (abs >= 0.2) return correlation > 0 ? 'text-green-400' : 'text-red-400'
  return 'text-gray-500'
}

export function getCorrelationLabel(correlation: number): string {
  const abs = Math.abs(correlation)
  const direction = correlation > 0 ? 'Positive' : 'Negative'
  if (abs >= 0.7) return `Strong ${direction}`
  if (abs >= 0.4) return `Moderate ${direction}`
  if (abs >= 0.2) return `Weak ${direction}`
  return 'Negligible'
}

