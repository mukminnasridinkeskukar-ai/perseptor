'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, ErrorState } from '../ui-bits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, FileDown, FileSpreadsheet, Printer } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TIPE = [
  { v: 'pembimbingan', l: 'Laporan Pembimbingan' },
  { v: 'temuan', l: 'Laporan Temuan' },
  { v: 'rtl', l: 'Laporan RTL' },
  { v: 'perseptor', l: 'Laporan Perseptor' },
]

const KOLOM: Record<string, Array<{ key: string; label: string }>> = {
  pembimbingan: [
    { key: 'tanggal', label: 'Tanggal' }, { key: 'puskesmas', label: 'Puskesmas' }, { key: 'kecamatan', label: 'Kecamatan' },
    { key: 'perseptor', label: 'Perseptor' }, { key: 'topik', label: 'Topik' }, { key: 'metode', label: 'Metode' },
    { key: 'status', label: 'Status' }, { key: 'jumlahPeserta', label: 'Peserta' }, { key: 'jumlahTemuan', label: 'Temuan' },
  ],
  temuan: [
    { key: 'tanggal', label: 'Tanggal' }, { key: 'puskesmas', label: 'Puskesmas' }, { key: 'kegiatan', label: 'Kegiatan' },
    { key: 'kategori', label: 'Kategori' }, { key: 'uraian', label: 'Uraian' }, { key: 'tingkatRisiko', label: 'Risiko' },
    { key: 'penanggungJawab', label: 'PJ' }, { key: 'batasWaktu', label: 'Batas Waktu' }, { key: 'status', label: 'Status' },
  ],
  rtl: [
    { key: 'puskesmas', label: 'Puskesmas' }, { key: 'kegiatan', label: 'Kegiatan' }, { key: 'temuanKategori', label: 'Kategori Temuan' },
    { key: 'penanggungJawab', label: 'PJ' }, { key: 'targetSelesai', label: 'Target' }, { key: 'status', label: 'Status' },
    { key: 'verifikasi', label: 'Verifikasi' }, { key: 'keterlambatan', label: 'Terlambat' },
  ],
  perseptor: [
    { key: 'nama', label: 'Nama' }, { key: 'profesi', label: 'Profesi' }, { key: 'jumlahPembimbingan', label: 'Total Kegiatan' },
    { key: 'pembimbinganSelesai', label: 'Selesai' }, { key: 'puskesmasBinaan', label: 'Puskesmas Binaan' },
    { key: 'jumlahPeserta', label: 'Peserta' }, { key: 'jumlahTemuan', label: 'Temuan' },
  ],
}

export function LaporanView() {
  const { user } = useApp()
  const [tipe, setTipe] = useState('pembimbingan')
  const [tahun, setTahun] = useState('2026')
  const [mulai, setMulai] = useState('')
  const [akhir, setAkhir] = useState('')
  const [pkmId, setPkmId] = useState('all')
  const [pkmList, setPkmList] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isDinas(user?.role)) {
      apiGet('/api/master/puskesmas').then((r) => setPkmList(r.data)).catch(() => {})
    }
  }, [user])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ tipe, format: 'json' })
      if (tahun !== 'all') qs.set('tahun', tahun)
      if (mulai) qs.set('tanggalMulai', mulai)
      if (akhir) qs.set('tanggalSelesai', akhir)
      if (pkmId !== 'all') qs.set('puskesmasId', pkmId)
      const res = await apiGet<{ data: any[] }>(`/api/laporan?${qs}`)
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tipe, tahun, mulai, akhir, pkmId])

  useEffect(() => { load() }, [load])

  function downloadCsv() {
    if (!rows.length) return toast({ title: 'Tidak ada data untuk diekspor' })
    window.open(`/api/laporan?tipe=${tipe}&format=csv${tahun !== 'all' ? `&tahun=${tahun}` : ''}${mulai ? `&tanggalMulai=${mulai}` : ''}${akhir ? `&tanggalSelesai=${akhir}` : ''}${pkmId !== 'all' ? `&puskesmasId=${pkmId}` : ''}`, '_blank')
    toast({ title: 'Ekspor CSV dimulai' })
  }

  function exportExcel() {
    if (!rows.length) return toast({ title: 'Tidak ada data untuk diekspor' })
    const kolom = KOLOM[tipe]
    const headers = kolom.map((k) => k.label)
    const rowsXml = rows.map((r) => `<tr>${kolom.map((k) => `<td>${escapeHtml(String(r[k.key] ?? ''))}</td>`).join('')}</tr>`).join('')
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsXml}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    triggerDownload(blob, `laporan_${tipe}.xls`)
    toast({ title: 'Ekspor Excel dimulai' })
  }

  function exportPdf() {
    if (!rows.length) return toast({ title: 'Tidak ada data untuk diekspor' })
    const kolom = KOLOM[tipe]
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>Laporan ${TIPE.find((t) => t.v === tipe)?.l}</title>
      <style>
        body{font-family:sans-serif;padding:24px;font-size:12px}
        h1{font-size:16px;margin:0 0 4px;color:#0f766e;letter-spacing:.2em}
        h2{font-size:14px;margin:0 0 2px}
        p{margin:0 0 12px;color:#666;font-size:11px}
        table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left;vertical-align:top}
        th{background:#f0fdfa;color:#134e4a;font-size:10.5px;text-transform:uppercase}
        @media print{ button{display:none} }
      </style></head><body>
      <h1>PERSEPTOR</h1><h2>${TIPE.find((t) => t.v === tipe)?.l}</h2>
      <p>Dicetak: ${new Date().toLocaleString('id-ID')} • Periode: ${tahun !== 'all' ? tahun : 'Semua'}${mulai ? ` s.d. ${akhir}` : ''}</p>
      <table><thead><tr>${kolom.map((k) => `<th>${k.label}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${kolom.map((k) => `<td>${escapeHtml(String(r[k.key] ?? '-'))}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#0f766e;color:#fff;border:0;border-radius:6px;cursor:pointer">Cetak / Simpan PDF</button>
      </body></html>`)
    w.document.close()
    toast({ title: 'PDF siap dicetak', description: 'Gunakan tombol Cetak lalu pilih "Simpan sebagai PDF".' })
  }

  function printTabel() {
    exportPdf()
  }

  const kolom = KOLOM[tipe]

  return (
    <div className="space-y-4">
      <PageHeader title="Laporan" description="Laporan otomatis dengan filter periode, Puskesmas, profesi, perseptor, dan status. Ekspor ke PDF, Excel, atau CSV." />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filter</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Jenis Laporan</div>
            <Select value={tipe} onValueChange={setTipe}>
              <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPE.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tipe !== 'perseptor' && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Tahun</div>
              <Select value={tahun} onValueChange={setTahun}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {['2024', '2025', '2026', '2027'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {tipe === 'pembimbingan' && (
            <>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Dari</div>
                <Input type="date" className="w-[150px]" value={mulai} onChange={(e) => setMulai(e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Sampai</div>
                <Input type="date" className="w-[150px]" value={akhir} onChange={(e) => setAkhir(e.target.value)} />
              </div>
            </>
          )}
          {isDinas(user?.role) && tipe !== 'perseptor' && pkmList.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Puskesmas</div>
              <Select value={pkmId} onValueChange={setPkmId}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Puskesmas</SelectItem>
                  {pkmList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={exportPdf}><FileDown className="mr-1.5 h-4 w-4" /> PDF / Cetak</Button>
        <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-1.5 h-4 w-4" /> Excel</Button>
        <Button size="sm" variant="outline" onClick={downloadCsv}><FileDown className="mr-1.5 h-4 w-4" /> CSV</Button>
        <Button size="sm" variant="outline" onClick={printTabel}><Printer className="mr-1.5 h-4 w-4" /> Print</Button>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[65vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    {kolom.map((k) => <TableHead key={k.key} className="whitespace-nowrap">{k.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={kolom.length} className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-teal-700" /></TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={kolom.length} className="py-10 text-center text-muted-foreground">Tidak ada data pada filter ini.</TableCell></TableRow>
                  ) : (
                    rows.map((r, i) => (
                      <TableRow key={i}>
                        {kolom.map((k) => (
                          <TableCell key={k.key} className="max-w-[260px] text-xs">
                            {String(r[k.key] ?? '-').length > 120 ? String(r[k.key]).slice(0, 120) + '…' : String(r[k.key] ?? '-')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">{rows.length} baris data</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function triggerDownload(blob: Blob, nama: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nama
  a.click()
  URL.revokeObjectURL(a.href)
}
