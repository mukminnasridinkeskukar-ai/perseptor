'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/client-api'
import { useApp, isDinas } from '@/lib/store'
import { PageHeader, StatCard, BadgeStatus, ErrorState } from '../ui-bits'
import { DataTable } from '../data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STATUS_RTL_LABEL, STATUS_RTL_COLOR, tanggalSingkat } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, ThumbsUp, RotateCcw, Trash2, AlertOctagon, CheckCheck, Repeat } from 'lucide-react'

export function RtlView() {
  const { user, go } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fStatus, setFStatus] = useState('all')
  const [dialog, setDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ temuanId: '', rekomendasiId: '', kegiatan: '', penanggungJawab: '', targetSelesai: '' })
  const [temuanList, setTemuanList] = useState<any[]>([])
  const [verifDialog, setVerifDialog] = useState<any>(null)
  const [verifAksi, setVerifAksi] = useState('DISETUJUI')
  const [verifCatatan, setVerifCatatan] = useState('')
  const [deleting, setDeleting] = useState<any>(null)

  const dinas = isDinas(user?.role)
  const bolehBuat = dinas || user?.role === 'ADMIN_PUSKESMAS'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (fStatus !== 'all') qs.set('status', fStatus)
      const res = await apiGet<{ data: any[] }>(`/api/rtl?${qs}`)
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fStatus])

  useEffect(() => { load() }, [load])

  async function buatRTL() {
    if (!form.kegiatan) return toast({ title: 'Kegiatan wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      await apiPost('/api/rtl', { ...form, temuanId: form.temuanId === 'NONE' ? '' : form.temuanId, rekomendasiId: form.rekomendasiId === 'NONE' ? '' : form.rekomendasiId })
      toast({ title: 'Berhasil', description: 'RTL dibuat.' })
      setDialog(false)
      await load()
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
      toast({ title: 'Verifikasi tercatat', description: verifAksi === 'DISETUJUI' ? 'RTL menjadi TERVERIFIKASI.' : 'Permintaan perbaikan dikirim ke Puskesmas.' })
      setVerifDialog(null)
      setVerifCatatan('')
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  async function doDelete() {
    try {
      await apiDelete(`/api/rtl/${deleting.id}`)
      toast({ title: 'RTL dihapus' })
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  const stats = {
    aktif: rows.filter((r) => ['BELUM_DIMULAI', 'DALAM_PROSES'].includes(r.status)).length,
    selesai: rows.filter((r) => ['SELESAI', 'TERVERIFIKASI'].includes(r.status)).length,
    terlambat: rows.filter((r) => r.status === 'TERLAMBAT' || (r.terlambatOtomatis && !['SELESAI', 'TERVERIFIKASI'].includes(r.status))).length,
    terverifikasi: rows.filter((r) => r.status === 'TERVERIFIKASI').length,
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rencana Tindak Lanjut (RTL)"
        description="Memastikan setiap temuan memiliki tindak lanjut yang terukur hingga terverifikasi oleh perseptor."
        actions={bolehBuat && (
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={async () => {
            try {
              const t = await apiGet('/api/temuan')
              setTemuanList(t.data.filter((x: any) => !x.rtl?.length))
              setForm({ temuanId: 'NONE', rekomendasiId: 'NONE', kegiatan: '', penanggungJawab: '', targetSelesai: '' })
              setDialog(true)
            } catch { setDialog(true) }
          }}>
            <Plus className="mr-1.5 h-4 w-4" /> Buat RTL
          </Button>
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="RTL Aktif" value={stats.aktif} icon={Repeat} tone="amber" />
        <StatCard label="RTL Selesai" value={stats.selesai} icon={CheckCheck} tone="emerald" />
        <StatCard label="RTL Terlambat" value={stats.terlambat} icon={AlertOctagon} tone="rose" />
        <StatCard label="Terverifikasi" value={stats.terverifikasi} icon={ThumbsUp} tone="teal" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {Object.entries(STATUS_RTL_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : (
        <DataTable
          data={rows}
          loading={loading}
          searchKeys={['kegiatan', 'penanggungJawab']}
          columns={[
            { key: 'kegiatan', header: 'Kegiatan Tindak Lanjut', render: (r) => (
              <div className="max-w-xs">
                <div className="truncate font-medium">{r.kegiatan}</div>
                <div className="truncate text-xs text-muted-foreground">{r.temuan?.jadwal?.topik || '-'}</div>
              </div>
            ) },
            { key: 'puskesmas', header: 'Puskesmas', render: (r) => r.puskesmas?.nama || r.temuan?.jadwal?.puskesmas?.nama || '-' },
            { key: 'penanggungJawab', header: 'PJ' },
            { key: 'targetSelesai', header: 'Target', render: (r) => tanggalSingkat(r.targetSelesai) },
            { key: 'status', header: 'Status', render: (r) => (
              <div className="flex flex-wrap items-center gap-1">
                <BadgeStatus label={STATUS_RTL_LABEL[r.status]} className={STATUS_RTL_COLOR[r.status]} />
                {r.terlambatOtomatis && r.status !== 'TERLAMBAT' && <BadgeStatus label="Lewat Batas" className="bg-rose-100 text-rose-700 border-rose-200" />}
              </div>
            ) },
            { key: 'verifikasiStatus', header: 'Verifikasi', render: (r) => (
              <BadgeStatus label={r.verifikasiStatus} className={r.verifikasiStatus === 'DISETUJUI' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'} />
            ) },
            {
              key: '_aksi', header: 'Aksi', className: 'text-right',
              render: (r) => (
                <div className="flex flex-wrap justify-end gap-1">
                  {(dinas || user?.role === 'ADMIN_PUSKESMAS') && !['TERVERIFIKASI'].includes(r.status) && (
                    <>
                      {r.status === 'BELUM_DIMULAI' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => ubahStatus(r, 'DALAM_PROSES')}>Proses</Button>}
                      {r.status !== 'SELESAI' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => ubahStatus(r, 'SELESAI')}>Selesai</Button>}
                    </>
                  )}
                  {(dinas || user?.role === 'PERSEPTOR') && r.status === 'SELESAI' && (
                    <Button size="sm" className="h-7 bg-teal-700 text-xs hover:bg-teal-800" onClick={() => { setVerifDialog(r); setVerifAksi('DISETUJUI'); setVerifCatatan('') }}>
                      <ThumbsUp className="mr-1 h-3 w-3" /> Verifikasi
                    </Button>
                  )}
                  {dinas && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600" onClick={() => setDeleting(r)} aria-label="Hapus"><Trash2 className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Dialog buat RTL */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Buat Rencana Tindak Lanjut</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs">Berdasarkan Temuan (opsional)</Label>
              <Select value={form.temuanId} onValueChange={(v) => setForm({ ...form, temuanId: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Tidak terkait temuan</SelectItem>
                  {temuanList.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.jadwal?.puskesmas?.nama}: {t.uraian.slice(0, 60)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Kegiatan Tindak Lanjut *</Label>
              <Textarea rows={2} className="mt-1" value={form.kegiatan} onChange={(e) => setForm({ ...form, kegiatan: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Penanggung Jawab</Label>
              <Input className="mt-1" value={form.penanggungJawab} onChange={(e) => setForm({ ...form, penanggungJawab: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Target Selesai</Label>
              <Input type="date" className="mt-1" value={form.targetSelesai} onChange={(e) => setForm({ ...form, targetSelesai: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={buatRTL} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan
            </Button>
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
                { v: 'VERIFIKASI_ULANG', l: 'Verifikasi Ulang', icon: Repeat },
              ].map((a) => (
                <button
                  key={a.v}
                  onClick={() => setVerifAksi(a.v)}
                  className={'rounded-lg border p-2 text-center text-xs font-medium transition-colors ' + (verifAksi === a.v ? 'border-teal-600 bg-teal-50 text-teal-800' : 'text-muted-foreground hover:border-teal-400')}
                >
                  <a.icon className="mx-auto mb-1 h-4 w-4" />
                  {a.l}
                </button>
              ))}
            </div>
            <div>
              <Label className="text-xs">Catatan Verifikasi</Label>
              <Textarea rows={3} className="mt-1" value={verifCatatan} onChange={(e) => setVerifCatatan(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifDialog(null)}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={kirimVerifikasi}>Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* konfirmasi hapus */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus RTL?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{deleting?.kegiatan}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={doDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
