import { fileHash, sourceNameFromFilename, validateCsvFilename, transactionDedupKey } from '@/domain/transaction'
import { parseCsvBuffer } from '@/domain/import'
import { sourceRepository, sourceFileRepository } from '@/repositories/sourceRepository'
import { transactionRepository } from '@/repositories/transactionRepository'
import { classificationService } from './classificationService'
import { ConflictError, ValidationError } from '@/lib/errors'

export interface ImportResult {
  inserted: number
  skipped: number
  sourceId: string
  sourceFileId: string
  classifiedFrom?: string
}

export const importService = {
  async processUpload(
    filename: string,
    buffer: Buffer,
    workspaceId: string,
  ): Promise<ImportResult> {
    if (!validateCsvFilename(filename)) {
      throw new ValidationError(
        `Invalid filename format. Expected {source}_{YYYY-MM}.csv, got: ${filename}`,
      )
    }

    const hash = fileHash(buffer)
    const sourceName = sourceNameFromFilename(filename)

    // Check for existing file record
    const existingFile = await sourceFileRepository.findByNameAndWorkspace(filename, workspaceId)
    if (existingFile && existingFile.dataHash === hash) {
      throw new ConflictError(`File '${filename}' has already been imported (same content hash).`)
    }

    // Resolve or create source
    const source = await sourceRepository.findOrCreate(sourceName, workspaceId)

    // Parse CSV
    const { rows, parseErrors } = parseCsvBuffer(buffer)

    if (rows.length === 0 && parseErrors.length > 0) {
      throw new ValidationError(`CSV parse failed: ${parseErrors.join('; ')}`)
    }

    // Dedup and insert
    let inserted = 0
    let skipped = 0
    let earliestDate: Date | null = null

    for (const row of rows) {
      const isDuplicate = await transactionRepository.checkDuplicate(
        row.date,
        row.description,
        row.amount,
        source.id,
      )

      if (isDuplicate) {
        skipped++
        continue
      }

      await transactionRepository.insertMany([
        {
          date: row.date,
          description: row.description,
          amount: row.amount,
          sourceId: source.id,
        },
      ])

      if (!earliestDate || row.date < earliestDate) {
        earliestDate = row.date
      }

      inserted++
    }

    // Upsert source file record
    const sourceFile = await sourceFileRepository.upsert({
      name: filename,
      workspaceId,
      dataHash: hash,
    })

    // Trigger reclassification from earliest inserted date
    if (inserted > 0 && earliestDate) {
      await classificationService.reclassify(earliestDate, workspaceId)
    }

    return {
      inserted,
      skipped,
      sourceId: source.id,
      sourceFileId: sourceFile.id,
      classifiedFrom: earliestDate?.toISOString().slice(0, 10),
    }
  },
}
