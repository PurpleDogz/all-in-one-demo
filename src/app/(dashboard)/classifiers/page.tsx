'use client'

import { useState, useMemo } from 'react'
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import type { ColDef } from '@ag-grid-community/core'
import { trpc } from '@/lib/trpc/client'
import { AgGridDark } from '@/components/grids/AgGridDark'
import { ClassifierRuleForm } from '@/components/shared/ClassifierRuleForm'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

export default function ClassifiersPage() {
  const { toast } = useToast()
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editRuleId, setEditRuleId] = useState<string | undefined>()
  const [editDefaults, setEditDefaults] = useState<{ regex?: string; classId?: string }>({})

  const { data: rules, refetch: refetchRules } = trpc.classifiers.list.useQuery({
    classId: classFilter ?? undefined,
  })
  const { data: groups } = trpc.groups.list.useQuery({})
  const { data: classes } = trpc.classes.list.useQuery({
    groupId: groupFilter ?? undefined,
  })

  const deleteMutation = trpc.classifiers.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Rule deleted' })
      refetchRules()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const reclassifyMutation = trpc.classifiers.reclassify.useMutation({
    onSuccess: (result) => {
      toast({ title: 'Reclassification complete', description: `${result.updated} transactions updated` })
      refetchRules()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const filtered = useMemo(() => {
    if (!rules) return []
    let result = [...rules]
    if (groupFilter) {
      result = result.filter((r) => {
        const rule = r as { class?: { group?: { id?: string } } }
        return rule.class?.group?.id === groupFilter
      })
    }
    return result
  }, [rules, groupFilter])

  const colDefs: ColDef[] = [
    {
      headerName: 'Class',
      width: 160,
      valueGetter: (p) => p.data.class?.name ?? '',
    },
    {
      headerName: 'Group',
      width: 140,
      valueGetter: (p) => p.data.class?.group?.name ?? '',
    },
    { field: 'regex', headerName: 'Regex', flex: 1, minWidth: 200, cellStyle: { fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' } },
    {
      headerName: 'Constraints',
      width: 200,
      valueGetter: (p) => {
        const parts: string[] = []
        if (p.data.value) parts.push(`val=${p.data.value}`)
        if (p.data.valueMin || p.data.valueMax) parts.push(`range=${p.data.valueMin ?? ''}–${p.data.valueMax ?? ''}`)
        if (p.data.date) parts.push(`date=${p.data.date}`)
        return parts.join(', ') || '-'
      },
    },
    {
      headerName: 'Actions',
      width: 100,
      sortable: false,
      cellRenderer: (params: { data: { id: string; regex: string; classId: string } }) => {
        return (
          <div className="flex items-center gap-2 h-full">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditRuleId(params.data.id)
                setEditDefaults({ regex: params.data.regex, classId: params.data.classId })
                setFormOpen(true)
              }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this rule?')) {
                  deleteMutation.mutate({ id: params.data.id })
                }
              }}
              className="p-1 text-muted-foreground hover:text-[var(--color-deficit)] transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      },
    },
  ]

  function handleAddRule() {
    setEditRuleId(undefined)
    setEditDefaults({})
    setFormOpen(true)
  }

  function handleFormClose() {
    setFormOpen(false)
    setEditRuleId(undefined)
    setEditDefaults({})
    refetchRules()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">Classifiers</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => reclassifyMutation.mutate({})}
            disabled={reclassifyMutation.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${reclassifyMutation.isPending ? 'animate-spin' : ''}`} />
            Reclassify All
          </Button>
          <Button size="sm" onClick={handleAddRule} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={groupFilter ?? '__all__'}
          onValueChange={(v) => { setGroupFilter(v === '__all__' ? null : v); setClassFilter(null) }}
        >
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Groups</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={classFilter ?? '__all__'}
          onValueChange={(v) => setClassFilter(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Classes</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-1">{filtered.length} rules</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <AgGridDark
          columnDefs={colDefs}
          rowData={filtered}
        />
      </div>

      <ClassifierRuleForm
        open={formOpen}
        onClose={handleFormClose}
        ruleId={editRuleId}
        defaultRegex={editDefaults.regex}
        defaultClassId={editDefaults.classId}
      />
    </div>
  )
}
