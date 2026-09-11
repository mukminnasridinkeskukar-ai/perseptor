'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { PageHeader, ErrorState } from '../ui-bits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KELOMPOK_KOMPETENSI } from '@/lib/constants'
import { Award, Loader2 } from 'lucide-react'

/** Modul Kompetensi: kamus kompetensi dikelompokkan */
export function KompetensiView() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet('/api/master/kompetensi')
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const r of rows) {
      map[r.kelompok] = map[r.kelompok] || []
      map[r.kelompok].push(r)
    }
    return map
  }, [rows])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Jenis Kompetensi"
        description="Kelompok kompetensi yang menjadi acuan pemetaan kebutuhan, program, dan evaluasi pembimbingan klinik."
      />
      {error ? <ErrorState message={error} /> : loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(grouped).map(([kelompok, items]) => (
            <Card key={kelompok}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-teal-700" />
                  {kelompok}
                  <Badge variant="secondary" className="ml-auto text-[10px]">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {items.map((k) => (
                  <div key={k.id} className="rounded-lg border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">{k.nama}</span>
                      {k.aktif ? null : <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
                    </div>
                    {k.deskripsi && <div className="mt-0.5 text-xs text-muted-foreground">{k.deskripsi}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">Belum ada kompetensi terdaftar.</div>
          )}
        </div>
      )}
    </div>
  )
}
