'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, StatCard, ErrorState } from '../ui-bits'
import { DataTable } from '../data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BadgeStatus } from '../ui-bits'
import { PRIORITAS_COLOR, PRIORITAS_LABEL } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Map, Flame, TrendingUp, Minus, Loader2 } from 'lucide-react'

const priorSkor: Record<string, string> = { SANGAT_TINGGI: 'bg-rose-600', TINGGI: 'bg-orange-500', SEDANG: 'bg-amber-400', RENDAH: 'bg-emerald-500' }

export function PemetaanView() {
  const { user, go } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [pkmList, setPkmList] = useState<any[]>([])
  const [kompList, setKompList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  const canWrite = isDinas(user?.role) || user?.role === 'ADMIN_PUSKESMAS'
  const canDelete = isDinas(user?.role)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, k] = await Promise.all([
        apiGet('/api/pemetaan'),
        apiGet('/api/master/kompetensi'),
      ])
      setRows(p.data)
      setKompList(k.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    apiGet('/api/master/puskesmas').then((r) => setPkmList(r.data)).catch(() => {})
  }, [])

  function openCreate() {
    setEditing(null)
    setForm({ tahun: '2026', puskesmasId: user?.puskesmasId || '', kompetensiId: '', masalah: '', kasusSering: '', risiko: '', kebutuhan: '', skor: 5, catatan: '' })
    setDialog(true)
  }

  function openEdit(r: any) {
    setEditing(r)
    setForm({
      tahun: String(r.tahun), puskesmasId: r.puskesmasId, kompetensiId: r.kompetensiId || '',
      masalah: r.masalah || '', kasusSering: r.kasusSering || '', risiko: r.risiko || '',
      kebutuhan: r.kebutuhan || '', skor: r.skor, catatan: r.catatan || '',
    })
    setDialog(true)
  }

  async function save() {
    if (!form.puskesmasId) return toast({ title: 'Puskesmas wajib dipilih', variant: 'destructive' })
    setSaving(true)
    try {
      if (editing) await apiPut(`/api/pemetaan/${editing.id}`, form)
      else await apiPost('/api/pemetaan', form)
      toast({ title: 'Berhasil', description: 'Pemetaan kebutuhan tersimpan.' })
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
      await apiDelete(`/api/pemetaan/${deleting.id}`)
      toast({ title: 'Berhasil', description: 'Data pemetaan dihapus.' })
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  const stats = {
    sangatTinggi: rows.filter((r) => r.prioritas === 'SANGAT_TINGGI').length,
    tinggi: rows.filter((r) => r.prioritas === 'TINGGI').length,
    sedang: rows.filter((r) => r.prioritas === 'SEDANG').length,
    rendah: rows.filter((r) => r.prioritas === 'RENDAH').length,
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pemetaan Kebutuhan Pembimbingan"
        description="Identifikasi kompetensi yang perlu diperkuat, masalah pelayanan, dan kebutuhan pendampingan per Puskesmas. Hasil pemetaan menjadi masukan perencanaan program."
        actions={canWrite && (
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" /> Tambah Pemetaan</Button>
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Prioritas Sangat Tinggi" value={stats.sangatTinggi} icon={Flame} tone="rose" />
        <StatCard label="Prioritas Tinggi" value={stats.tinggi} icon={TrendingUp} tone="amber" />
        <StatCard label="Prioritas Sedang" value={stats.sedang} icon={Minus} tone="teal" />
        <StatCard label="Prioritas Rendah" value={stats.rendah} icon={Map} tone="emerald" />
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          data={rows}
          loading={loading}
          searchKeys={['masalah', 'kebutuhan', 'puskesmas']}
          columns={[
            { key: 'puskesmas', header: 'Puskesmas', render: (r) => <span className="font-medium">{r.puskesmas?.nama || '-'}</span> },
            { key: 'kompetensi', header: 'Kompetensi', render: (r) => r.kompetensiTeks || r.kompetensi?.nama || '-' },
            { key: 'masalah', header: 'Masalah', render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.masalah}</span> },
            { key: 'kebutuhan', header: 'Kebutuhan', render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.kebutuhan}</span> },
            { key: 'skor', header: 'Skor', render: (r) => <span className="font-bold tabular-nums">{r.skor}/8</span> },
            { key: 'prioritas', header: 'Prioritas', render: (r) => <BadgeStatus label={PRIORITAS_LABEL[r.prioritas]} className={PRIORITAS_COLOR[r.prioritas]} /> },
            { key: 'status', header: 'Status', render: (r) => <BadgeStatus label={{ DIPROSES: 'Diproses', MASUK_PERENCANAAN: 'Masuk Perencanaan', SELESAI: 'Selesai' }[r.status] || r.status} className="bg-slate-100 text-slate-700 border-slate-200" /> },
            ...(canWrite ? [{
              key: '_aksi', header: 'Aksi', className: 'text-right',
              render: (r: any) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(r) }} aria-label="Ubah"><Pencil className="h-3.5 w-3.5" /></Button>
                  {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={(e) => { e.stopPropagation(); setDeleting(r) }} aria-label="Hapus"><Trash2 className="h-3.5 w-3.5" /></Button>}
                </div>
              ),
            }] : []),
          ]}
        />
      )}

      {/* Dialog form */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Ubah Pemetaan' : 'Tambah Pemetaan Kebutuhan'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Puskesmas *</Label>
              <Select value={form.puskesmasId || ''} onValueChange={(v) => setForm({ ...form, puskesmasId: v })} disabled={user?.role === 'ADMIN_PUSKESMAS'}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih Puskesmas" /></SelectTrigger>
                <SelectContent>
                  {(user?.role === 'ADMIN_PUSKESMAS' && user.puskesmasId ? pkmList.filter((p) => p.id === user.puskesmasId) : pkmList).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tahun</Label>
              <Input type="number" className="mt-1" value={form.tahun || ''} onChange={(e) => setForm({ ...form, tahun: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Kompetensi yang perlu diperkuat</Label>
              <Select value={form.kompetensiId || ''} onValueChange={(v) => {
                const k = kompList.find((x) => x.id === v)
                setForm({ ...form, kompetensiId: v, kompetensiTeks: k?.nama || '' })
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kompetensi" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {kompList.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.kelompok}: {k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Masalah pelayanan yang ditemukan</Label>
              <Textarea rows={2} className="mt-1" value={form.masalah || ''} onChange={(e) => setForm({ ...form, masalah: e.target.value })} placeholder="Contoh: kepatuhan hand hygiene rendah, dokumentasi belum lengkap..." />
            </div>
            <div>
              <Label className="text-xs">Kasus yang sering muncul</Label>
              <Textarea rows={2} className="mt-1" value={form.kasusSering || ''} onChange={(e) => setForm({ ...form, kasusSering: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Risiko pelayanan</Label>
              <Textarea rows={2} className="mt-1" value={form.risiko || ''} onChange={(e) => setForm({ ...form, risiko: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Kebutuhan pembimbingan / pendampingan</Label>
              <Textarea rows={2} className="mt-1" value={form.kebutuhan || ''} onChange={(e) => setForm({ ...form, kebutuhan: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Skor Prioritas (1-8): otomatis menentukan level prioritas</Label>
              <div className="mt-1.5 flex items-center gap-3">
                <input
                  type="range" min={1} max={8} value={form.skor || 1}
                  onChange={(e) => setForm({ ...form, skor: parseInt(e.target.value) })}
                  className="w-full accent-teal-700"
                />
                <span className="w-8 text-center font-bold tabular-nums">{form.skor}</span>
                <BadgeStatus
                  label={PRIORITAS_LABEL[(form.skor >= 7 ? 'SANGAT_TINGGI' : form.skor >= 5 ? 'TINGGI' : form.skor >= 3 ? 'SEDANG' : 'RENDAH')]}
                  className={PRIORITAS_COLOR[(form.skor >= 7 ? 'SANGAT_TINGGI' : form.skor >= 5 ? 'TINGGI' : form.skor >= 3 ? 'SEDANG' : 'RENDAH')]}
                />
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">1-2 Rendah • 3-4 Sedang • 5-6 Tinggi • 7-8 Sangat Tinggi</div>
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
          <AlertDialogHeader><AlertDialogTitle>Hapus data pemetaan?</AlertDialogTitle>
            <AlertDialogDescription>Data pemetaan akan dihapus permanen dan tercatat di audit trail.</AlertDialogDescription>
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
