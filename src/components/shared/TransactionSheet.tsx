'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CopyButton } from './CopyButton'
import { ClassifierRuleForm } from './ClassifierRuleForm'
import { escapeRegex } from '@/lib/utils'

export interface TransactionDetail {
  id: string
  date: string
  description: string
  amount: string | number
  sourceName?: string
  sourceId?: string
  className?: string | null
  classId?: string | null
  groupName?: string | null
  groupId?: string | null
  typeName?: string | null
  typeId?: string | null
}

interface TransactionSheetProps {
  transaction: TransactionDetail | null
  open: boolean
  onClose: () => void
}

function buildClassifierSnippet(description: string, classId?: string | null): string {
  const regex = escapeRegex(description.toUpperCase())
  return JSON.stringify(
    {
      regex,
      classId: classId ?? 'CLASS_ID',
    },
    null,
    2,
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground break-all">{value}</span>
    </div>
  )
}

export function TransactionSheet({ transaction, open, onClose }: TransactionSheetProps) {
  const [classifierOpen, setClassifierOpen] = useState(false)

  if (!transaction) return null

  const amount = typeof transaction.amount === 'string'
    ? parseFloat(transaction.amount)
    : transaction.amount
  const isDebit = amount < 0
  const formattedAmount = `${isDebit ? '-' : '+'}$${Math.abs(amount).toLocaleString('en-AU', { maximumFractionDigits: 2 })}`

  const snippet = buildClassifierSnippet(transaction.description, transaction.classId)

  function openGoogleSearch() {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(transaction!.description)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">Transaction Detail</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-1">
            <DetailRow label="Date" value={transaction.date} />
            <DetailRow label="Description" value={transaction.description} />
            <DetailRow
              label="Amount"
              value={formattedAmount}
            />
            <DetailRow label="Source" value={transaction.sourceName} />
            <DetailRow label="Type" value={transaction.typeName} />
            <DetailRow label="Group" value={transaction.groupName} />
            <DetailRow label="Class" value={transaction.className} />
          </div>

          <Separator className="my-4" />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Classifier Snippet</p>
            <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto font-mono text-foreground border border-border whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <div className="mt-2 flex gap-2">
              <CopyButton text={snippet} label="Copy JSON" size="sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={openGoogleSearch}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Search
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClassifierOpen(true)}
              >
                Add Classifier
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ClassifierRuleForm
        open={classifierOpen}
        onClose={() => setClassifierOpen(false)}
        defaultRegex={escapeRegex(transaction.description.toUpperCase())}
        defaultClassId={transaction.classId ?? undefined}
      />
    </>
  )
}
