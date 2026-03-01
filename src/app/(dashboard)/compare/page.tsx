'use client'

import { useState, useMemo } from 'react'
import { useQueryState } from 'nuqs'
import { Plus, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { PeriodToggle } from '@/components/shared/PeriodToggle'
import { SpendChart, type SpendDataPoint } from '@/components/charts/SpendChart'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Period = '1 Month' | '3 Months' | '6 Months' | '12 Months' | '24 Months' | 'All'

interface PanelConfig {
  id: string
  typeId?: string
  groupId?: string
  classId?: string
}

const PANELS_KEY = 'compare-panels'
const MAX_PANELS = 4

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function defaultPanels(): PanelConfig[] {
  return [{ id: genId() }]
}

function ComparePanelChart({
  config,
  period,
}: {
  config: PanelConfig
  period: Period
}) {
  const { data: summaryRows } = trpc.transactions.summary.useQuery({
    period,
    typeId: config.typeId,
    groupId: config.groupId,
    classId: config.classId,
    groupBy: config.classId ? 'class' : 'group',
    groupPeriod: 'month',
  })

  const chartData = useMemo<SpendDataPoint[]>(() => {
    if (!summaryRows) return []
    const periodMap = new Map<string, Map<string, number>>()
    for (const r of summaryRows) {
      const name = config.classId ? r.class_name : r.group_name
      if (!periodMap.has(r.period)) periodMap.set(r.period, new Map())
      const groups = periodMap.get(r.period)!
      groups.set(name, (groups.get(name) ?? 0) + Math.abs(parseFloat(r.total)))
    }
    return Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, groups]) => ({
        period,
        groups: Array.from(groups.entries()).map(([name, amount]) => ({ name, amount })),
      }))
  }, [summaryRows, config.classId])

  return <SpendChart data={chartData} />
}

function ComparePanel({
  config,
  period,
  onRemove,
  onUpdate,
}: {
  config: PanelConfig
  period: Period
  onRemove: () => void
  onUpdate: (updates: Partial<PanelConfig>) => void
}) {
  const { data: groups } = trpc.groups.list.useQuery({})
  const { data: classes } = trpc.classes.list.useQuery({
    groupId: config.groupId,
  })

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={config.groupId ?? '__all__'}
          onValueChange={(v) => onUpdate({ groupId: v === '__all__' ? undefined : v, classId: undefined })}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Groups</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={config.classId ?? '__all__'}
          onValueChange={(v) => onUpdate({ classId: v === '__all__' ? undefined : v })}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Classes</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <button
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-[var(--color-deficit)] transition-colors"
          aria-label="Remove panel"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ComparePanelChart config={config} period={period} />
    </div>
  )
}

export default function ComparePage() {
  const [period] = useQueryState('period', { defaultValue: '12 Months' as Period })
  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    if (typeof window === 'undefined') return defaultPanels()
    try {
      const stored = localStorage.getItem(PANELS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Ignore
    }
    return defaultPanels()
  })

  function savePanels(next: PanelConfig[]) {
    setPanels(next)
    try {
      localStorage.setItem(PANELS_KEY, JSON.stringify(next))
    } catch {
      // Ignore
    }
  }

  function addPanel() {
    if (panels.length >= MAX_PANELS) return
    savePanels([...panels, { id: genId() }])
  }

  function removePanel(id: string) {
    savePanels(panels.filter((p) => p.id !== id))
  }

  function updatePanel(id: string, updates: Partial<PanelConfig>) {
    savePanels(panels.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">Compare</h1>
        <div className="flex items-center gap-2">
          <PeriodToggle />
          <Button
            size="sm"
            variant="outline"
            onClick={addPanel}
            disabled={panels.length >= MAX_PANELS}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Panel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {panels.map((panel) => (
          <ComparePanel
            key={panel.id}
            config={panel}
            period={period as Period}
            onRemove={() => removePanel(panel.id)}
            onUpdate={(updates) => updatePanel(panel.id, updates)}
          />
        ))}
      </div>
    </div>
  )
}
