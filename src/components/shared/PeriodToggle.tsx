'use client'

import { useQueryState } from 'nuqs'
import { cn } from '@/lib/utils'

const PERIODS = ['1 Month', '3 Months', '6 Months', '12 Months', '24 Months', 'All'] as const
type Period = (typeof PERIODS)[number]

interface PeriodToggleProps {
  className?: string
}

export function PeriodToggle({ className }: PeriodToggleProps) {
  const [period, setPeriod] = useQueryState('period', {
    defaultValue: '12 Months' as Period,
  })

  return (
    <div className={cn('flex items-center gap-0.5 rounded-md border border-border bg-muted p-0.5', className)}>
      {PERIODS.map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-medium transition-colors',
            period === p
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
