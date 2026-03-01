import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nameToHsl(name: string): string {
  let hash = 0
  for (const ch of name) hash = ((hash * 31 + ch.charCodeAt(0)) >>> 0)
  const hue = hash % 360
  return `hsl(${hue}, 60%, 55%)`
}

export function formatAmount(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return Math.abs(num).toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

export function formatAmountSigned(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const prefix = num >= 0 ? '+' : '-'
  return `${prefix}$${Math.abs(num).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function periodToMonths(period: string): number {
  const map: Record<string, number> = {
    '1 Month': 1,
    '3 Months': 3,
    '6 Months': 6,
    '12 Months': 12,
    '24 Months': 24,
    'All': 0,
  }
  return map[period] ?? 12
}
