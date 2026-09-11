'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiDelete, apiUpload } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { PageHeader, BadgeStatus, ErrorState, EmptyState } from '../ui-bits'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { JENIS_DOKUMEN, JENIS_DOKUMEN_LABEL, tanggalSingkat } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { Loader2, Upload, Trash2, Download, FolderOpen } from 'lucide-react'

export function DokumentasiView() {
  const { user } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fJenis, setFJenis] = useState('all')
  const [q, setQ] = useState('')
  const [dialog, setDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({ jenis: 'DOKUMEN', nama: '', deskripsi: '' })
  const [file, setFile] = useState<File | null>(null)

  const bolehUnggah = user?.role !== 'PESERTA'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (fJenis !== 'all') qs.set('jenis', fJenis)
      const res = await apiGet<{ data: any[] }>(`/api/dokumentasi?${qs}`)
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [fJenis])

  useEffect(() => { load() }, [load])

  async function unggah() {
    if (!form.nama) return toast({ title: 'Nama wajib diisi', variant: 'destructive' })
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('jenis', form.jenis)
      fd.append('nama', form.nama)
      if (form.deskripsi) fd.append('deskripsi', form.deskripsi)
      if (file) fd.append('file', file)
      await apiUpload('/api/dokumentasi', fd)
      toast({ title: 'Berhasil', description: 'Dokumentasi tersimpan di server.' })
      setDialog(false)
      setFile(null)
      setForm({ jenis: 'DOKUMEN', nama: '', deskripsi: '' })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function hapus(d: any) {
    try {
      await apiDelete(`/api/dokumentasi?id=${d.id}`)
      toast({ title: 'Dokumentasi dihapus' })
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    }
  }

  const filtered = rows.filter((r) => r.nama.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dokumentasi"
        description="Repositori foto kegiatan, dokumen, instrumen, materi, berita acara, dan bukti tindak lanjut (tersimpan di server, bukan localStorage)."
        actions={bolehUnggah && (
          <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={() => setDialog(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> Unggah Dokumen
          </Button>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-xs">
          <Input placeholder="Cari nama dokumen..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fJenis} onValueChange={setFJenis}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {JENIS_DOKUMEN.map((j) => <SelectItem key={j} value={j}>{JENIS_DOKUMEN_LABEL[j]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error ? <ErrorState message={error} onRetry={load} /> : loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Belum ada dokumentasi" description="Unggah foto kegiatan, dokumen pendukung, atau materi pembimbingan." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((d) => (
            <div key={d.id} className="rounded-xl border p-3">
              <div className="flex items-start justify-between">
                <BadgeStatus label={JENIS_DOKUMEN_LABEL[d.jenis] || d.jenis} className="bg-teal-100 text-teal-800 border-teal-200" />
                {bolehUnggah && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => hapus(d)} aria-label="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-2 line-clamp-2 text-sm font-medium">{d.nama}</div>
              {d.deskripsi && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{d.deskripsi}</div>}
              <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {d.jadwal && <div className="line-clamp-1">Kegiatan: {d.jadwal.topik}</div>}
                {d.puskesmas && <div>{d.puskesmas.nama}</div>}
                <div>{d.fileName || 'tanpa lampiran'} • {tanggalSingkat(d.createdAt)}</div>
                <div>oleh {d.uploadedBy || '—'}</div>
              </div>
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                  <Download className="h-3 w-3" /> Unduh / Lihat
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Unggah Dokumentasi</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={form.jenis} onValueChange={(v) => setForm({ ...form, jenis: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{JENIS_DOKUMEN.map((j) => <SelectItem key={j} value={j}>{JENIS_DOKUMEN_LABEL[j]}</SelectItem>)}</SelectContent>
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
              <Label className="text-xs">File (maks 10 MB)</Label>
              <Input type="file" className="mt-1" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.pptx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={unggah} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Unggah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
