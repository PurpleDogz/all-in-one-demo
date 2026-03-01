import crypto from 'crypto'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Parses a date string from DD/MM/YYYY to a Date object (UTC midnight).
 */
export function parseCsvDate(raw: string): Date {
  const [day, month, year] = raw.trim().split('/')
  if (!day || !month || !year) throw new Error(`Invalid date format: ${raw}`)
  return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)))
}

/**
 * Formats a Date to YYYY-MM-DD string (for classifier date matching).
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Parses a CSV amount string to a Decimal rounded to 2dp.
 * Never stores raw floats.
 */
export function parseCsvAmount(raw: string): Decimal {
  const trimmed = raw.trim()
  const num = parseFloat(trimmed)
  if (isNaN(num)) throw new Error(`Invalid amount: ${raw}`)
  return new Decimal(num.toFixed(2))
}

/**
 * Strips single quotes from a description string.
 */
export function normaliseDescription(raw: string): string {
  return raw.trim().replace(/'/g, '')
}

/**
 * Dedup key for a transaction: date + description + amount + sourceId.
 * Returned as a composite string for set membership checks.
 */
export function transactionDedupKey(
  date: Date,
  description: string,
  amount: Decimal,
  sourceId: string,
): string {
  return `${formatDate(date)}::${description}::${amount.toFixed(2)}::${sourceId}`
}

/**
 * Computes MD5 hash of raw file content (Buffer or string).
 */
export function fileHash(content: Buffer | string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Extracts the source name from a CSV filename.
 * E.g. "ANZ_2024-01.csv" → "ANZ"
 * Throws if the filename doesn't contain an underscore.
 */
export function sourceNameFromFilename(filename: string): string {
  const base = filename.replace(/\.csv$/i, '')
  const underscoreIdx = base.indexOf('_')
  if (underscoreIdx === -1) throw new Error(`Filename must follow {source}_{YYYY-MM}.csv format: ${filename}`)
  const name = base.slice(0, underscoreIdx)
  if (!name) throw new Error(`Source name cannot be empty in filename: ${filename}`)
  return name
}

/**
 * Validates that a CSV filename follows {source}_{YYYY-MM}.csv pattern.
 */
export function validateCsvFilename(filename: string): boolean {
  return /^[^_]+_\d{4}-\d{2}\.csv$/i.test(filename)
}
