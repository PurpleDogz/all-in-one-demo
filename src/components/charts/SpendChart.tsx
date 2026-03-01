'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { nameToHsl } from '@/lib/utils'
import { BreakdownModal, type BreakdownRow } from './BreakdownModal'

export interface SpendDataPoint {
  period: string
  groups: { name: string; amount: number }[]
}

interface SpendChartProps {
  data: SpendDataPoint[]
  yMax?: number
  title?: string
  typeLabel?: string
}

function computeSma(values: number[], windowSize: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < windowSize - 1) return null
    const window = values.slice(i - windowSize + 1, i + 1)
    return window.reduce((s, v) => s + v, 0) / windowSize
  })
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill?: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const barEntries = payload.filter((p) => p.name !== '__sma__' && typeof p.value === 'number' && p.value > 0)
  const total = barEntries.reduce((s, p) => s + (p.value || 0), 0)

  return (
    <div className="rounded-md border border-border bg-card shadow-lg p-3 min-w-[180px]">
      <p className="text-xs font-medium text-foreground mb-2">{label}</p>
      <table className="w-full text-xs">
        <tbody>
          {barEntries.map((entry) => (
            <tr key={entry.name}>
              <td className="pr-3 py-0.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm mr-1.5"
                  style={{ background: entry.fill ?? nameToHsl(entry.name) }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </td>
              <td className="text-right font-mono text-foreground">
                ${(entry.value || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <td className="pt-1 text-muted-foreground font-medium">Total</td>
            <td className="pt-1 text-right font-mono font-semibold text-foreground">
              ${total.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export function SpendChart({ data, yMax, title, typeLabel }: SpendChartProps) {
  const [modalData, setModalData] = useState<{ title: string; rows: BreakdownRow[] } | null>(null)

  // Collect all group names
  const allGroups = useMemo(() => {
    const names = new Set<string>()
    data.forEach((d) => d.groups.forEach((g) => names.add(g.name)))
    return Array.from(names).sort()
  }, [data])

  // Flatten data for recharts
  const chartData = useMemo(() => {
    const totals = data.map((d) => d.groups.reduce((s, g) => s + g.amount, 0))
    const smaValues = computeSma(totals, 3)

    return data.map((d, i) => {
      const row: Record<string, number | string | null> = { period: d.period }
      let periodTotal = 0
      d.groups.forEach((g) => {
        row[g.name] = g.amount
        periodTotal += g.amount
      })
      allGroups.forEach((name) => {
        if (row[name] === undefined) row[name] = 0
      })
      row['__sma__'] = smaValues[i]
      row['__total__'] = periodTotal
      return row
    })
  }, [data, allGroups])

  function handleBarClick(periodData: Record<string, unknown>, period: string) {
    const rows: BreakdownRow[] = []
    let total = 0
    allGroups.forEach((name) => {
      const amount = (periodData[name] as number) || 0
      if (amount > 0) {
        total += amount
        rows.push({ name, amount, pct: 0 })
      }
    })
    rows.forEach((r) => {
      r.pct = total > 0 ? (r.amount / total) * 100 : 0
    })
    setModalData({ title: `${period}${typeLabel ? ` - ${typeLabel}` : ''}`, rows })
  }

  return (
    <>
      <div className="w-full">
        {title && (
          <p className="text-sm font-medium text-foreground mb-2">{title}</p>
        )}
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#8b949e' }}
              tickLine={false}
              axisLine={{ stroke: '#30363d' }}
            />
            <YAxis
              domain={[0, yMax || 'auto']}
              tick={{ fontSize: 11, fill: '#8b949e' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            {allGroups.map((name) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="a"
                fill={nameToHsl(name)}
                cursor="pointer"
                onClick={(barData) => handleBarClick(barData as Record<string, unknown>, String(barData.period))}
              />
            ))}
            <Line
              dataKey="__sma__"
              name="3mo avg"
              type="monotone"
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {modalData && (
        <BreakdownModal
          open
          onClose={() => setModalData(null)}
          title={modalData.title}
          rows={modalData.rows}
        />
      )}
    </>
  )
}
