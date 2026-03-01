import { classifierRepository } from '@/repositories/classifierRepository'
import { classRepository } from '@/repositories/classRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { buildClassifierEngine } from '@/lib/classifierEngine'
import { partitionRules } from '@/domain/classification'
import { formatDate } from '@/domain/transaction'

export const classificationService = {
  /**
   * Re-classifies all transactions from fromDate onwards.
   * Called after import and by the internal cron endpoint.
   */
  async reclassify(fromDate: Date, workspaceId: string): Promise<{ updated: number }> {
    const [rawRules, { debit, credit }] = await Promise.all([
      classifierRepository.findAllRaw(workspaceId),
      classRepository.findUndefinedClasses(workspaceId),
    ])

    const rules = rawRules.map((r) => ({
      id: r.id,
      classId: r.classId,
      regex: r.regex,
      value: r.value?.toFixed(2) ?? null,
      valueMin: r.valueMin?.toFixed(2) ?? null,
      valueMax: r.valueMax?.toFixed(2) ?? null,
      date: r.date ?? null,
    }))

    const engine = buildClassifierEngine(rules)

    const transactions = await transactionRepository.findForClassification(fromDate, workspaceId)

    const updates: Array<{ id: string; classId: string }> = []

    for (const tx of transactions) {
      const dateStr = formatDate(tx.date)
      const amount = parseFloat(tx.amount.toString())
      const result = engine.classify(tx.description, amount, dateStr, debit.id, credit.id)
      updates.push({ id: tx.id, classId: result.classId })
    }

    if (updates.length > 0) {
      await transactionRepository.updateManyClasses(updates)
    }

    return { updated: updates.length }
  },
}
