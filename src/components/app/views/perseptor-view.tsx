'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { PageHeader, ErrorState } from '../ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Users, Loader2 } from 'lucide-react'

/** Modul Perseptor: daftar pembimbing + Puskesmas binaan */
export function PerseptorView() {
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet('/api/master/perseptor')
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = rows.filter((r) =>
    [r.nama, r.profesi, r.unitKerja, r.areaKeahlian].some((v) => (v || '').toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Perseptor / Pembimbing" description="Daftar perseptor beserta kompetensi, keahlian, dan Puskesmas binaan." />
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama, profesi, keahlian..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>
      {error ? <ErrorState message={error} /> : loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">Tidak ada perseptor ditemukan.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                      {p.nama.split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight">{p.nama}</div>
                      <div className="text-xs text-muted-foreground">{p.jabatan || '-'}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{p.profesi}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">Unit:</span> {p.unitKerja || '-'}</div>
                  <div><span className="font-medium text-foreground">STR/SIP:</span> {p.nomorSTR || '-'} / {p.nomorSIP || '-'}</div>
                  {p.areaKeahlian && <div><span className="font-medium text-foreground">Keahlian:</span> {p.areaKeahlian}</div>}
                  {p.sertifikat && <div><span className="font-medium text-foreground">Sertifikat:</span> {p.sertifikat}</div>}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <Users className="h-3 w-3" /> Puskesmas Binaan
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.penugasan?.length ? (
                      p.penugasan.map((t: any) => (
                        <Badge key={t.id} variant="secondary" className="text-[11px]">{t.puskesmas.nama.replace('Puskesmas ', '')}</Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum ada penugasan</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Total jadwal pembimbingan</span>
                  <span className="font-bold tabular-nums">{p._count?.jadwal ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
