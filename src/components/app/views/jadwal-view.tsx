'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, BadgeStatus, ErrorState, EmptyState } from '../ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { STATUS_JADWAL, STATUS_JADWAL_COLOR, STATUS_JADWAL_LABEL, METODE_PEMBIMBINGAN, tanggalSingkat } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays, List, MoreVertical,
  Clock, MapPin, UserRound, Loader2, Eye, PlayCircle, CheckCircle2, XCircle, PauseCircle,
} from 'lucide-react'
import { BULAN_ID } from '@/lib/constants'

export function JadwalView({ mode }: { mode: 'jadwal' | 'pelaksanaan' | 'riwayat' }) {
  const { user, go } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tahun, setTahun] = useState(2026)
  const [bulan, setBulan] = useState(9)
  const [tampilan, setTampilan] = useState<'kalender' | 'daftar'>('kalender')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [tundaDialog, setTundaDialog] = useState<any>(null)
  const [tundaAlasan, setTundaAlasan] = useState('')

  // Form data
  const [pkmList, setPkmList] = useState<any[]>([])
  const [perList, setPerList] = useState<any[]>([])
  const [progList, setProgList] = useState<any[]>([])
  const [tkList, setTkList] = useState<any[]>([])
  const [form, setForm] = useState<any>({})
  const [benturan, setBenturan] = useState<any>(null)

  const dinas = isDinas(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ tahun: String(tahun), bulan: String(bulan) })
      if (mode === 'riwayat') qs.set('status', 'SELESAI')
      if (mode === 'pelaksanaan') qs.set('status', 'BERLANGSUNG')
      const res = await apiGet<{ data: any[] }>(`/api/jadwal?${qs}`)
      let data = res.data
      if (mode === 'pelaksanaan') {
        // Gabungkan juga yang harus disiapkan (dikonfirmasi/dijadwalkan terdekat)
        const dekat = await apiGet<{ data: any[] }>('/api/jadwal?status=DIKONFIRMASI')
        const dijadwalkan = await apiGet<{ data: any[] }>('/api/jadwal?status=DIJADWALKAN')
        const map = new Map<string, any>()
        ;[...dekat.data, ...dijadwalkan.data, ...data].forEach((j) => map.set(j.id, j))
        data = [...map.values()].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      }
      setRows(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tahun, bulan, mode])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [p, pr, pg, tk] = await Promise.all([
          apiGet('/api/master/puskesmas'), apiGet('/api/master/perseptor'),
          apiGet('/api/program'), apiGet('/api/master/tenaga-kesehatan'),
        ])
        setPkmList(p.data); setPerList(pr.data); setProgList(pg.data); setTkList(tk.data)
      } catch { /* ignore */ }
    }
    fetchAll()
  }, [])

  const kalender = useMemo(() => {
    const first = new Date(tahun, bulan - 1, 1)
    const lastDay = new Date(tahun, bulan, 0).getDate()
    const startDow = first.getDay() // 0 = Minggu
    const cells: Array<{ date: number | null; events: any[] }> = []
    for (let i = 0; i < startDow; i++) cells.push({ date: null, events: [] })
    for (let d = 1; d <= lastDay; d++) {
      const events = rows.filter((r) => {
        const t = new Date(r.tanggal)
        return t.getFullYear() === tahun && t.getMonth() === bulan - 1 && t.getDate() === d
      })
      cells.push({ date: d, events })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, events: [] })
    return cells
  }, [rows, tahun, bulan])

  function openCreate() {
    setEditing(null)
    setBenturan(null)
    setForm({ puskesmasId: '', perseptorId: '', tanggal: `${tahun}-${String(bulan).padStart(2, '0')}-15`, waktuMulai: '08:30', waktuSelesai: '11:30', topik: '', tujuan: '', programId: '', metode: [], pesertaIds: [], catatan: '' })
    setDialog(true)
  }

  function openEdit(j: any) {
    setEditing(j)
    setBenturan(null)
    setForm({
      puskesmasId: j.puskesmasId, perseptorId: j.perseptorId,
      tanggal: new Date(j.tanggal).toISOString().slice(0, 10),
      waktuMulai: j.waktuMulai, waktuSelesai: j.waktuSelesai, topik: j.topik, tujuan: j.tujuan || '',
      programId: j.programId || '', metode: j.metode ? j.metode.split(',').map((s: string) => s.trim()) : [],
      pesertaIds: (j.peserta || []).map((p: any) => p.tenagaKesehatanId), catatan: j.catatan || '',
    })
    setDialog(true)
  }

  async function save(paksa = false) {
    if (!form.puskesmasId || !form.perseptorId || !form.topik) {
      return toast({ title: 'Data belum lengkap', description: 'Puskesmas, perseptor, dan topik wajib diisi.', variant: 'destructive' })
    }
    setSaving(true)
    try {
      const payload = { ...form, paksa }
      let res: any
      if (editing) res = await apiPut(`/api/jadwal/${editing.id}`, payload)
      else res = await apiPost('/api/jadwal', payload)
      toast({ title: 'Berhasil', description: 'Jadwal pembimbingan tersimpan & notifikasi terkirim.' })
      setDialog(false)
      setBenturan(null)
      await load()
    } catch (e: any) {
      if (e.status === 409 && e.data?.benturan) {
        setBenturan(e.data.benturan)
        toast({ title: 'Benturan jadwal terdeteksi', description: 'Perseptor sudah memiliki agenda di tanggal tersebut. Anda dapat tetap menyimpan dengan memaksa.', variant: 'destructive' })
      } else {
        toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(j: any, status: string, keterangan?: string) {
    try {
      await apiPatch(`/api/jadwal/${j.id}/status`, { status, keterangan })
      toast({ title: 'Status diperbarui', description: `${j.topik}: ${STATUS_JADWAL_LABEL[status]}` })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/jadwal/${deleting.id}`)
      toast({ title: 'Berhasil', description: 'Jadwal dihapus.' })
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  async function submitTunda() {
    if (!tundaDialog) return
    await changeStatus(tundaDialog, 'DITUNDA', tundaAlasan)
    setTundaDialog(null)
    setTundaAlasan('')
  }

  const statusAksi = (j: any): Array<{ s: string; label: string; icon: any }> => {
    const semua: Record<string, Array<{ s: string; label: string; icon: any }>> = {
      DIRENCANAKAN: [{ s: 'DIJADWALKAN', label: 'Jadwalkan', icon: CalendarDays }],
      DIJADWALKAN: [{ s: 'DIKONFIRMASI', label: 'Konfirmasi', icon: CheckCircle2 }, { s: 'BERLANGSUNG', label: 'Mulai Berlangsung', icon: PlayCircle }],
      DIKONFIRMASI: [{ s: 'BERLANGSUNG', label: 'Mulai Berlangsung', icon: PlayCircle }],
      BERLANGSUNG: [{ s: 'SELESAI', label: 'Tandai Selesai', icon: CheckCircle2 }],
      SELESAI: [],
      DITUNDA: [{ s: 'DIJADWALKAN', label: 'Jadwalkan Ulang', icon: CalendarDays }],
      DIBATALKAN: [{ s: 'DIJADWALKAN', label: 'Jadwalkan Ulang', icon: CalendarDays }],
    }
    return semua[j.status] || []
  }

  const judul = mode === 'riwayat' ? 'Riwayat Pembimbingan' : mode === 'pelaksanaan' ? 'Pelaksanaan Pembimbingan' : 'Jadwal Pembimbingan'
  const deskripsi = mode === 'riwayat'
    ? 'Arsip kegiatan pembimbingan yang telah selesai — buka detail untuk instrumen, temuan, dan berita acara.'
    : mode === 'pelaksanaan'
      ? 'Kegiatan yang perlu dilaksanakan/diseragamkan statusnya: konfirmasi kehadiran, mulai sesi, hingga menandai selesai.'
      : 'Kalender penugasan pembimbingan. Arahkan ke tanggal untuk melihat kegiatan; dinas dapat membuat dan mengubah jadwal.'

  return (
    <div className="space-y-4">
      <PageHeader
        title={judul}
        description={deskripsi}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'jadwal' && (
              <div className="flex rounded-lg border p-0.5">
                <Button variant={tampilan === 'kalender' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setTampilan('kalender')}>
                  <CalendarDays className="mr-1 h-3.5 w-3.5" /> Kalender
                </Button>
                <Button variant={tampilan === 'daftar' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setTampilan('daftar')}>
                  <List className="mr-1 h-3.5 w-3.5" /> Daftar
                </Button>
              </div>
            )}
            {dinas && mode === 'jadwal' && (
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Buat Jadwal</Button>
            )}
          </div>
        }
      />

      {error ? <ErrorState message={error} onRetry={load} /> : loading && rows.length === 0 ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : mode === 'jadwal' && tampilan === 'kalender' ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { const b = bulan - 1; if (b < 1) { setBulan(12); setTahun(tahun - 1) } else setBulan(b) }} aria-label="Bulan sebelumnya">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-lg font-bold">{BULAN_ID[bulan - 1]} {tahun}</div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { const b = bulan + 1; if (b > 12) { setBulan(1); setTahun(tahun + 1) } else setBulan(b) }} aria-label="Bulan berikutnya">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-muted-foreground">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {kalender.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    'min-h-[86px] rounded-md border p-1 text-left',
                    c.date ? 'bg-white' : 'bg-muted/30',
                    c.date === new Date().getDate() && bulan === new Date().getMonth() + 1 && tahun === new Date().getFullYear() && 'border-teal-500 ring-1 ring-teal-400'
                  )}
                >
                  {c.date && <div className="px-1 text-xs font-semibold text-muted-foreground">{c.date}</div>}
                  <div className="space-y-0.5">
                    {c.events.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => go('pembimbingan-detail', { id: e.id })}
                        className={cn('block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium hover:opacity-80', STATUS_JADWAL_COLOR[e.status])}
                        title={`${e.topik} — ${e.puskesmas.nama} (${e.waktuMulai})`}
                      >
                        {e.waktuMulai} {e.topik}
                      </button>
                    ))}
                    {c.events.length > 3 && <div className="px-1 text-[10px] text-muted-foreground">+{c.events.length - 3} lainnya</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              {Object.entries(STATUS_JADWAL_LABEL).map(([v, l]) => (
                <span key={v} className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', STATUS_JADWAL_COLOR[v])}>{l}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.length === 0 ? (
            <EmptyState title="Tidak ada jadwal pada rentang ini" description="Coba ubah bulan/tahun atau buat jadwal baru." />
          ) : (
            rows.map((j) => (
              <Card key={j.id} className="py-0">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                    <span className="text-lg font-bold leading-none">{new Date(j.tanggal).getDate()}</span>
                    <span className="text-[10px] uppercase">{BULAN_ID[new Date(j.tanggal).getMonth()].slice(0, 3)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="truncate text-sm font-semibold hover:underline" onClick={() => go('pembimbingan-detail', { id: j.id })}>{j.topik}</button>
                      <BadgeStatus label={STATUS_JADWAL_LABEL[j.status]} className={STATUS_JADWAL_COLOR[j.status]} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.puskesmas.nama}</span>
                      <span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{j.perseptor.nama}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{j.waktuMulai}–{j.waktuSelesai}</span>
                      <span>{j.peserta?.length ?? 0} peserta</span>
                      {j.catatan && <span className="italic">({j.catatan})</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => go('pembimbingan-detail', { id: j.id })}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Detail
                    </Button>
                    {(dinas || (user?.role === 'PERSEPTOR' && j.perseptorId === user.perseptorId) || user?.role === 'ADMIN_PUSKESMAS') && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aksi jadwal"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel>Aksi Status</DropdownMenuLabel>
                          {statusAksi(j).length > 0 ? (
                            statusAksi(j).map((a) => (
                              <DropdownMenuItem key={a.s} onClick={() => changeStatus(j, a.s)}>
                                <a.icon className="mr-2 h-4 w-4" /> {a.label}
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <DropdownMenuItem disabled>Tidak ada aksi status</DropdownMenuItem>
                          )}
                          {j.status !== 'SELESAI' && j.status !== 'DIBATALKAN' && (
                            <DropdownMenuItem onClick={() => { setTundaDialog(j); setTundaAlasan('') }}>
                              <PauseCircle className="mr-2 h-4 w-4" /> Tunda
                            </DropdownMenuItem>
                          )}
                          {j.status !== 'DIBATALKAN' && j.status !== 'SELESAI' && (
                            <DropdownMenuItem onClick={() => changeStatus(j, 'DIBATALKAN')}>
                              <XCircle className="mr-2 h-4 w-4" /> Batalkan
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {(dinas || (user?.role === 'PERSEPTOR' && j.perseptorId === user.perseptorId)) && (
                            <DropdownMenuItem onClick={() => openEdit(j)}><Pencil className="mr-2 h-4 w-4" /> Ubah Jadwal</DropdownMenuItem>
                          )}
                          {dinas && <DropdownMenuItem className="text-rose-600" onClick={() => setDeleting(j)}><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Dialog buat/ubah jadwal */}
      <Dialog open={dialog} onOpenChange={(o) => { setDialog(o); if (!o) setBenturan(null) }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Jadwal Pembimbingan' : 'Buat Jadwal Pembimbingan'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Program (opsional)</Label>
              <Select value={form.programId || 'NONE'} onValueChange={(v) => setForm({ ...form, programId: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Tanpa program</SelectItem>
                  {progList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Puskesmas *</Label>
              <Select value={form.puskesmasId || ''} onValueChange={(v) => setForm({ ...form, puskesmasId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {pkmList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Perseptor *</Label>
              <Select value={form.perseptorId || ''} onValueChange={(v) => setForm({ ...form, perseptorId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {perList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama} ({p.profesi})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tanggal *</Label>
              <Input type="date" className="mt-1" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mulai</Label>
                <Input type="time" className="mt-1" value={form.waktuMulai || ''} onChange={(e) => setForm({ ...form, waktuMulai: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Selesai</Label>
                <Input type="time" className="mt-1" value={form.waktuSelesai || ''} onChange={(e) => setForm({ ...form, waktuSelesai: e.target.value })} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Topik *</Label>
              <Input className="mt-1" value={form.topik || ''} onChange={(e) => setForm({ ...form, topik: e.target.value })} placeholder="Contoh: Bantuan Hidup Dasar Tim IGD" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Tujuan</Label>
              <Textarea rows={2} className="mt-1" value={form.tujuan || ''} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Metode Pembimbingan</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {METODE_PEMBIMBINGAN.map((m) => {
                  const aktif = (form.metode || []).includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm({ ...form, metode: aktif ? form.metode.filter((x: string) => x !== m) : [...(form.metode || []), m] })}
                      className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', aktif ? 'border-teal-600 bg-teal-50 font-medium text-teal-800' : 'text-muted-foreground hover:border-teal-400')}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Peserta (tenaga kesehatan Puskesmas terpilih)</Label>
              {form.puskesmasId && tkList.length > 0 ? (
                <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {tkList.filter((t) => t.puskesmasId === form.puskesmasId).map((t) => (
                    <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted">
                      <Checkbox
                        checked={(form.pesertaIds || []).includes(t.id)}
                        onCheckedChange={(c) => setForm({ ...form, pesertaIds: c ? [...(form.pesertaIds || []), t.id] : (form.pesertaIds || []).filter((x: string) => x !== t.id) })}
                      />
                      <span className="text-xs font-medium">{t.nama}</span>
                      <BadgeStatus label={t.profesi} className="bg-slate-100 text-slate-600 border-slate-200" />
                    </label>
                  ))}
                  {tkList.filter((t) => t.puskesmasId === form.puskesmasId).length === 0 && (
                    <div className="p-2 text-center text-xs text-muted-foreground">Belum ada tenaga kesehatan terdaftar di Puskesmas ini.</div>
                  )}
                </div>
              ) : (
                <div className="mt-1 rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Pilih Puskesmas terlebih dahulu.</div>
              )}
            </div>
            {benturan && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm sm:col-span-2">
                <div className="font-semibold text-amber-800">Benturan jadwal</div>
                <div className="text-xs text-amber-700">Perseptor sudah ditugaskan di {benturan.puskesmas} pada tanggal yang sama (topik: {benturan.topik}). Centang opsi di bawah jika ini memang disengaja.</div>
              </div>
            )}
          </div>
          <DialogFooter className="items-center">
            {benturan && (
              <label className="mr-auto flex items-center gap-1.5 text-xs">
                <Checkbox checked={form.paksa === true} onCheckedChange={(c) => setForm({ ...form, paksa: c === true })} />
                Tetap simpan meski benturan (disengaja)
              </label>
            )}
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={() => save(false)} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tunda */}
      <Dialog open={!!tundaDialog} onOpenChange={(o) => !o && setTundaDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Tunda Kegiatan</DialogTitle></DialogHeader>
          <Label className="text-xs">Alasan penundaan</Label>
          <Textarea rows={3} value={tundaAlasan} onChange={(e) => setTundaAlasan(e.target.value)} placeholder="Contoh: bentrok kegiatan posyandu" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTundaDialog(null)}>Batal</Button>
            <Button onClick={submitTunda}>Tunda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
            <AlertDialogDescription>Jadwal yang sudah memiliki instrumen/temuan tidak dapat dihapus — batalkan atau tunda saja.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
