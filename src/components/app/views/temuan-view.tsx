'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPatch } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, BadgeStatus, ErrorState } from '../ui-bits'
import { DataTable } from '../data-table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KATEGORI_TEMUAN, RISIKO_COLOR, RISIKO_LABEL, tanggalSingkat } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { Loader2, Repeat } from 'lucide-react'

export function TemuanView() {
  const { user, go } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fKat, setFKat] = useState('all')
  const [fRisiko, setFRisiko] = useState('all')
  const [fStatus, setFStatus] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (fKat !== 'all') qs.set('kategori', fKat)
      if (fRisiko !== 'all') qs.set('tingkatRisiko', fRisiko)
      if (fStatus !== 'all') qs.set('status', fStatus)
      const res = await apiGet<{ data: any[] }>(`/api/temuan?${qs}`)
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fKat, fRisiko, fStatus])

  useEffect(() => { load() }, [load])

  async function tutupTemuan(t: any, status: string) {
    try {
      await apiPatch(`/api/jadwal/${t.jadwalId}/temuan`, { id: t.id, status })
      toast({ title: 'Status temuan diperbarui' })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Temuan Pembimbingan"
        description="Seluruh temuan hasil pembimbingan beserta tingkat risiko, bukti, dan tautan tindak lanjut."
      />
      <div className="flex flex-wrap gap-2">
        <Select value={fKat} onValueChange={setFKat}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {KATEGORI_TEMUAN.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fRisiko} onValueChange={setFRisiko}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Risiko</SelectItem>
            {Object.entries(RISIKO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="TERBUKA">Terbuka</SelectItem>
            <SelectItem value="SELESAI">Selesai</SelectItem>
            <SelectItem value="DITUTUP">Ditutup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          data={rows}
          loading={loading}
          searchKeys={['uraian', 'kategori']}
          columns={[
            { key: 'tanggal', header: 'Tanggal', render: (r) => tanggalSingkat(r.jadwal?.tanggal) },
            { key: 'puskesmas', header: 'Puskesmas', render: (r) => r.jadwal?.puskesmas?.nama || '-' },
            { key: 'kegiatan', header: 'Kegiatan', render: (r) => (
              <button className="max-w-[220px] truncate text-left text-teal-700 hover:underline" onClick={() => go('pembimbingan-detail', { id: r.jadwalId })}>{r.jadwal?.topik || '-'}</button>
            ) },
            { key: 'kategori', header: 'Kategori', render: (r) => <BadgeStatus label={r.kategori} className="bg-slate-100 text-slate-700 border-slate-200" /> },
            { key: 'uraian', header: 'Uraian', render: (r) => <span className="line-clamp-2 max-w-sm text-xs">{r.uraian}</span> },
            { key: 'tingkatRisiko', header: 'Risiko', render: (r) => <BadgeStatus label={RISIKO_LABEL[r.tingkatRisiko]} className={RISIKO_COLOR[r.tingkatRisiko]} /> },
            { key: 'rtl', header: 'RTL', render: (r) => r.rtl?.length ? (
              <button className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline" onClick={() => go('tindak-lanjut')}>
                <Repeat className="h-3 w-3" /> {r.rtl.length} RTL
              </button>
            ) : <span className="text-xs text-muted-foreground">Belum ada</span> },
            { key: 'status', header: 'Status', render: (r) => (
              isDinas(user?.role) || user?.role === 'PERSEPTOR' ? (
                <Select value={r.status} onValueChange={(v) => tutupTemuan(r, v)}>
                  <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TERBUKA">Terbuka</SelectItem>
                    <SelectItem value="SELESAI">Selesai</SelectItem>
                    <SelectItem value="DITUTUP">Ditutup</SelectItem>
                  </SelectContent>
                </Select>
              ) : <BadgeStatus label={r.status} className="bg-sky-100 text-sky-700 border-sky-200" />
            ) },
          ]}
        />
      )}
    </div>
  )
}
