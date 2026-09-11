'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { PageHeader, ErrorState } from '../ui-bits'
import { DataTable } from '../data-table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

export function AuditView() {
  const { user } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data: any[] }>('/api/audit-log?limit=300')
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Trail"
        description="Catatan aktivitas penting: siapa, melakukan apa, kapan, beserta data sebelum dan sesudah perubahan."
      />
      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          data={rows}
          loading={loading}
          pageSize={15}
          searchKeys={['userName', 'deskripsi', 'entitas', 'aksi']}
          columns={[
            { key: 'createdAt', header: 'Waktu', render: (r) => new Date(r.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
            { key: 'userName', header: 'Pengguna', render: (r) => <span className="font-medium">{r.userName || 'Sistem'}</span> },
            { key: 'aksi', header: 'Aksi', render: (r) => <Badge variant="outline" className={
              r.aksi === 'DELETE' ? 'border-rose-200 bg-rose-50 text-rose-700' :
              r.aksi === 'CREATE' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
              r.aksi === 'LOGIN' || r.aksi === 'LOGOUT' ? 'border-slate-200 bg-slate-50 text-slate-600' :
              'border-teal-200 bg-teal-50 text-teal-700'
            }>{r.aksi}</Badge> },
            { key: 'entitas', header: 'Entitas', render: (r) => <span className="font-mono text-xs">{r.entitas}</span> },
            { key: 'deskripsi', header: 'Deskripsi', render: (r) => <span className="line-clamp-2 max-w-md text-xs">{r.deskripsi || '-'}</span> },
            {
              key: '_detail', header: 'Perubahan', className: 'text-right',
              render: (r) => (r.dataSebelum || r.dataSesudah) ? (
                <button className="text-xs font-medium text-teal-700 hover:underline" onClick={() => setDetail(r)}>Lihat</button>
              ) : <span className="text-xs text-muted-foreground">—</span>,
            },
          ]}
        />
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Detail Perubahan</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {new Date(detail.createdAt).toLocaleString('id-ID')} • {detail.userName} • {detail.aksi} {detail.entitas}
              </div>
              <p>{detail.deskripsi}</p>
              {detail.dataSebelum && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Data Sebelum</div>
                  <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed">{JSON.stringify(JSON.parse(detail.dataSebelum), null, 2)}</pre>
                </div>
              )}
              {detail.dataSesudah && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-muted-foreground">Data Sesudah</div>
                  <pre className="max-h-48 overflow-auto rounded-lg bg-teal-50 p-3 text-[11px] leading-relaxed">{JSON.stringify(JSON.parse(detail.dataSesudah), null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
