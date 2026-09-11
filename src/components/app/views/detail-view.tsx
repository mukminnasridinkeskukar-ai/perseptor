'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiUpload } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { BadgeStatus, ErrorState, InfoRow } from '../ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { SKALA_PENILAIAN, STATUS_JADWAL, STATUS_JADWAL_COLOR, STATUS_JADWAL_LABEL, KATEGORI_TEMUAN, JENIS_DOKUMEN, JENIS_DOKUMEN_LABEL, METODE_PEMBIMBINGAN, RISIKO_COLOR, RISIKO_LABEL, tanggalID, tanggalSingkat } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  ArrowLeft, Loader2, MoreVertical, Pencil, Trash2, Plus, Printer, FileText, Copy, QrCode,
  Users, ClipboardCheck, Eye, MessageSquare, AlertTriangle, Lightbulb, Repeat, FolderOpen,
  CheckCircle2, ThumbsUp, RotateCcw, Upload, Download,
} from 'lucide-react'

export function DetailView({ id }: { id?: string }) {
  const { user, go } = useApp()
  const [data, setData] = useState<any>(null)
  const [kompList, setKompList] = useState<any[]>([])
  const [evaluasi, setEvaluasi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('ringkasan')

  const load = useCallback(async () => {
    if (!id) return
    if (!data) setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data: any; kompetensiList: any[]; evaluasi: any[] }>(`/api/jadwal/${id}`)
      setData(res.data)
      setKompList(res.kompetensiList)
      setEvaluasi(res.evaluasi)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id, data])

  useEffect(() => { load() }, [load])

  if (loading && !data) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-700" /></div>
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  const j = data
  const dinas = isDinas(user?.role)
  const isPerseptorKegiatan = user?.role === 'PERSEPTOR' && j.perseptorId === user?.perseptorId
  const isAdminPkm = user?.role === 'ADMIN_PUSKESMAS' && j.puskesmasId === user?.puskesmasId
  const bolehInput = isPerseptorKegiatan || dinas

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => go('jadwal')}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke Jadwal
      </Button>

      {/* Kop detail */}
      <Card className="overflow-hidden py-0">
        <div className="bg-gradient-to-r from-teal-800 to-teal-600 px-5 py-4 text-white">
          <div className="text-[11px] font-bold tracking-[0.25em] text-teal-200">PERSEPTOR</div>
          <div className="text-xs text-teal-100">Pembimbingan Klinik Terintegrasi</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{j.topik}</h1>
            <BadgeStatus label={STATUS_JADWAL_LABEL[j.status]} className={STATUS_JADWAL_COLOR[j.status]} />
          </div>
        </div>
        <CardContent className="grid gap-x-6 gap-y-0 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Puskesmas" value={j.puskesmas.nama} />
          <InfoRow label="Perseptor" value={j.perseptor.nama} />
          <InfoRow label="Tanggal" value={tanggalID(j.tanggal)} />
          <InfoRow label="Waktu" value={`${j.waktuMulai} – ${j.waktuSelesai} WIB`} />
          <InfoRow label="Program" value={j.program?.nama || '—'} />
          <InfoRow label="Metode" value={j.metode || '—'} />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          {[
            ['ringkasan', 'Ringkasan'], ['peserta', 'Peserta'], ['instrumen', 'Instrumen'], ['observasi', 'Observasi'],
            ['kasus', 'Kasus'], ['temuan', 'Temuan'], ['rekomendasi', 'Rekomendasi'], ['rtl', 'RTL'], ['dokumentasi', 'Dokumentasi'],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="text-xs">{l}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ringkasan"><TabRingkasan j={j} bolehInput={bolehInput} dinas={dinas} isAdminPkm={isAdminPkm} reload={load} /></TabsContent>
        <TabsContent value="peserta"><TabPeserta j={j} isAdminPkm={isAdminPkm} dinas={dinas} reload={load} /></TabsContent>
        <TabsContent value="instrumen"><TabInstrumen j={j} bolehInput={bolehInput} reload={load} /></TabsContent>
        <TabsContent value="observasi"><TabObservasi j={j} bolehInput={bolehInput} reload={load} /></TabsContent>
        <TabsContent value="kasus"><TabKasus j={j} bolehInput={bolehInput} reload={load} /></TabsContent>
        <TabsContent value="temuan"><TabTemuan j={j} bolehInput={bolehInput} reload={load} /></TabsContent>
        <TabsContent value="rekomendasi"><TabRekomendasi j={j} bolehInput={bolehInput} reload={load} /></TabsContent>
        <TabsContent value="rtl"><TabRtl j={j} bolehInput={bolehInput} isAdminPkm={isAdminPkm} dinas={dinas} isPerseptorKegiatan={isPerseptorKegiatan} reload={load} /></TabsContent>
        <TabsContent value="dokumentasi"><TabDokumentasi j={j} bolehInput={bolehInput || isAdminPkm} reload={load} /></TabsContent>
      </Tabs>
    </div>
  )
}

/* ================= RINGKASAN ================= */
function TabRingkasan({ j, bolehInput, dinas, isAdminPkm, reload }: any) {
  const [baOpen, setBaOpen] = useState(false)
  const [baData, setBaData] = useState<any>(null)
  const [baKonten, setBaKonten] = useState<any>({})
  const [qrUrl, setQrUrl] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)

  async function openBA() {
    try {
      const res = await apiGet(`/api/jadwal/${j.id}/berita-acara`)
      setBaData({ ...res.data, beritaAcara: j.beritaAcara })
      const tersimpan = j.beritaAcara?.konten ? JSON.parse(j.beritaAcara.konten) : {}
      setBaKonten({
        hasil: tersimpan.hasil || (j.penilaian.length ? `Rata-rata capaian penilaian ${(j.penilaian.reduce((a: any, p: any) => a + (p.skor || 0), 0) / j.penilaian.filter((p: any) => p.skor).length).toFixed(1)}/5 dari ${j.penilaian.filter((p: any) => p.skor).length} aspek yang dinilai.` : ''),
        temuan: tersimpan.temuan || (j.temuan.length ? j.temuan.map((t: any) => `[${t.kategori}/${t.tingkatRisiko}] ${t.uraian}`).join('\n') : ''),
        rekomendasi: tersimpan.rekomendasi || (j.rekomendasi.length ? j.rekomendasi.map((r: any) => r.rekomendasi).join('\n') : ''),
        tindakLanjut: tersimpan.tindakLanjut || '',
      })
      setBaOpen(true)
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    if (j.qrToken) {
      QRCode.toDataURL(`${window.location.origin}/?jadwal=${j.qrToken}`, { width: 160, margin: 1, color: { dark: '#0f766e', light: '#ffffff' } })
        .then(setQrUrl)
        .catch(() => {})
    }
  }, [j.qrToken])

  async function changeStatus(status: string) {
    setStatusBusy(true)
    try {
      await apiPatch(`/api/jadwal/${j.id}/status`, { status })
      toast({ title: 'Status diperbarui', description: STATUS_JADWAL_LABEL[status] })
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setStatusBusy(false)
    }
  }

  const rataSkor = useMemo(() => {
    const scored = (j.penilaian || []).filter((p: any) => p.skor)
    if (!scored.length) return null
    return (scored.reduce((a: any, p: any) => a + p.skor, 0) / scored.length).toFixed(2)
  }, [j.penilaian])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Identitas Kegiatan</CardTitle></CardHeader>
        <CardContent className="grid gap-x-6 sm:grid-cols-2">
          <InfoRow label="Puskesmas" value={j.puskesmas.nama} />
          <InfoRow label="Kecamatan" value={j.puskesmas.kecamatan} />
          <InfoRow label="Perseptor" value={`${j.perseptor.nama} (${j.perseptor.profesi})`} />
          <InfoRow label="Tanggal" value={tanggalID(j.tanggal)} />
          <InfoRow label="Peserta" value={`${j.peserta.length} tenaga kesehatan`} />
          <InfoRow label="Topik" value={j.topik} />
          {j.tujuan && <InfoRow label="Tujuan" value={j.tujuan} />}
          {j.catatan && <InfoRow label="Catatan" value={j.catatan} />}
          <InfoRow label="Rata-rata Penilaian" value={rataSkor ? `${rataSkor} / 5` : 'Belum ada skor'} />
          <InfoRow label="Jumlah Temuan" value={`${j.temuan.length} temuan`} />
          <InfoRow label="Jumlah Kasus" value={`${j.kasus.length} kasus`} />
          <InfoRow label="Instrumen Terisi" value={`${j.penilaian.length} aspek`} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Aksi Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(bolehInput || isAdminPkm) ? (
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_JADWAL.filter((s) => s !== j.status).map((s) => (
                  <Button key={s} variant={s === 'SELESAI' ? 'default' : 'outline'} size="sm" className={cn('h-8 text-xs', s === 'SELESAI' && 'bg-emerald-600 hover:bg-emerald-700')} disabled={statusBusy} onClick={() => changeStatus(s)}>
                    {STATUS_JADWAL_LABEL[s]}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Hanya perseptor / admin yang dapat mengubah status.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-4 w-4" /> QR Kegiatan</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            {qrUrl ? <img src={qrUrl} alt={`QR kegiatan ${j.topik}`} className="h-24 w-24 rounded-lg border" /> : <div className="h-24 w-24 animate-pulse rounded-lg bg-muted" />}
            <div className="min-w-0 text-xs">
              <div className="mb-1 text-muted-foreground">Token kegiatan:</div>
              <div className="break-all font-mono text-[11px]">{j.qrToken}</div>
              <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => { navigator.clipboard.writeText(j.qrToken); toast({ title: 'Token disalin' }) }}>
                <Copy className="mr-1 h-3 w-3" /> Salin Token
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Berita Acara</CardTitle></CardHeader>
          <CardContent>
            {j.beritaAcara ? (
              <div className="space-y-2 text-xs">
                <div className="font-mono">{j.beritaAcara.nomor}</div>
                <Button size="sm" variant="outline" className="w-full" onClick={openBA}><Eye className="mr-1.5 h-3.5 w-3.5" /> Preview / Edit / Cetak</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={openBA}><FileText className="mr-1.5 h-3.5 w-3.5" /> Buat Berita Acara</Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Berita Acara */}
      <Dialog open={baOpen} onOpenChange={setBaOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Berita Acara Pembimbingan</DialogTitle></DialogHeader>
          {baData && (
            <div className="space-y-3">
              <div className="rounded-lg border p-4 text-sm leading-relaxed" id="ba-preview">
                <div className="text-center">
                  <div className="text-[10px] font-bold tracking-[0.3em] text-teal-700">PERSEPTOR</div>
                  <div className="text-[10px] text-muted-foreground">{baData.pengaturan?.nama_dinas}</div>
                  <div className="mt-2 font-bold underline">BERITA ACARA PEMBIMBINGAN KLINIK</div>
                  <div className="text-xs">Nomor: {baData.beritaAcara?.nomor || '(akan dibuat otomatis)'}</div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p>Pada hari ini, <b>{tanggalID(j.tanggal)}</b>, telah dilaksanakan kegiatan pembimbingan klinik:</p>
                  <div className="ml-4 space-y-0.5">
                    <div>Puskesmas : <b>{j.puskesmas.nama}</b></div>
                    <div>Perseptor : <b>{j.perseptor.nama}</b></div>
                    <div>Topik : <b>{j.topik}</b></div>
                    <div>Metode : {j.metode || '—'}</div>
                    <div>Waktu : {j.waktuMulai} – {j.waktuSelesai} WIB</div>
                  </div>
                  <div className="mt-2">
                    <b>Peserta:</b>
                    <ol className="ml-6 list-decimal">
                      {j.peserta.map((p: any) => <li key={p.id}>{p.tenagaKesehatan.nama} — {p.tenagaKesehatan.profesi} {p.hadir ? '' : '(belum dikonfirmasi hadir)'}</li>)}
                    </ol>
                  </div>
                  <div className="mt-2">
                    <b>Hasil:</b>
                    <p className="whitespace-pre-wrap">{baKonten.hasil || '—'}</p>
                  </div>
                  <div className="mt-1">
                    <b>Temuan:</b>
                    <p className="whitespace-pre-wrap">{baKonten.temuan || '—'}</p>
                  </div>
                  <div className="mt-1">
                    <b>Rekomendasi:</b>
                    <p className="whitespace-pre-wrap">{baKonten.rekomendasi || '—'}</p>
                  </div>
                  <div className="mt-1">
                    <b>Rencana Tindak Lanjut:</b>
                    <p className="whitespace-pre-wrap">{baKonten.tindakLanjut || '—'}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-between text-xs">
                  <div className="text-center">
                    <div>Peserta/Puskesmas</div>
                    <div className="mt-10 border-t px-8 pt-1">(……………)</div>
                  </div>
                  <div className="text-center">
                    <div>Perseptor</div>
                    <div className="mt-10 border-t px-8 pt-1">{j.perseptor.nama}</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Hasil</Label>
                  <Textarea rows={2} className="mt-1 text-xs" value={baKonten.hasil} onChange={(e) => setBaKonten({ ...baKonten, hasil: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Temuan</Label>
                  <Textarea rows={2} className="mt-1 text-xs" value={baKonten.temuan} onChange={(e) => setBaKonten({ ...baKonten, temuan: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Rekomendasi</Label>
                  <Textarea rows={2} className="mt-1 text-xs" value={baKonten.rekomendasi} onChange={(e) => setBaKonten({ ...baKonten, rekomendasi: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Tindak Lanjut</Label>
                  <Textarea rows={2} className="mt-1 text-xs" value={baKonten.tindakLanjut} onChange={(e) => setBaKonten({ ...baKonten, tindakLanjut: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" /> Cetak</Button>
            <Button
              className="bg-teal-700 hover:bg-teal-800"
              onClick={async () => {
                try {
                  await apiPost(`/api/jadwal/${j.id}/berita-acara`, { konten: baKonten })
                  toast({ title: 'Berhasil', description: 'Berita acara tersimpan & di-generate.' })
                  setBaOpen(false)
                  await reload()
                } catch (e: any) {
                  toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
                }
              }}
            >
              Simpan & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ================= PESERTA ================= */
function TabPeserta({ j, isAdminPkm, dinas, reload }: any) {
  const [tkList, setTkList] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiGet(`/api/master/tenaga-kesehatan?puskesmasId=${j.puskesmasId}`).then((r) => setTkList(r.data)).catch(() => {})
  }, [j.puskesmasId])

  async function toggleHadir(p: any) {
    try {
      await apiPatch(`/api/jadwal/${j.id}/peserta`, { pesertaId: p.id, hadir: !p.hadir })
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  async function savePeserta() {
    setSaving(true)
    try {
      await apiPut(`/api/jadwal/${j.id}/peserta`, { peserta: selected.map((id) => ({ tenagaKesehatanId: id })) })
      toast({ title: 'Berhasil', description: 'Daftar peserta diperbarui.' })
      setEditing(false)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Peserta Pembimbingan ({j.peserta.length})</CardTitle>
        {(isAdminPkm || dinas) && (
          <Button size="sm" variant="outline" onClick={() => { setSelected(j.peserta.map((p: any) => p.tenagaKesehatanId)); setEditing(true) }}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Ubah Peserta
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5">
        {j.peserta.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada peserta.</div>}
        {j.peserta.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
            <div>
              <div className="text-sm font-medium">{p.tenagaKesehatan.nama}</div>
              <div className="text-xs text-muted-foreground">{p.tenagaKesehatan.profesi} • {p.tenagaKesehatan.jabatan || '-'}</div>
            </div>
            <div className="flex items-center gap-2">
              {p.hadir ? (
                <BadgeStatus label="Hadir" className="bg-emerald-100 text-emerald-700 border-emerald-200" />
              ) : (
                <BadgeStatus label="Belum Hadir" className="bg-slate-100 text-slate-600 border-slate-200" />
              )}
              {isAdminPkm && ['BERLANGSUNG', 'SELESAI'].includes(j.status) && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleHadir(p)}>{p.hadir ? 'Batalkan' : 'Tandai Hadir'}</Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Pilih Peserta</DialogTitle></DialogHeader>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {tkList.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                <Checkbox checked={selected.includes(t.id)} onCheckedChange={(c) => setSelected(c ? [...selected, t.id] : selected.filter((x) => x !== t.id))} />
                <span className="text-xs font-medium">{t.nama}</span>
                <span className="text-xs text-muted-foreground">({t.profesi})</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={savePeserta} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ================= INSTRUMEN ================= */
function TabInstrumen({ j, bolehInput, reload }: any) {
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<any>(null)
  const [form, setForm] = useState<any>({})

  function openCreate() {
    setEditing(null)
    setForm({ kategori: 'PERSIAPAN', aspek: '', tenagaKesehatanId: 'NONE', skor: 3, catatan: '' })
    setDialog(true)
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({ kategori: p.kategori, aspek: p.aspek, tenagaKesehatanId: p.tenagaKesehatanId || 'NONE', skor: p.skor || 3, catatan: p.catatan || '' })
    setDialog(true)
  }

  async function save() {
    if (!form.aspek) return toast({ title: 'Aspek wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      const payload = { ...form, tenagaKesehatanId: form.tenagaKesehatanId === 'NONE' ? '' : form.tenagaKesehatanId }
      if (editing) await apiPatch(`/api/jadwal/${j.id}/penilaian`, { ...payload, id: editing.id })
      else await apiPost(`/api/jadwal/${j.id}/penilaian`, payload)
      toast({ title: 'Berhasil', description: 'Instrumen tersimpan.' })
      setDialog(false)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/jadwal/${j.id}/penilaian?penilaianId=${deleting.id}`)
      setDeleting(null)
      await reload()
      toast({ title: 'Berhasil', description: 'Penilaian dihapus.' })
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  const byKategori = (kat: string) => j.penilaian.filter((p: any) => p.kategori === kat)
  const skorLabel = (s: number | null) => SKALA_PENILAIAN.find((x) => x.nilai === s)?.label || '-'

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">A. Persiapan</CardTitle>
          {bolehInput && <Button size="sm" variant="outline" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Aspek</Button>}
        </CardHeader>
        <CardContent className="space-y-1.5">
          {byKategori('PERSIAPAN').length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada isian persiapan (tujuan pembimbingan, kompetensi yang dinilai, kesiapan peserta).</div>
          ) : byKategori('PERSIAPAN').map((p: any) => (
            <ItemPenilaian key={p.id} p={p} bolehInput={bolehInput} onEdit={() => openEdit(p)} onDelete={() => setDeleting(p)} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">B. Penilaian (Skala 1–5)</CardTitle>
          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            {SKALA_PENILAIAN.map((s) => <span key={s.nilai} className="rounded border bg-muted px-1.5 py-0.5">{s.nilai} = {s.label}</span>)}
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {byKategori('PENILAIAN').length === 0 && byKategori('OBSERVASI').length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Belum ada penilaian. Isi melalui tab Observasi atau tambah aspek manual.</div>
          ) : byKategori('PENILAIAN').map((p: any) => (
            <ItemPenilaian key={p.id} p={p} bolehInput={bolehInput} onEdit={() => openEdit(p)} onDelete={() => setDeleting(p)} />
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Penilaian' : 'Tambah Aspek Penilaian'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSIAPAN">Persiapan</SelectItem>
                  <SelectItem value="OBSERVASI">Observasi</SelectItem>
                  <SelectItem value="PENILAIAN">Penilaian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Aspek *</Label>
              <Input className="mt-1" value={form.aspek || ''} onChange={(e) => setForm({ ...form, aspek: e.target.value })} placeholder="Contoh: Kesiapan peserta" />
            </div>
            <div>
              <Label className="text-xs">Untuk Peserta</Label>
              <Select value={form.tenagaKesehatanId || 'NONE'} onValueChange={(v) => setForm({ ...form, tenagaKesehatanId: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Umum (seluruh kegiatan)</SelectItem>
                  {j.peserta.map((p: any) => <SelectItem key={p.tenagaKesehatanId} value={p.tenagaKesehatanId}>{p.tenagaKesehatan.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.kategori !== 'PERSIAPAN' && (
              <div>
                <Label className="text-xs">Skor (1-5)</Label>
                <div className="mt-1.5 grid grid-cols-5 gap-1">
                  {SKALA_PENILAIAN.map((s) => (
                    <button
                      key={s.nilai}
                      type="button"
                      onClick={() => setForm({ ...form, skor: s.nilai })}
                      className={cn('rounded-lg border py-2 text-center text-sm font-bold transition-colors', form.skor === s.nilai ? 'border-teal-600 bg-teal-50 text-teal-800' : 'text-muted-foreground hover:border-teal-400')}
                      title={s.label}
                    >
                      {s.nilai}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-center text-xs text-muted-foreground">{skorLabel(form.skor)}</div>
              </div>
            )}
            <div>
              <Label className="text-xs">Catatan Perseptor</Label>
              <Textarea rows={3} className="mt-1" value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus penilaian?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ItemPenilaian({ p, bolehInput, onEdit, onDelete }: any) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{p.aspek}</span>
          {p.tenagaKesehatan && <BadgeStatus label={p.tenagaKesehatan.nama} className="bg-slate-100 text-slate-600 border-slate-200" />}
          {p.skor && <BadgeStatus label={`${p.skor}/5`} className="bg-teal-100 text-teal-800 border-teal-200" />}
        </div>
        {p.catatan && <div className="mt-0.5 text-xs text-muted-foreground">{p.catatan}</div>}
      </div>
      {bolehInput && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aksi"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-3.5 w-3.5" /> Ubah</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600" onClick={onDelete}><Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/* ================= OBSERVASI ================= */
function TabObservasi({ j, bolehInput, reload }: any) {
  const ASPEK = ['Kesesuaian SOP', 'Keselamatan Pasien', 'Komunikasi', 'Keterampilan teknis', 'Dokumentasi', 'Etika', 'Penggunaan APD', 'PPI', 'Ketepatan tindakan']
  const [pesertaAktif, setPesertaAktif] = useState<string>(j.peserta[0]?.tenagaKesehatanId || '')
  const [savingRow, setSavingRow] = useState('')
  const [catatan, setCatatan] = useState<Record<string, string>>({})

  const penilaianPeserta = useMemo(() => {
    const map: Record<string, any> = {}
    j.penilaian.filter((p: any) => p.kategori === 'OBSERVASI' && p.tenagaKesehatanId === pesertaAktif).forEach((p: any) => { map[p.aspek] = p })
    return map
  }, [j.penilaian, pesertaAktif])

  async function setSkor(aspek: string, skor: number) {
    const ada = penilaianPeserta[aspek]
    setSavingRow(aspek)
    try {
      if (ada) {
        await apiPatch(`/api/jadwal/${j.id}/penilaian`, { id: ada.id, skor, kategori: 'OBSERVASI', aspek, catatan: catatan[aspek] ?? ada.catatan })
      } else {
        await apiPost(`/api/jadwal/${j.id}/penilaian`, { kategori: 'OBSERVASI', aspek, skor, tenagaKesehatanId: pesertaAktif, metode: j.metode })
      }
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSavingRow('')
    }
  }

  async function simpanCatatan(aspek: string) {
    const ada = penilaianPeserta[aspek]
    const teks = catatan[aspek]
    if (!ada) return
    try {
      await apiPatch(`/api/jadwal/${j.id}/penilaian`, { id: ada.id, skor: ada.skor, kategori: 'OBSERVASI', aspek, catatan: teks ?? '' })
      toast({ title: 'Catatan tersimpan' })
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  if (!j.peserta.length) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Tambahkan peserta terlebih dahulu pada tab Peserta.</div>
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Observasi Langsung (Skala 1–5)</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {j.peserta.map((p: any) => (
            <button
              key={p.tenagaKesehatanId}
              onClick={() => setPesertaAktif(p.tenagaKesehatanId)}
              className={cn('rounded-full border px-3 py-1 text-xs transition-colors', pesertaAktif === p.tenagaKesehatanId ? 'border-teal-600 bg-teal-50 font-semibold text-teal-800' : 'text-muted-foreground hover:border-teal-400')}
            >
              {p.tenagaKesehatan.nama}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ASPEK.map((a) => {
          const p = penilaianPeserta[a]
          return (
            <div key={a} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">{a}</div>
                {p?.catatan && <div className="text-xs text-muted-foreground">{p.catatan}</div>}
                {!p && <div className="text-xs text-muted-foreground/60">Belum dinilai</div>}
              </div>
              <div className="flex items-center gap-1">
                {SKALA_PENILAIAN.map((s) => (
                  <button
                    key={s.nilai}
                    disabled={!bolehInput || savingRow === a}
                    onClick={() => setSkor(a, s.nilai)}
                    title={s.label}
                    className={cn(
                      'h-8 w-8 rounded-lg border text-sm font-bold transition-colors disabled:opacity-50',
                      p?.skor === s.nilai ? 'border-teal-600 bg-teal-600 text-white' : 'hover:border-teal-400 hover:bg-teal-50'
                    )}
                  >
                    {s.nilai}
                  </button>
                ))}
                {savingRow === a && <Loader2 className="ml-1 h-4 w-4 animate-spin text-teal-600" />}
              </div>
            </div>
          )
        })}
        <div>
          <Label className="text-xs">Catatan Perseptor — {j.peserta.find((p: any) => p.tenagaKesehatanId === pesertaAktif)?.tenagaKesehatan.nama}</Label>
          <Textarea
            rows={3}
            className="mt-1"
            value={catatan[pesertaAktif] ?? j.penilaian.find((p: any) => p.tenagaKesehatanId === pesertaAktif && p.kategori === 'OBSERVASI' && p.catatan)?.catatan ?? ''}
            onChange={(e) => setCatatan({ ...catatan, [pesertaAktif]: e.target.value })}
            placeholder="Catatan umum hasil observasi..."
          />
          <Button size="sm" variant="outline" className="mt-2" disabled={!bolehInput} onClick={() => simpanCatatan(pesertaAktif)}>Simpan Catatan</Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ================= KASUS ================= */
function TabKasus({ j, bolehInput, reload }: any) {
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  function openCreate() {
    setEditing(null)
    setForm({ jenisKasus: '', kodeAnonim: `P-${String(100 + j.kasus.length + 1)}`, masalah: '', kondisi: '', tindakan: '', analisis: '', pembahasan: '', pembelajaran: '', rekomendasi: '' })
    setDialog(true)
  }

  function openEdit(k: any) {
    setEditing(k)
    setForm({
      jenisKasus: k.jenisKasus, kodeAnonim: k.kodeAnonim || '', masalah: k.masalah || '', kondisi: k.kondisi || '',
      tindakan: k.tindakan || '', analisis: k.analisis || '', pembahasan: k.pembahasan || '', pembelajaran: k.pembelajaran || '', rekomendasi: k.rekomendasi || '',
    })
    setDialog(true)
  }

  async function save() {
    if (!form.masalah) return toast({ title: 'Masalah kasus wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      if (editing) await apiPatch(`/api/jadwal/${j.id}/kasus`, { ...form, id: editing.id })
      else await apiPost(`/api/jadwal/${j.id}/kasus`, form)
      toast({ title: 'Berhasil', description: 'Catatan kasus tersimpan (identitas pasien dianonimkan).' })
      setDialog(false)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/jadwal/${j.id}/kasus?kasusId=${deleting.id}`)
      setDeleting(null)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Catatan Kasus ({j.kasus.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Gunakan kode anonim — jangan catat nama/NIK pasien. Data klinis diperlakukan sebagai data sensitif.</p>
        </div>
        {bolehInput && <Button size="sm" variant="outline" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" /> Catat Kasus</Button>}
      </CardHeader>
      <CardContent className="space-y-2.5">
        {j.kasus.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada kasus dibahas.</div>
        ) : (
          j.kasus.map((k: any) => (
            <div key={k.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BadgeStatus label={k.kodeAnonim || 'Anonim'} className="bg-teal-100 text-teal-800 border-teal-200" />
                  <span className="text-sm font-semibold">{k.jenisKasus}</span>
                  <span className="text-xs text-muted-foreground">{tanggalSingkat(k.tanggal)}</span>
                </div>
                {bolehInput && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aksi"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(k)}><Pencil className="mr-2 h-3.5 w-3.5" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600" onClick={() => setDeleting(k)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                <KasusField label="Masalah" value={k.masalah} />
                <KasusField label="Kondisi" value={k.kondisi} />
                <KasusField label="Tindakan" value={k.tindakan} />
                <KasusField label="Analisis" value={k.analisis} />
                <KasusField label="Pembahasan" value={k.pembahasan} />
                <KasusField label="Pembelajaran" value={k.pembelajaran} />
                <KasusField label="Rekomendasi" value={k.rekomendasi} />
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Kasus' : 'Catat Kasus'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Jenis Kasus *</Label>
              <Input className="mt-1" value={form.jenisKasus || ''} onChange={(e) => setForm({ ...form, jenisKasus: e.target.value })} placeholder="Hipertensi, Asfiksia, Luka..." />
            </div>
            <div>
              <Label className="text-xs">Kode Anonim Pasien</Label>
              <Input className="mt-1 font-mono" value={form.kodeAnonim || ''} onChange={(e) => setForm({ ...form, kodeAnonim: e.target.value })} />
            </div>
            <div className="sm:col-span-2"><KasusInput label="Masalah" form={form} setForm={setForm} keyName="masalah" required /></div>
            <div><KasusInput label="Kondisi" form={form} setForm={setForm} keyName="kondisi" /></div>
            <div><KasusInput label="Tindakan" form={form} setForm={setForm} keyName="tindakan" /></div>
            <div><KasusInput label="Analisis" form={form} setForm={setForm} keyName="analisis" /></div>
            <div><KasusInput label="Pembahasan" form={form} setForm={setForm} keyName="pembahasan" /></div>
            <div className="sm:col-span-2"><KasusInput label="Pembelajaran" form={form} setForm={setForm} keyName="pembelajaran" /></div>
            <div className="sm:col-span-2"><KasusInput label="Rekomendasi" form={form} setForm={setForm} keyName="rekomendasi" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus catatan kasus?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function KasusField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <span className="font-semibold">{label}:</span> <span className="text-muted-foreground">{value}</span>
    </div>
  )
}

function KasusInput({ label, form, setForm, keyName, required }: any) {
  return (
    <div>
      <Label className="text-xs">{label}{required && ' *'}</Label>
      <Textarea rows={2} className="mt-1 text-xs" value={form[keyName] || ''} onChange={(e) => setForm({ ...form, [keyName]: e.target.value })} />
    </div>
  )
}

/* ================= TEMUAN ================= */
function TabTemuan({ j, bolehInput, reload }: any) {
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  function openCreate() {
    setEditing(null)
    setForm({ kategori: 'Kompetensi', uraian: '', tingkatRisiko: 'SEDANG', bukti: '', rekomendasiTeks: '', penanggungJawab: j.peserta[0]?.tenagaKesehatan?.nama || '', batasWaktu: '' })
    setDialog(true)
  }

  function openEdit(t: any) {
    setEditing(t)
    setForm({
      kategori: t.kategori, uraian: t.uraian, tingkatRisiko: t.tingkatRisiko, bukti: t.bukti || '',
      rekomendasiTeks: t.rekomendasiTeks || '', penanggungJawab: t.penanggungJawab || '',
      batasWaktu: t.batasWaktu ? new Date(t.batasWaktu).toISOString().slice(0, 10) : '',
    })
    setDialog(true)
  }

  async function save() {
    if (!form.uraian) return toast({ title: 'Uraian temuan wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      if (editing) await apiPatch(`/api/jadwal/${j.id}/temuan`, { ...form, id: editing.id })
      else await apiPost(`/api/jadwal/${j.id}/temuan`, form)
      toast({ title: 'Berhasil', description: 'Temuan tersimpan.' })
      setDialog(false)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/jadwal/${j.id}/temuan?temuanId=${deleting.id}`)
      setDeleting(null)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-600" /> Temuan ({j.temuan.length})</CardTitle>
        {bolehInput && <Button size="sm" variant="outline" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" /> Catat Temuan</Button>}
      </CardHeader>
      <CardContent className="space-y-2">
        {j.temuan.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada temuan tercatat.</div>
        ) : (
          j.temuan.map((t: any) => (
            <div key={t.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <BadgeStatus label={t.kategori} className="bg-slate-100 text-slate-700 border-slate-200" />
                  <BadgeStatus label={`Risiko ${RISIKO_LABEL[t.tingkatRisiko]}`} className={RISIKO_COLOR[t.tingkatRisiko]} />
                  <BadgeStatus label={t.status} className="bg-sky-100 text-sky-700 border-sky-200" />
                  {t.rtl.length > 0 && <BadgeStatus label={`${t.rtl.length} RTL`} className="bg-teal-100 text-teal-800 border-teal-200" />}
                </div>
                {bolehInput && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aksi"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="mr-2 h-3.5 w-3.5" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600" onClick={() => setDeleting(t)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-1.5 text-sm">{t.uraian}</div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {t.bukti && <span>Bukti: {t.bukti}</span>}
                {t.penanggungJawab && <span>PJ: {t.penanggungJawab}</span>}
                {t.batasWaktu && <span>Batas waktu: {tanggalSingkat(t.batasWaktu)}</span>}
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Temuan' : 'Catat Temuan'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={form.kategori} onValueChange={(v) => setForm({ ...form, kategori: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{KATEGORI_TEMUAN.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tingkat Risiko</Label>
              <Select value={form.tingkatRisiko} onValueChange={(v) => setForm({ ...form, tingkatRisiko: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RISIKO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Uraian Temuan *</Label>
              <Textarea rows={2} className="mt-1" value={form.uraian || ''} onChange={(e) => setForm({ ...form, uraian: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Bukti</Label>
              <Textarea rows={2} className="mt-1" value={form.bukti || ''} onChange={(e) => setForm({ ...form, bukti: e.target.value })} placeholder="Catatan observasi, foto, dokumen..." />
            </div>
            <div>
              <Label className="text-xs">Rekomendasi Awal</Label>
              <Textarea rows={2} className="mt-1" value={form.rekomendasiTeks || ''} onChange={(e) => setForm({ ...form, rekomendasiTeks: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Penanggung Jawab</Label>
              <Input className="mt-1" value={form.penanggungJawab || ''} onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Batas Waktu Penyelesaian</Label>
              <Input type="date" className="mt-1" value={form.batasWaktu || ''} onChange={(e) => setForm({ ...form, batasWaktu: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus temuan?</AlertDialogTitle>
            <AlertDialogDescription>Temuan yang sudah memiliki RTL tidak dapat dihapus.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Ya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

/* ================= REKOMENDASI ================= */
function TabRekomendasi({ j, bolehInput, reload }: any) {
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  function openCreate(temuanId?: string) {
    setEditing(null)
    const t = j.temuan.find((x: any) => x.id === temuanId)
    setForm({ temuanId: temuanId || '', masalah: t?.uraian || '', akarMasalah: '', rekomendasi: '', penanggungJawab: t?.penanggungJawab || '', targetWaktu: '', indikatorKeberhasilan: '' })
    setDialog(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    setForm({
      temuanId: r.temuanId || '', masalah: r.masalah || '', akarMasalah: r.akarMasalah || '', rekomendasi: r.rekomendasi,
      penanggungJawab: r.penanggungJawab || '', targetWaktu: r.targetWaktu ? new Date(r.targetWaktu).toISOString().slice(0, 10) : '', indikatorKeberhasilan: r.indikatorKeberhasilan || '',
    })
    setDialog(true)
  }

  async function save() {
    if (!form.rekomendasi) return toast({ title: 'Isi rekomendasi wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      if (editing) await apiPatch(`/api/jadwal/${j.id}/rekomendasi`, { ...form, id: editing.id })
      else await apiPost(`/api/jadwal/${j.id}/rekomendasi`, form)
      toast({ title: 'Berhasil', description: 'Rekomendasi tersimpan.' })
      setDialog(false)
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function doDelete(r: any) {
    try {
      await apiDelete(`/api/jadwal/${j.id}/rekomendasi?rekomendasiId=${r.id}`)
      await reload()
      toast({ title: 'Rekomendasi dihapus' })
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-amber-500" /> Rekomendasi ({j.rekomendasi.length})</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Pendekatan: Temuan → Analisis → Rekomendasi → Tindak Lanjut → Verifikasi</p>
        </div>
        {bolehInput && <Button size="sm" variant="outline" onClick={() => openCreate()}><Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Rekomendasi</Button>}
      </CardHeader>
      <CardContent className="space-y-2">
        {j.rekomendasi.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada rekomendasi. Tambahkan berdasarkan temuan.</div>
        ) : (
          j.rekomendasi.map((r: any) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5 text-sm">
                  {r.masalah && <div><span className="text-xs font-semibold text-muted-foreground">Masalah:</span> {r.masalah}</div>}
                  {r.akarMasalah && <div><span className="text-xs font-semibold text-muted-foreground">Akar masalah:</span> {r.akarMasalah}</div>}
                  <div><span className="text-xs font-semibold text-muted-foreground">Rekomendasi:</span> <span className="font-medium">{r.rekomendasi}</span></div>
                  <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                    {r.penanggungJawab && <span>PJ: {r.penanggungJawab}</span>}
                    {r.targetWaktu && <span>Target: {tanggalSingkat(r.targetWaktu)}</span>}
                    {r.indikatorKeberhasilan && <span>Indikator: {r.indikatorKeberhasilan}</span>}
                  </div>
                </div>
                {bolehInput && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aksi"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="mr-2 h-3.5 w-3.5" /> Ubah</DropdownMenuItem>
                      <DropdownMenuItem className="text-rose-600" onClick={() => doDelete(r)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
        {bolehInput && j.temuan.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t pt-3">
            <span className="text-xs text-muted-foreground">Buat rekomendasi dari temuan:</span>
            {j.temuan.map((t: any) => (
              <button key={t.id} onClick={() => openCreate(t.id)} className="rounded-full border px-2 py-0.5 text-[11px] hover:border-teal-400 hover:bg-teal-50">
                {t.kategori}
              </button>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Rekomendasi' : 'Tambah Rekomendasi'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Berdasarkan Temuan</Label>
              <Select value={form.temuanId || 'NONE'} onValueChange={(v) => setForm({ ...form, temuanId: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Tanpa temuan spesifik</SelectItem>
                  {j.temuan.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.kategori}: {t.uraian.slice(0, 50)}...</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><KasusInput label="Masalah" form={form} setForm={setForm} keyName="masalah" /></div>
            <div className="sm:col-span-2"><KasusInput label="Akar Masalah (analisis)" form={form} setForm={setForm} keyName="akarMasalah" /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Rekomendasi *</Label>
              <Textarea rows={2} className="mt-1" value={form.rekomendasi || ''} onChange={(e) => setForm({ ...form, rekomendasi: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Penanggung Jawab</Label>
              <Input className="mt-1" value={form.penanggungJawab || ''} onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Target Waktu</Label>
              <Input type="date" className="mt-1" value={form.targetWaktu || ''} onChange={(e) => setForm({ ...form, targetWaktu: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Indikator Keberhasilan</Label>
              <Input className="mt-1" value={form.indikatorKeberhasilan || ''} onChange={(e) => setForm({ ...form, indikatorKeberhasilan: e.target.value })} placeholder="Kepatuhan > 90% pada audit berikutnya" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ================= RTL ================= */
function TabRtl({ j, bolehInput, isAdminPkm, dinas, isPerseptorKegiatan, reload }: any) {
  const [rows, setRows] = useState<any[]>([])
  const [dialog, setDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [verifDialog, setVerifDialog] = useState<any>(null)
  const [verifAksi, setVerifAksi] = useState('DISETUJUI')
  const [verifCatatan, setVerifCatatan] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ data: any[] }>(`/api/rtl?jadwalTema=${j.id}`)
      // filter client-side: RTL milik temuan/rekomendasi jadwal ini atau puskesmas sama
      const idsTemuan = j.temuan.map((t: any) => t.id)
      const idsRekom = j.rekomendasi.map((r: any) => r.id)
      const filtered = res.data.filter((r) => idsTemuan.includes(r.temuanId) || idsRekom.includes(r.rekomendasiId) || r.puskesmasId === j.puskesmasId)
      setRows(filtered)
    } catch { /* ignore */ }
  }, [j])

  useEffect(() => { load() }, [load])

  async function buatRTL() {
    if (!form.kegiatan) return toast({ title: 'Kegiatan tindak lanjut wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      await apiPost('/api/rtl', { ...form, temuanId: form.temuanId === 'NONE' ? '' : form.temuanId, rekomendasiId: form.rekomendasiId === 'NONE' ? '' : form.rekomendasiId, puskesmasId: j.puskesmasId })
      toast({ title: 'Berhasil', description: 'Rencana tindak lanjut dibuat.' })
      setDialog(false)
      await load()
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function ubahStatus(r: any, status: string) {
    try {
      await apiPut(`/api/rtl/${r.id}`, { status, tanggalSelesai: status === 'SELESAI' ? new Date().toISOString().slice(0, 10) : undefined })
      toast({ title: 'Status RTL diperbarui' })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  async function kirimVerifikasi() {
    try {
      await apiPost(`/api/rtl/${verifDialog.id}/verifikasi`, { aksi: verifAksi, catatan: verifCatatan })
      toast({ title: 'Verifikasi tercatat', description: verifAksi === 'DISETUJUI' ? 'RTL terverifikasi.' : 'Permintaan perbaikan dikirim.' })
      setVerifDialog(null)
      setVerifCatatan('')
      await load()
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Repeat className="h-4 w-4 text-teal-700" /> Rencana Tindak Lanjut ({rows.length})</CardTitle>
        {(isAdminPkm || dinas) && (
          <Button size="sm" variant="outline" onClick={() => { setForm({ temuanId: j.temuan[0]?.id || 'NONE', rekomendasiId: j.rekomendasi[0]?.id || 'NONE', kegiatan: '', penanggungJawab: '', targetSelesai: '' }); setDialog(true) }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Buat RTL
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada RTL. Puskesmas membuat RTL berdasarkan temuan/rekomendasi.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <BadgeStatus label={r.status.replace('_', ' ')} className={{ BELUM_DIMULAI: 'bg-slate-100 text-slate-700 border-slate-200', DALAM_PROSES: 'bg-amber-100 text-amber-700 border-amber-200', SELESAI: 'bg-sky-100 text-sky-700 border-sky-200', TERVERIFIKASI: 'bg-emerald-100 text-emerald-700 border-emerald-200', TERLAMBAT: 'bg-rose-100 text-rose-700 border-rose-200' }[r.status] || ''} />
                  {r.terlambatOtomatis && <BadgeStatus label="Lewat Batas Waktu" className="bg-rose-100 text-rose-700 border-rose-200" />}
                  <BadgeStatus label={`Verifikasi: ${r.verifikasiStatus}`} className={r.verifikasiStatus === 'DISETUJUI' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(isAdminPkm || dinas) && !['TERVERIFIKASI'].includes(r.status) && (
                    <>
                      {r.status !== 'SELESAI' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => ubahStatus(r, 'SELESAI')}>Tandai Selesai</Button>}
                      {r.status === 'BELUM_DIMULAI' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => ubahStatus(r, 'DALAM_PROSES')}>Mulai Proses</Button>}
                    </>
                  )}
                  {(isPerseptorKegiatan || dinas) && r.status === 'SELESAI' && (
                    <Button size="sm" className="h-7 bg-teal-700 text-xs hover:bg-teal-800" onClick={() => { setVerifDialog(r); setVerifAksi('DISETUJUI'); setVerifCatatan('') }}>
                      <ThumbsUp className="mr-1 h-3 w-3" /> Verifikasi
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 text-sm font-medium">{r.kegiatan}</div>
              <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {r.penanggungJawab && <span>PJ: {r.penanggungJawab}</span>}
                {r.targetSelesai && <span>Target: {tanggalSingkat(r.targetSelesai)}</span>}
                {r.bukti && <span>Bukti: {r.bukti}</span>}
                {r.verifikasiCatatan && <span>Catatan verifikasi: {r.verifikasiCatatan}</span>}
              </div>
              {r.verifikasi?.length > 0 && (
                <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
                  {r.verifikasi.slice(0, 3).map((v: any) => (
                    <div key={v.id}>• {v.aksi} oleh {v.oleh || '—'} — {tanggalSingkat(v.pada)} {v.catatan ? `: ${v.catatan}` : ''}</div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Buat Rencana Tindak Lanjut</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Berdasarkan Temuan</Label>
              <Select value={form.temuanId || 'NONE'} onValueChange={(v) => setForm({ ...form, temuanId: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Tidak terkait temuan</SelectItem>
                  {j.temuan.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.kategori}: {t.uraian.slice(0, 50)}...</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Kegiatan Tindak Lanjut *</Label>
              <Textarea rows={2} className="mt-1" value={form.kegiatan || ''} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} placeholder="Contoh: Menyusun checklist keselamatan pasien di IGD" />
            </div>
            <div>
              <Label className="text-xs">Penanggung Jawab</Label>
              <Input className="mt-1" value={form.penanggungJawab || ''} onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Target Selesai</Label>
              <Input type="date" className="mt-1" value={form.targetSelesai || ''} onChange={(e) => setForm({ ...form, targetSelesai: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={buatRTL} disabled={saving}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog verifikasi */}
      <Dialog open={!!verifDialog} onOpenChange={(o) => !o && setVerifDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Verifikasi Tindak Lanjut</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-2.5 text-sm">{verifDialog?.kegiatan}</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { v: 'DISETUJUI', l: 'Setujui', icon: ThumbsUp },
                { v: 'PERLU_PERBAIKAN', l: 'Perlu Perbaikan', icon: RotateCcw },
                { v: 'VERIFIKASI_ULANG', l: 'Verifikasi Ulang', icon: Eye },
              ].map((a) => (
                <button
                  key={a.v}
                  onClick={() => setVerifAksi(a.v)}
                  className={cn('rounded-lg border p-2 text-center text-xs font-medium transition-colors', verifAksi === a.v ? 'border-teal-600 bg-teal-50 text-teal-800' : 'text-muted-foreground hover:border-teal-400')}
                >
                  <a.icon className="mx-auto mb-1 h-4 w-4" />
                  {a.l}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-xs">Catatan Verifikasi</Label>
              <Textarea rows={3} className="mt-1" value={verifCatatan} onChange={(e) => setVerifCatatan(e.target.value)} placeholder="Catatan hasil verifikasi, permintaan perbaikan..." />
            </div>
            <p className="text-[11px] text-muted-foreground">Setelah disetujui, status RTL menjadi TERVERIFIKASI dan histori perubahan tersimpan.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifDialog(null)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={kirimVerifikasi}>Kirim Verifikasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* ================= DOKUMENTASI ================= */
function TabDokumentasi({ j, bolehInput, reload }: any) {
  const [rows, setRows] = useState<any[]>([])
  const [dialog, setDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ jenis: 'FOTO', nama: '', deskripsi: '' })
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ data: any[] }>(`/api/dokumentasi?jadwalId=${j.id}`)
      setRows(res.data)
    } catch { /* ignore */ }
  }, [j.id])

  useEffect(() => { load() }, [load])

  async function unggah() {
    if (!form.nama) return toast({ title: 'Nama dokumentasi wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('jadwalId', j.id)
      fd.append('jenis', form.jenis)
      fd.append('nama', form.nama)
      if (form.deskripsi) fd.append('deskripsi', form.deskripsi)
      if (file) fd.append('file', file)
      await apiUpload('/api/dokumentasi', fd)
      toast({ title: 'Berhasil', description: 'Dokumentasi diunggah ke penyimpanan server.' })
      setDialog(false)
      setFile(null)
      setForm({ jenis: 'FOTO', nama: '', deskripsi: '' })
      await load()
      await reload()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function hapus(d: any) {
    try {
      await apiDelete(`/api/dokumentasi?id=${d.id}`)
      await load()
      toast({ title: 'Dokumentasi dihapus' })
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><FolderOpen className="h-4 w-4 text-teal-700" /> Dokumentasi ({rows.length})</CardTitle>
        {bolehInput && <Button size="sm" variant="outline" onClick={() => setDialog(true)}><Upload className="mr-1.5 h-3.5 w-3.5" /> Unggah</Button>}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada dokumentasi (foto, dokumen, materi, berita acara, bukti RTL).</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <BadgeStatus label={JENIS_DOKUMEN_LABEL[d.jenis] || d.jenis} className="bg-teal-100 text-teal-800 border-teal-200" />
                  <div className="mt-1 truncate text-sm font-medium">{d.nama}</div>
                  {d.deskripsi && <div className="truncate text-xs text-muted-foreground">{d.deskripsi}</div>}
                  <div className="mt-1 text-[11px] text-muted-foreground">{d.fileName || 'tanpa file'} • oleh {d.uploadedBy || '—'}</div>
                  {d.fileUrl && (
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                      <Download className="h-3 w-3" /> Unduh
                    </a>
                  )}
                </div>
                {bolehInput && <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => hapus(d)} aria-label="Hapus"><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Unggah Dokumentasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{JENIS_DOKUMEN.map((jd) => <SelectItem key={jd} value={jd}>{JENIS_DOKUMEN_LABEL[jd]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nama *</Label>
              <Input className="mt-1" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Deskripsi</Label>
              <Textarea rows={2} className="mt-1" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">File (maks 10 MB: gambar/PDF/dokumen)</Label>
              <Input type="file" className="mt-1" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.pptx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={unggah} disabled={saving}>Unggah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
