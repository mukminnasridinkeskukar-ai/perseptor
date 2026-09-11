'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { PageHeader, ErrorState, ProgressBar } from '../ui-bits'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Search, Loader2, TrendingUp } from 'lucide-react'

/** Modul Tenaga Kesehatan: daftar + profil perkembangan kompetensi */
export function TenagaKesehatanView() {
  const { user } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [pkmList, setPkmList] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [profesi, setProfesi] = useState('all')
  const [pkm, setPkm] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<any>(null)
  const [evalDetail, setEvalDetail] = useState<any[]>([])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (profesi !== 'all') qs.set('profesi', profesi)
    if (pkm !== 'all') qs.set('puskesmasId', pkm)
    apiGet(`/api/master/tenaga-kesehatan?${qs}`)
      .then((r) => setRows(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profesi, pkm])

  useEffect(() => {
    if (user?.role === 'PERSEPTOR' || user?.role === 'ADMIN_DINAS' || user?.role === 'SUPERADMIN') {
      apiGet('/api/master/puskesmas').then((r) => setPkmList(r.data)).catch(() => {})
    }
  }, [user])

  async function openDetail(row: any) {
    setDetail(row)
    try {
      const res = await apiGet<{ data: any[] }>(`/api/evaluasi?tenagaKesehatanId=${row.id}`)
      setEvalDetail(res.data)
    } catch {
      setEvalDetail([])
    }
  }

  const filtered = rows.filter((r) => r.nama.toLowerCase().includes(q.toLowerCase()) || (r.nipNik || '').includes(q))

  return (
    <div className="space-y-4">
      <PageHeader title="Tenaga Kesehatan" description="Data tenaga kesehatan dan perkembangan kompetensi hasil pembimbingan. Klik baris untuk melihat profil kompetensi." />
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama / NIP-NIK..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
        <Select value={profesi} onValueChange={setProfesi}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Profesi</SelectItem>
            {['Dokter', 'Bidan', 'Perawat', 'Nutrisionis', 'Apoteker', 'Analis', 'Sanitarian'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        {pkmList.length > 0 && (
          <Select value={pkm} onValueChange={setPkm}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Puskesmas</SelectItem>
              {pkmList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {error ? <ErrorState message={error} /> : loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5">Nama</th>
                <th className="px-3 py-2.5">Profesi</th>
                <th className="px-3 py-2.5">Jabatan</th>
                <th className="px-3 py-2.5">Puskesmas</th>
                <th className="px-3 py-2.5">Masa Kerja</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-muted-foreground">Tidak ada data.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/60" onClick={() => openDetail(r)}>
                    <td className="px-3 py-2.5 font-medium">{r.nama}</td>
                    <td className="px-3 py-2.5"><Badge variant="outline">{r.profesi}</Badge></td>
                    <td className="px-3 py-2.5">{r.jabatan || '-'}</td>
                    <td className="px-3 py-2.5">{r.puskesmas?.nama || '-'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.masaKerja ? `${r.masaKerja} th` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog profil kompetensi */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-700" /> Profil Kompetensi — {detail?.nama}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                <InfoBox label="Profesi" value={detail.profesi} />
                <InfoBox label="Jabatan" value={detail.jabatan || '-'} />
                <InfoBox label="Puskesmas" value={detail.puskesmas?.nama || '-'} />
                <InfoBox label="NIP/NIK" value={detail.nipNik || '-'} />
                <InfoBox label="Unit Kerja" value={detail.unitKerja || '-'} />
                <InfoBox label="Masa Kerja" value={detail.masaKerja ? `${detail.masaKerja} tahun` : '-'} />
              </div>
              {evalDetail.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada data evaluasi kompetensi.</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {evalDetail.map((g) => {
                      const awal = g.deret[0]?.skor ?? 0
                      const akhir = g.deret[g.deret.length - 1]?.skor ?? 0
                      return (
                        <div key={g.kompetensi} className="rounded-lg border p-3">
                          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold">{g.kompetensi}</div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px]">{g.kelompok}</Badge>
                              <span className={akhir > awal ? 'font-semibold text-emerald-700' : 'font-semibold text-slate-600'}>
                                {awal}/5 → {akhir}/5
                              </span>
                            </div>
                          </div>
                          <ProgressBar value={(akhir / 5) * 100} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="h-64 rounded-lg border p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evalDetail.map((g, gi) => {
                        const row: any = { nama: g.kompetensi.length > 18 ? g.kompetensi.slice(0, 18) + '…' : g.kompetensi }
                        g.deret.forEach((d, i) => { row[`E${i}`] = d.skor })
                        row._gi = gi
                        return row
                      })} margin={{ top: 6, right: 12, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="nama" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                        <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="E0" name="Awal/Ev.1" stroke="#94a3b8" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="E1" name="Evaluasi 2" stroke="#0d9488" strokeWidth={2} dot />
                        <Line type="monotone" dataKey="E2" name="Evaluasi 3" stroke="#f59e0b" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-medium">{value}</div>
    </div>
  )
}
