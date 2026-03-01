'use client'

import { useState, useMemo } from 'react'
import { useQueryState } from 'nuqs'
import { X } from 'lucide-react'
import type { ColDef, RowClickedEvent } from '@ag-grid-community/core'
import { trpc } from '@/lib/trpc/client'
import { Input } from '@/components/ui/input'
import { AgGridDark } from '@/components/grids/AgGridDark'
import { TransactionSheet, type TransactionDetail } from '@/components/shared/TransactionSheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Period = '1 Month' | '3 Months' | '6 Months' | '12 Months' | '24 Months' | 'All'

export default function TransactionsPage() {
  const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // URL state filters
  const [description, setDescription] = useQueryState('q')
  const [groupId, setGroupId] = useQueryState('group')
  const [classId, setClassId] = useQueryState('class')
  const [sourceId, setSourceId] = useQueryState('source')

  const { data: groups } = trpc.groups.list.useQuery({})
  const { data: classes } = trpc.classes.list.useQuery({ groupId: groupId ?? undefined })
  const { data: sources } = trpc.sources.list.useQuery()

  const { data: transactions, isLoading } = trpc.transactions.list.useQuery({
    limit: 500,
    description: description ?? undefined,
    groupId: groupId ?? undefined,
    classId: classId ?? undefined,
    sourceId: sourceId ?? undefined,
  })

  const rowData = useMemo(() => {
    if (!transactions?.data) return []
    return transactions.data.map((tx) => ({
      id: tx.id,
      date: new Date(tx.date).toISOString().slice(0, 10),
      description: tx.description,
      amount: tx.amount.toString(),
      sourceName: tx.source?.name ?? null,
      sourceId: tx.source?.id ?? null,
      className: tx.class?.name ?? null,
      classId: tx.class?.id ?? null,
      groupName: tx.class?.group?.name ?? null,
      groupId: tx.class?.group?.id ?? null,
      typeName: tx.class?.type?.name ?? null,
      typeId: tx.class?.type?.id ?? null,
    }))
  }, [transactions])

  const colDefs: ColDef[] = [
    { field: 'date', headerName: 'Date', width: 110, sort: 'desc' },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (p) => {
        const n = parseFloat(p.value)
        return `$${Math.abs(n).toLocaleString('en-AU', { maximumFractionDigits: 2 })}`
      },
      type: 'numericColumn',
    },
    { field: 'sourceName', headerName: 'Source', width: 120 },
    { field: 'typeName', headerName: 'Type', width: 120 },
    { field: 'groupName', headerName: 'Group', width: 140 },
    { field: 'className', headerName: 'Class', width: 140 },
  ]

  function handleRowClick(e: RowClickedEvent) {
    setSelectedTx(e.data as TransactionDetail)
    setSheetOpen(true)
  }

  const activeFilters: Array<{ key: string; label: string; clear: () => void }> = []
  if (description) activeFilters.push({ key: 'q', label: `Description: "${description}"`, clear: () => setDescription(null) })
  if (groupId) {
    const group = groups?.find((g) => g.id === groupId)
    activeFilters.push({ key: 'group', label: `Group: ${group?.name ?? groupId}`, clear: () => { setGroupId(null); setClassId(null) } })
  }
  if (classId) {
    const cls = classes?.find((c) => c.id === classId)
    activeFilters.push({ key: 'class', label: `Class: ${cls?.name ?? classId}`, clear: () => setClassId(null) })
  }
  if (sourceId) {
    const src = sources?.find((s) => s.id === sourceId)
    activeFilters.push({ key: 'source', label: `Source: ${src?.name ?? sourceId}`, clear: () => setSourceId(null) })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Transactions</h1>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search description..."
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value || null)}
          className="max-w-xs h-9 text-sm"
        />

        <Select value={groupId ?? '__all__'} onValueChange={(v) => { setGroupId(v === '__all__' ? null : v); setClassId(null) }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Groups</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={classId ?? '__all__'} onValueChange={(v) => setClassId(v === '__all__' ? null : v)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Classes</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sourceId ?? '__all__'} onValueChange={(v) => setSourceId(v === '__all__' ? null : v)}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Sources</SelectItem>
            {sources?.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-xs hover:bg-primary/25 transition-colors"
            >
              {f.label}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {isLoading ? 'Loading...' : `${rowData.length} transactions`}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <AgGridDark
          columnDefs={colDefs}
          rowData={rowData}
          onRowClicked={handleRowClick}
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
