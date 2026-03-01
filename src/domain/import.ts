import { parse } from 'csv-parse/sync'
import { parseCsvDate, parseCsvAmount, normaliseDescription, formatDate } from './transaction'
import { Decimal } from '@prisma/client/runtime/library'

export interface ParsedRow {
  date: Date
  dateStr: string
  amount: Decimal
  description: string
}

export interface ParsedCsvResult {
  rows: ParsedRow[]
  parseErrors: string[]
}

/**
 * Parses a CSV buffer into structured rows.
 * Rows with fewer than 3 columns are silently skipped.
 * Format: Date (DD/MM/YYYY), Amount (float string), Description
 */
export function parseCsvBuffer(buffer: Buffer): ParsedCsvResult {
  const rows: ParsedRow[] = []
  const parseErrors: string[] = []

  const raw: string[][] = parse(buffer, {
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  })

  for (let i = 0; i < raw.length; i++) {
    const cols = raw[i]

    if (!cols || cols.length < 3) continue

    const [dateStr, amountStr, descStr] = cols

    try {
      const date = parseCsvDate(dateStr)
      const amount = parseCsvAmount(amountStr)
      const description = normaliseDescription(descStr)
      rows.push({ date, dateStr: formatDate(date), amount, description })
    } catch (e) {
      parseErrors.push(`Row ${i + 1}: ${(e as Error).message}`)
    }
  }

  return { rows, parseErrors }
}
