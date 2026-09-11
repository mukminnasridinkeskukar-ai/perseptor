'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, ErrorState } from '../ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

/** Modul Puskesmas: kartu profil + statistik ringkas per Puskesmas */
export function PuskesmasView() {
  const { user } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashMap, setDashMap] = useState<Record<string, any>>({})

  useEffect(() => {
    apiGet('/api/master/puskesmas')
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!rows.length || !isDinas(user?.role)) return
    rows.forEach((p) => {
      apiGet(`/api/dashboard?mode=puskesmas&puskesmasId=${p.id}`)
        .then((r) => setDashMap((m) => ({ ...m, [p.id]: r.puskesmas })))
        .catch(() => {})
    })
  }, [rows, user?.role])

  if (error) return (
    <div className="space-y-4">
      <PageHeader title="Puskesmas" />
      <ErrorState message={error} />
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader title="Puskesmas" description="Jaringan Puskesmas dengan ringkasan pembimbingan, temuan, RTL, dan kompetensi." />
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const d = dashMap[p.id]
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold leading-tight">{p.nama}</div>
                      <div className="text-xs text-muted-foreground">Kec. {p.kecamatan} • {p.kode}</div>
                    </div>
                    <Badge variant={p.status === 'AKTIF' ? 'default' : 'secondary'} className={p.status === 'AKTIF' ? 'bg-teal-700' : ''}>{p.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}</Badge>
                  </div>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <div>Kepala: <span className="font-medium text-foreground">{p.kepalaPuskesmas || '-'}</span></div>
                    <div>{p.telepon || '-'} • {p.email || '-'}</div>
                  </div>
                  {d ? (
                    <div className="grid grid-cols-4 gap-1.5 border-t pt-2 text-center">
                      <Mini label="Jadwal" value={d.pembimbingan.terjadwal} tone="text-teal-700" />
                      <Mini label="Selesai" value={d.pembimbingan.selesai} tone="text-emerald-700" />
                      <Mini label="Temuan" value={d.temuan.total} tone="text-amber-700" />
                      <Mini label="RTL" value={d.rtl.aktif + d.rtl.selesai} tone="text-slate-700" />
                    </div>
                  ) : (
                    <div className="border-t pt-2 text-xs text-muted-foreground">{isDinas(user?.role) ? 'Memuat statistik...' : 'Statistik tersedia untuk dinas'}</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
