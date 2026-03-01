'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ColDef } from '@ag-grid-community/core'
import { AgGridDark } from '@/components/grids/AgGridDark'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'

interface QueuedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  result?: {
    inserted: number
    skipped: number
    classifiedFrom?: string
  }
  error?: string
}

function validateFilename(name: string): string | null {
  // Expected: {source}_{YYYY-MM}.csv
  const match = name.match(/^.+_\d{4}-\d{2}\.csv$/)
  if (!match) {
    return 'Filename must match pattern: {source}_{YYYY-MM}.csv (e.g. bank_2024-01.csv)'
  }
  return null
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function ImportPage() {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: importHistory, refetch: refetchHistory } = trpc.sources.imports.useQuery()

  function addFiles(files: FileList | File[]) {
    const newItems: QueuedFile[] = Array.from(files).map((file) => ({
      id: genId(),
      file,
      status: 'pending' as const,
      error: validateFilename(file.name) ?? undefined,
    }))
    setQueue((prev) => [...prev, ...newItems])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  async function uploadFile(item: QueuedFile): Promise<void> {
    if (item.error) return // skip invalid files

    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q)),
    )

    try {
      const token = localStorage.getItem('accessToken')
      const formData = new FormData()
      formData.append('file', item.file)

      const res = await fetch('/api/v1/imports', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
      }

      const result = await res.json()
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'success', result }
            : q,
        ),
      )
    } catch (err) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
            : q,
        ),
      )
    }
  }

  async function uploadAll() {
    const pending = queue.filter((q) => q.status === 'pending' && !q.error)
    await Promise.allSettled(pending.map(uploadFile))
    refetchHistory()
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => prev.filter((q) => q.id !== id))
  }

  const historyCols: ColDef[] = [
    { field: 'name', headerName: 'File', flex: 1 },
    {
      field: 'createdAt',
      headerName: 'Imported',
      width: 160,
      valueFormatter: (p) => p.value ? new Date(p.value).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '',
    },
  ]

  const pendingCount = queue.filter((q) => q.status === 'pending' && !q.error).length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Import</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Drop CSV files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Files must be named: <span className="font-mono">{'{source}_{YYYY-MM}.csv'}</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Queue ({queue.length})</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQueue([])}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={uploadAll}
                disabled={pendingCount === 0}
              >
                Upload All ({pendingCount})
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono text-foreground flex-1 truncate">
                  {item.file.name}
                </span>

                {item.status === 'uploading' && (
                  <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                )}
                {item.status === 'success' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <CheckCircle className="h-4 w-4 text-[var(--color-surplus)]" />
                    <span className="text-xs text-muted-foreground">
                      {item.result?.inserted} inserted, {item.result?.skipped} skipped
                    </span>
                  </div>
                )}
                {(item.status === 'error' || (item.status === 'pending' && item.error)) && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <XCircle className="h-4 w-4 text-[var(--color-deficit)]" />
                    <span className="text-xs text-[var(--color-deficit)]">{item.error}</span>
                  </div>
                )}
                {item.status === 'pending' && !item.error && (
                  <span className="text-xs text-muted-foreground shrink-0">Ready</span>
                )}

                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label="Remove"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import history */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Import History</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <AgGridDark
            columnDefs={historyCols}
            rowData={importHistory ?? []}
          />
        </div>
      </div>
    </div>
  )
}
