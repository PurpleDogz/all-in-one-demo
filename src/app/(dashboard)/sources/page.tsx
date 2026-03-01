'use client'

import { useRouter } from 'next/navigation'
import type { ColDef, RowClickedEvent } from '@ag-grid-community/core'
import { trpc } from '@/lib/trpc/client'
import { AgGridDark } from '@/components/grids/AgGridDark'

export default function SourcesPage() {
  const router = useRouter()
  const { data: sources } = trpc.sources.list.useQuery()

  const colDefs: ColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'type', headerName: 'Type', width: 120 },
    {
      headerName: 'Transactions',
      width: 140,
      valueGetter: (p) => p.data._count?.transactions ?? 0,
      type: 'numericColumn',
    },
  ]

  function handleRowClick(e: RowClickedEvent) {
    router.push(`/transactions?source=${e.data.id}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Sources</h1>
      <p className="text-sm text-muted-foreground">
        Click a source to view its transactions.
      </p>
      <div className="rounded-lg border border-border overflow-hidden">
        <AgGridDark
          columnDefs={colDefs}
          rowData={sources ?? []}
          onRowClicked={handleRowClick}
          rowStyle={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  )
}
