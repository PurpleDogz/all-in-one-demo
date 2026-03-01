import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  delta?: number
  deltaLabel?: string
  className?: string
}

export function KpiCard({ title, value, subtitle, delta, deltaLabel, className }: KpiCardProps) {
  const hasDelta = delta !== undefined && delta !== null && !isNaN(delta)

  // For spend: negative delta (less spend) is good (green), positive delta (more spend) is bad (red)
  const isGood = hasDelta && delta < 0
  const isBad = hasDelta && delta > 0

  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
          {title}
        </p>
        <p className="text-2xl font-mono font-semibold text-foreground leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {hasDelta && (
          <div className="mt-2 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                isGood && 'bg-[var(--color-surplus)]/15 text-[var(--color-surplus)]',
                isBad && 'bg-[var(--color-deficit)]/15 text-[var(--color-deficit)]',
                !isGood && !isBad && 'bg-muted text-muted-foreground',
              )}
            >
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)}%
            </span>
            {deltaLabel && (
              <span className="text-xs text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
