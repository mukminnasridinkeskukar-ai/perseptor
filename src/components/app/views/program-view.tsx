'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, BadgeStatus, ErrorState } from '../ui-bits'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '../data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRIORITAS_COLOR, PRIORITAS_LABEL, PERIODE_PROGRAM, PERIODE_PROGRAM_LABEL } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-react'

export function ProgramView() {
  const { user, go } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [pkmList, setPkmList] = useState<any[]>([])
  const [perList, setPerList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  const dinas = isDinas(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, pk, pr] = await Promise.all([
        apiGet('/api/program'),
        apiGet('/api/master/puskesmas'),
        apiGet('/api/master/perseptor'),
      ])
      setRows(p.data)
      setPkmList(pk.data)
      setPerList(pr.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ nama: '', tahun: '2026', periode: 'TAHUNAN', jenis: 'REGULER', puskesmasId: '', bidang: '', topik: '', tujuan: '', perseptorId: '', sasaran: '', prioritas: 'SEDANG', target: '', status: 'DRAFT' })
    setDialog(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    setForm({
      nama: r.nama, tahun: String(r.tahun), periode: r.periode, jenis: r.jenis,
      puskesmasId: r.puskesmasId || '', bidang: r.bidang || '', topik: r.topik || '', tujuan: r.tujuan || '',
      perseptorId: r.perseptorId || '', sasaran: r.sasaran || '', prioritas: r.prioritas, target: r.target || '', status: r.status,
    })
    setDialog(true)
  }

  async function save() {
    if (!form.nama) return toast({ title: 'Nama kegiatan wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      if (editing) await apiPut(`/api/program/${editing.id}`, form)
      else await apiPost('/api/program', form)
      toast({ title: 'Berhasil', description: 'Program pembimbingan tersimpan.' })
      setDialog(false)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/program/${deleting.id}`)
      toast({ title: 'Berhasil', description: 'Program dihapus.' })
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  async function duplicate(r: any) {
    try {
      await apiPost(`/api/program/${r.id}/duplicate`)
      toast({ title: 'Berhasil', description: `Program "${r.nama}" disalin sebagai draft.` })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Program Pembimbingan"
        description="Perencanaan pembimbingan: tahunan, semester, bulanan, khusus, berbasis kasus, maupun kebutuhan Puskesmas."
        actions={dinas && (
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Buat Program</Button>
        )}
      />

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          data={rows}
          loading={loading}
          searchKeys={['nama', 'topik', 'bidang']}
          columns={[
            { key: 'nama', header: 'Nama Kegiatan', render: (r) => (
              <div className="max-w-xs">
                <div className="truncate font-medium">{r.nama}</div>
                <div className="truncate text-xs text-muted-foreground">{r.topik}</div>
              </div>
            ) },
            { key: 'tahun', header: 'Tahun', render: (r) => <span className="tabular-nums">{r.tahun}</span> },
            { key: 'periode', header: 'Periode', render: (r) => <Badge variant="outline">{PERIODE_PROGRAM_LABEL[r.periode] || r.periode}</Badge> },
            { key: 'bidang', header: 'Bidang', render: (r) => r.bidang || '-' },
            { key: 'puskesmas', header: 'Puskesmas', render: (r) => r.puskesmas?.nama || 'Semua' },
            { key: 'perseptor', header: 'Perseptor', render: (r) => r.perseptor?.nama || '-' },
            { key: 'prioritas', header: 'Prioritas', render: (r) => <BadgeStatus label={PRIORITAS_LABEL[r.prioritas]} className={PRIORITAS_COLOR[r.prioritas]} /> },
            { key: 'status', header: 'Status', render: (r) => <BadgeStatus label={{ DRAFT: 'Draft', AKTIF: 'Aktif', SELESAI: 'Selesai', DIBATALKAN: 'Dibatalkan' }[r.status] || r.status} className={{ DRAFT: 'bg-slate-100 text-slate-700 border-slate-200', AKTIF: 'bg-teal-100 text-teal-700 border-teal-200', SELESAI: 'bg-emerald-100 text-emerald-700 border-emerald-200', DIBATALKAN: 'bg-rose-100 text-rose-700 border-rose-200' }[r.status] || ''} /> },
            { key: '_count', header: 'Jadwal', render: (r) => <span className="tabular-nums">{r._count?.jadwal ?? 0}</span> },
            ...(dinas ? [{
              key: '_aksi', header: 'Aksi', className: 'text-right',
              render: (r: any) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(r) }} aria-label="Ubah"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); duplicate(r) }} aria-label="Duplikasi"><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={(e) => { e.stopPropagation(); setDeleting(r) }} aria-label="Hapus"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ),
            }] : []),
          ]}
        />
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Program' : 'Buat Program Pembimbingan'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Nama Kegiatan *</Label>
              <Input className="mt-1" value={form.nama || ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Pembimbingan Semester 1 2026 — Keselamatan Pasien" />
            </div>
            <div>
              <Label className="text-xs">Tahun</Label>
              <Input type="number" className="mt-1" value={form.tahun || ''} onChange={(e) => setForm({ ...form, tahun: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Periode</Label>
              <Select value={form.periode} onValueChange={(v) => setForm({ ...form, periode: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODE_PROGRAM.map((p) => <SelectItem key={p} value={p}>{PERIODE_PROGRAM_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Jenis Program</Label>
              <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['REGULER', 'KHUSUS', 'KASUS', 'KEBUTUHAN'].map((p) => <SelectItem key={p} value={p}>{p === 'REGULER' ? 'Reguler' : p === 'KHUSUS' ? 'Khusus' : p === 'KASUS' ? 'Berbasis Kasus' : 'Berbasis Kebutuhan'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bidang / Profesi</Label>
              <Input className="mt-1" value={form.bidang || ''} onChange={(e) => setForm({ ...form, bidang: e.target.value })} placeholder="Kegawatdaruratan, Kebidanan..." />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Topik</Label>
              <Input className="mt-1" value={form.topik || ''} onChange={(e) => setForm({ ...form, topik: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Tujuan</Label>
              <Textarea rows={2} className="mt-1" value={form.tujuan || ''} onChange={(e) => setForm({ ...form, tujuan: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Puskesmas Sasaran (opsional)</Label>
              <Select value={form.puskesmasId || 'ALL'} onValueChange={(v) => setForm({ ...form, puskesmasId: v === 'ALL' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Puskesmas</SelectItem>
                  {pkmList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Perseptor Penanggung Jawab</Label>
              <Select value={form.perseptorId || 'NONE'} onValueChange={(v) => setForm({ ...form, perseptorId: v === 'NONE' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Belum ditetapkan</SelectItem>
                  {perList.map((p) => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Sasaran</Label>
              <Input className="mt-1" value={form.sasaran || ''} onChange={(e) => setForm({ ...form, sasaran: e.target.value })} placeholder="Tim IGD, Bidan desa..." />
            </div>
            <div>
              <Label className="text-xs">Prioritas</Label>
              <Select value={form.prioritas} onValueChange={(v) => setForm({ ...form, prioritas: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITAS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Target</Label>
              <Input className="mt-1" value={form.target || ''} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="≥ 85% tenaga terbimbing..." />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['DRAFT', 'AKTIF', 'SELESAI', 'DIBATALKAN'].map((s) => <SelectItem key={s} value={s}>{s === 'DRAFT' ? 'Draft' : s === 'AKTIF' ? 'Aktif' : s === 'SELESAI' ? 'Selesai' : 'Dibatalkan'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus program?</AlertDialogTitle>
            <AlertDialogDescription>Program yang masih memiliki jadwal tidak dapat dihapus — ubah status menjadi Dibatalkan.</AlertDialogDescription>
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
