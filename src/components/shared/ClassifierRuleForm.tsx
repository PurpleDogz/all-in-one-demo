'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface ClassifierRuleFormProps {
  open: boolean
  onClose: () => void
  defaultRegex?: string
  defaultClassId?: string
  ruleId?: string
}

interface TestResult {
  description: string
  matches: boolean
}

export function ClassifierRuleForm({
  open,
  onClose,
  defaultRegex = '',
  defaultClassId = '',
  ruleId,
}: ClassifierRuleFormProps) {
  const { toast } = useToast()
  const isEdit = !!ruleId

  const [classId, setClassId] = useState(defaultClassId)
  const [regex, setRegex] = useState(defaultRegex)
  const [value, setValue] = useState('')
  const [valueMin, setValueMin] = useState('')
  const [valueMax, setValueMax] = useState('')
  const [date, setDate] = useState('')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [regexError, setRegexError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: classes } = trpc.classes.list.useQuery({})
  const { data: recentTxns } = trpc.transactions.list.useQuery({ limit: 100 }, { enabled: open })

  const createMutation = trpc.classifiers.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Classifier created' })
      onClose()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  const updateMutation = trpc.classifiers.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Classifier updated' })
      onClose()
    },
    onError: (err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  })

  // Reset form when props change or dialog opens
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setClassId(defaultClassId)
      setRegex(defaultRegex)
      setValue('')
      setValueMin('')
      setValueMax('')
      setDate('')
      setTestResults([])
      setRegexError(null)
    }
  }, [open, defaultClassId, defaultRegex])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced regex test
  const runTest = useCallback(
    (pattern: string, transactions: Array<{ description: string }>) => {
      if (!pattern) {
        setTestResults([])
        setRegexError(null)
        return
      }
      try {
        const re = new RegExp(pattern, 'i')
        setRegexError(null)
        const results: TestResult[] = transactions.map((tx) => ({
          description: tx.description,
          matches: re.test(tx.description.toUpperCase()),
        }))
        setTestResults(results)
      } catch {
        setRegexError('Invalid regex')
        setTestResults([])
      }
    },
    [],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (recentTxns?.data) {
        runTest(regex, recentTxns.data)
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [regex, recentTxns, runTest])

  function handleSave() {
    if (!classId || !regex) return
    const payload = {
      classId,
      regex,
      value: value || null,
      valueMin: valueMin || null,
      valueMax: valueMax || null,
      date: date || null,
    }
    if (isEdit && ruleId) {
      updateMutation.mutate({ id: ruleId, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const matchCount = testResults.filter((r) => r.matches).length
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Classifier Rule' : 'Add Classifier Rule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select class..." />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {(c as { group?: { name?: string } }).group?.name ?? ''} / {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Regex{' '}
              <span className="text-xs text-muted-foreground">(tested against description.toUpperCase())</span>
            </Label>
            <Input
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="e.g. WOOLWORTHS"
              className={cn(regexError && 'border-[var(--color-deficit)]')}
            />
            {regexError && (
              <p className="text-xs text-[var(--color-deficit)]">{regexError}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="exact"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Value Min</Label>
              <Input
                value={valueMin}
                onChange={(e) => setValueMin(e.target.value)}
                placeholder="min"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Value Max</Label>
              <Input
                value={valueMax}
                onChange={(e) => setValueMax(e.target.value)}
                placeholder="max"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              pattern="\d{4}-\d{2}-\d{2}"
            />
          </div>

          {/* Live regex tester */}
          {testResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Regex matches {matchCount} / {testResults.length} recent transactions
              </p>
              <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                {testResults.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'px-3 py-1.5 text-xs font-mono border-b border-border last:border-0',
                      r.matches ? 'text-[var(--color-surplus)]' : 'text-muted-foreground/50',
                    )}
                  >
                    {r.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!classId || !regex || isSaving}>
            {isSaving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
