'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQueryState } from 'nuqs'
import type { ColDef, GridReadyEvent, RowClickedEvent } from '@ag-grid-community/core'
import { trpc } from '@/lib/trpc/client'
import { PeriodToggle } from '@/components/shared/PeriodToggle'
import { AgGridDark } from '@/components/grids/AgGridDark'
import { TransactionSheet, type TransactionDetail } from '@/components/shared/TransactionSheet'

type Period = '1 Month' | '3 Months' | '6 Months' | '12 Months' | '24 Months' | 'All'

interface SummaryRow {
  period: string
  group_name: string
  class_name: string
  total: string
  tx_count: number
}

function formatAmt(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return `$${Math.abs(n).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`
}

export default function SummaryPage() {
  const [period] = useQueryState('period', { defaultValue: '12 Months' as Period })
  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Drilldown state
  const [drillGroup, setDrillGroup] = useQueryState('group')
  const [drillClass, setDrillClass] = useQueryState('class')

  const { data: summaryRows } = trpc.transactions.summary.useQuery({
    period: period as Period,
    groupBy: 'class',
    groupPeriod: 'month',
  })

  const { data: transactions } = trpc.transactions.list.useQuery({
    limit: 500,
    groupId: drillGroup ?? undefined,
    classId: drillClass ?? undefined,
  })

  // Group totals
  const groupTotals = useMemo(() => {
    if (!summaryRows) return []
    const map = new Map<string, number>()
    for (const r of summaryRows) {
      map.set(r.group_name, (map.get(r.group_name) ?? 0) + Math.abs(parseFloat(r.total)))
    }
    return Array.from(map.entries())
      .map(([group, total]) => ({ group, total }))
      .sort((a, b) => b.total - a.total)
  }, [summaryRows])

  // Group by month (for selected group or all)
  const groupByMonth = useMemo(() => {
    if (!summaryRows) return []
    const filtered = drillGroup
      ? summaryRows.filter((r) => r.group_name === drillGroup)
      : summaryRows
    const map = new Map<string, Map<string, number>>()
    for (const r of filtered) {
      if (!map.has(r.period)) map.set(r.period, new Map())
      const periodMap = map.get(r.period)!
      periodMap.set(r.group_name, (periodMap.get(r.group_name) ?? 0) + Math.abs(parseFloat(r.total)))
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([period, groups]) =>
        Array.from(groups.entries()).map(([group, total]) => ({ period, group, total })),
      )
  }, [summaryRows, drillGroup])

  // Class totals
  const classTotals = useMemo(() => {
    if (!summaryRows) return []
    const map = new Map<string, { total: number; group: string }>()
    for (const r of summaryRows) {
      if (!map.has(r.class_name)) map.set(r.class_name, { total: 0, group: r.group_name })
      map.get(r.class_name)!.total += Math.abs(parseFloat(r.total))
    }
    return Array.from(map.entries())
      .map(([className, { total, group }]) => ({ class: className, group, total }))
      .sort((a, b) => b.total - a.total)
  }, [summaryRows])

  const groupTotalCols: ColDef[] = [
    {
      field: 'group',
      headerName: 'Group',
      flex: 1,
      cellStyle: { cursor: 'pointer', color: '#388bfd' },
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      valueFormatter: (p) => formatAmt(p.value),
      type: 'numericColumn',
    },
  ]

  const groupByMonthCols: ColDef[] = [
    { field: 'period', headerName: 'Period', width: 100 },
    { field: 'group', headerName: 'Group', flex: 1 },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      valueFormatter: (p) => formatAmt(p.value),
      type: 'numericColumn',
    },
  ]

  const classTotalCols: ColDef[] = [
    { field: 'group', headerName: 'Group', width: 160 },
    { field: 'class', headerName: 'Class', flex: 1 },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      valueFormatter: (p) => formatAmt(p.value),
      type: 'numericColumn',
    },
  ]

  const txCols: ColDef[] = [
    { field: 'date', headerName: 'Date', width: 110 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (p) => formatAmt(p.value),
      type: 'numericColumn',
    },
    { field: 'class.group.name', headerName: 'Group', width: 140 },
    { field: 'class.name', headerName: 'Class', width: 140 },
  ]

  const txRowData = useMemo(() => {
    if (!transactions?.data) return []
    return transactions.data.map((tx) => ({
      id: tx.id,
      date: new Date(tx.date).toISOString().slice(0, 10),
      description: tx.description,
      amount: tx.amount.toString(),
      sourceName: tx.source?.name,
      sourceId: tx.source?.id,
      className: tx.class?.name ?? null,
      classId: tx.class?.id ?? null,
      groupName: tx.class?.group?.name ?? null,
      groupId: tx.class?.group?.id ?? null,
      typeName: tx.class?.type?.name ?? null,
      typeId: tx.class?.type?.id ?? null,
      // keep nested for AG Grid field access
      class: tx.class,
    }))
  }, [transactions])

  function handleTxRowClick(e: RowClickedEvent) {
    const row = e.data as TransactionDetail
    setSelectedTx(row)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">Summary</h1>
        <PeriodToggle />
      </div>

      {drillGroup && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <button
            className="text-sm text-primary hover:underline"
            onClick={() => {
              setDrillGroup(null)
              setDrillClass(null)
            }}
          >
            {drillGroup} x
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Group Totals
          </p>
          <AgGridDark
            columnDefs={groupTotalCols}
            rowData={groupTotals}
            onRowClicked={(e) => setDrillGroup(e.data.group)}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            By Month
          </p>
          <AgGridDark
            columnDefs={groupByMonthCols}
            rowData={groupByMonth}
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Class Totals
          </p>
          <AgGridDark
            columnDefs={classTotalCols}
            rowData={classTotals}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Transactions
        </p>
        <AgGridDark
          columnDefs={txCols}
          rowData={txRowData}
          onRowClicked={handleTxRowClick}
          rowStyle={{ cursor: 'pointer' }}
        />
      </div>

      <TransactionSheet
        transaction={selectedTx}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
