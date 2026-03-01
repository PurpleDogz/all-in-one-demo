'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/shared/CopyButton'
import { cn } from '@/lib/utils'

export interface BreakdownRow {
  name: string
  amount: number
  pct: number
}

interface BreakdownModalProps {
  open: boolean
  onClose: () => void
  title: string
  rows: BreakdownRow[]
}

export function BreakdownModal({ open, onClose, title, rows }: BreakdownModalProps) {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  const tsvText = [
    'Name\tAmount\t%',
    ...sorted.map(
      (r) =>
        `${r.name}\t${r.amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}\t${r.pct.toFixed(1)}%`,
    ),
    `Total\t${total.toLocaleString('en-AU', { maximumFractionDigits: 0 })}\t100%`,
  ].join('\n')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">
                    Amount
                  </th>
                  <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.name} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 text-foreground">{row.name}</td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">
                      ${row.amount.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {row.pct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td className="px-3 py-2 font-medium text-foreground">Total</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                    ${total.toLocaleString('en-AU', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-3 flex justify-end">
            <CopyButton text={tsvText} label="Copy TSV" size="sm" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
