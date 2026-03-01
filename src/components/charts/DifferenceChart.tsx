'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface DifferenceDataPoint {
  period: string
  surplus: string | number
}

interface DifferenceChartProps {
  data: DifferenceDataPoint[]
  title?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value ?? 0
  const isPositive = value >= 0

  return (
    <div className="rounded-md border border-border bg-card shadow-lg p-3 min-w-[140px]">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      <p
        className="text-sm font-mono font-semibold"
        style={{ color: isPositive ? 'var(--color-surplus)' : 'var(--color-deficit)' }}
      >
        {isPositive ? '+' : '-'}$
        {Math.abs(value).toLocaleString('en-AU', { maximumFractionDigits: 0 })}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {isPositive ? 'Surplus' : 'Deficit'}
      </p>
    </div>
  )
}

export function DifferenceChart({ data, title }: DifferenceChartProps) {
  const chartData = data.map((d) => ({
    period: d.period,
    surplus: typeof d.surplus === 'string' ? parseFloat(d.surplus) : d.surplus,
  }))

  return (
    <div className="w-full">
      {title && <p className="text-sm font-medium text-foreground mb-2">{title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: '#8b949e' }}
            tickLine={false}
            axisLine={{ stroke: '#30363d' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8b949e' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#30363d" strokeWidth={1.5} />
          <Bar dataKey="surplus" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.surplus >= 0 ? '#3fb950' : '#f85149'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
