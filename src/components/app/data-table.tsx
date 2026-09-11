'use client'

import { useState, useMemo, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
  sortable?: boolean
}

export function DataTable<T extends { id: string }>({
  data, columns, searchKeys, onRowClick, pageSize = 10, toolbar, loading, emptyText = 'Belum ada data.',
}: {
  data: T[]
  columns: Column<T>[]
  searchKeys?: string[]
  onRowClick?: (row: T) => void
  pageSize?: number
  toolbar?: ReactNode
  loading?: boolean
  emptyText?: string
}) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!q || !searchKeys?.length) return data
    const lower = q.toLowerCase()
    return data.filter((row) => searchKeys.some((k) => String((row as any)[k] ?? '').toLowerCase().includes(lower)))
  }, [data, q, searchKeys])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="space-y-3">
      {(searchKeys?.length || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {searchKeys?.length ? (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} className="pl-8" />
            </div>
          ) : <div />}
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {columns.map((c) => (
                <th key={c.key} className={`whitespace-nowrap px-3 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground ${c.className || ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2.5">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">{emptyText}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-muted/60' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className || ''}`}>
                      {c.render ? c.render(row) : String((row as any)[c.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Menampilkan {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} dari {filtered.length} data
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium">{safePage} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
