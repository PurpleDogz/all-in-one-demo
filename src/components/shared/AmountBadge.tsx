import { cn } from '@/lib/utils'

interface AmountBadgeProps {
  amount: string | number
  isPositive?: boolean
  className?: string
  prefix?: string
}

export function AmountBadge({ amount, isPositive, className, prefix = '$' }: AmountBadgeProps) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  const positive = isPositive !== undefined ? isPositive : num >= 0
  const formatted = Math.abs(num).toLocaleString('en-AU', { maximumFractionDigits: 0 })

  return (
    <span
      className={cn(
        'font-mono text-sm font-medium',
        positive ? 'text-[var(--color-surplus)]' : 'text-[var(--color-deficit)]',
        className,
      )}
    >
      {positive ? '' : '-'}
      {prefix}
      {formatted}
    </span>
  )
}
