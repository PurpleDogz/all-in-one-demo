'use client'

import { useMemo } from 'react'
import { useQueryState } from 'nuqs'
import { trpc } from '@/lib/trpc/client'
import { KpiCard } from '@/components/shared/KpiCard'
import { PeriodToggle } from '@/components/shared/PeriodToggle'
import { SpendChart, type SpendDataPoint } from '@/components/charts/SpendChart'
import { DifferenceChart, type DifferenceDataPoint } from '@/components/charts/DifferenceChart'

type Period = '1 Month' | '3 Months' | '6 Months' | '12 Months' | '24 Months' | 'All'

function buildSpendChartData(
  rows: Array<{ period: string; group_name: string; class_name: string; total: string }>,
  groupBy: 'group_name' | 'class_name' = 'group_name',
): SpendDataPoint[] {
  const periodMap = new Map<string, Map<string, number>>()
  for (const row of rows) {
    const name = row[groupBy]
    const amount = Math.abs(parseFloat(row.total))
    if (!periodMap.has(row.period)) periodMap.set(row.period, new Map())
    const groups = periodMap.get(row.period)!
    groups.set(name, (groups.get(name) ?? 0) + amount)
  }
  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, groups]) => ({
      period,
      groups: Array.from(groups.entries()).map(([name, amount]) => ({ name, amount })),
    }))
}

function buildSurplusData(
  debitRows: Array<{ period: string; total: string }>,
  creditRows: Array<{ period: string; total: string }>,
): DifferenceDataPoint[] {
  const debitByPeriod = new Map<string, number>()
  const creditByPeriod = new Map<string, number>()

  for (const r of debitRows) {
    debitByPeriod.set(r.period, (debitByPeriod.get(r.period) ?? 0) + Math.abs(parseFloat(r.total)))
  }
  for (const r of creditRows) {
    creditByPeriod.set(r.period, (creditByPeriod.get(r.period) ?? 0) + Math.abs(parseFloat(r.total)))
  }

  const allPeriods = new Set([...debitByPeriod.keys(), ...creditByPeriod.keys()])
  return Array.from(allPeriods)
    .sort()
    .map((period) => ({
      period,
      surplus: (creditByPeriod.get(period) ?? 0) - (debitByPeriod.get(period) ?? 0),
    }))
}

export default function HomePage() {
  const [period] = useQueryState('period', { defaultValue: '12 Months' as Period })

  const { data: kpi } = trpc.transactions.kpi.useQuery({ period: period as Period })

  const { data: debitSummary } = trpc.transactions.summary.useQuery({
    period: period as Period,
    typeId: undefined,
    groupBy: 'group',
    groupPeriod: 'month',
  })

  // We need separate debit/credit queries - use typeId filter
  // Since we can't query by type name directly in the router, use summary for both types
  const { data: creditSummary } = trpc.transactions.summary.useQuery({
    period: period as Period,
    groupBy: 'group',
    groupPeriod: 'month',
  })

  const thisMonthValue = kpi
    ? `$${parseFloat(kpi.thisMonthSpend).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
    : '-'

  const ytdValue = kpi
    ? `$${parseFloat(kpi.ytdSpend).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
    : '-'

  const prevMonth = kpi ? parseFloat(kpi.prevMonthSpend) : 0
  const thisMonth = kpi ? parseFloat(kpi.thisMonthSpend) : 0
  const momDelta = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : undefined

  const periodSpend = kpi
    ? `$${parseFloat(kpi.periodSpend).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
    : '-'

  const periodMonths = period === 'All' ? null : parseInt(period)
  const rollingAvg =
    kpi && periodMonths
      ? `$${(parseFloat(kpi.periodSpend) / periodMonths).toLocaleString('en-AU', { maximumFractionDigits: 0 })}/mo`
      : '-'

  const surplus = kpi
    ? parseFloat(kpi.periodIncome) - parseFloat(kpi.periodSpend)
    : 0
  const surplusValue = kpi
    ? `${surplus >= 0 ? '+' : '-'}$${Math.abs(surplus).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
    : '-'

  const spendChartData = useMemo(
    () => (debitSummary ? buildSpendChartData(debitSummary) : []),
    [debitSummary],
  )

  const surplusChartData = useMemo(() => {
    if (!debitSummary) return []
    // For the difference chart, aggregate total per period
    const debitByPeriod = new Map<string, number>()
    const creditByPeriod = new Map<string, number>()
    for (const r of debitSummary) {
      debitByPeriod.set(r.period, (debitByPeriod.get(r.period) ?? 0) + Math.abs(parseFloat(r.total)))
    }
    if (creditSummary) {
      for (const r of creditSummary) {
        creditByPeriod.set(r.period, (creditByPeriod.get(r.period) ?? 0) + Math.abs(parseFloat(r.total)))
      }
    }
    const allPeriods = new Set([...debitByPeriod.keys()])
    return Array.from(allPeriods)
      .sort()
      .map((p) => ({
        period: p,
        surplus: (creditByPeriod.get(p) ?? 0) - (debitByPeriod.get(p) ?? 0),
      }))
  }, [debitSummary, creditSummary])

  const yMax = useMemo(() => {
    if (!spendChartData.length) return undefined
    const maxVal = Math.max(
      ...spendChartData.map((d) => d.groups.reduce((s, g) => s + g.amount, 0)),
    )
    return Math.ceil(maxVal / 1000) * 1000 + 1000
  }, [spendChartData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <PeriodToggle />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="This Month Spend"
          value={thisMonthValue}
          delta={momDelta}
          deltaLabel="vs prev month"
        />
        <KpiCard
          title="Rolling Average"
          value={rollingAvg}
          subtitle={`over ${period}`}
        />
        <KpiCard
          title="YTD Spend"
          value={ytdValue}
        />
        <KpiCard
          title="Surplus / Deficit"
          value={surplusValue}
          subtitle={`over ${period}`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <SpendChart
            data={spendChartData}
            yMax={yMax}
            title="Spend (Debit)"
            typeLabel="Debit Normal"
          />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <SpendChart
            data={spendChartData}
            yMax={yMax}
            title="Income (Credit)"
            typeLabel="Credit Normal"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <DifferenceChart
          data={surplusChartData}
          title="Surplus / Deficit"
        />
      </div>
    </div>
  )
}
