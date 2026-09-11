'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/client-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { PageHeader, ErrorState } from '../ui-bits'
import { DataTable, type Column } from '../data-table'
import { Plus, Pencil, Trash2, Download, Loader2 } from 'lucide-react'
import { useApp } from '@/lib/store'

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'switch' | 'email' | 'password' | 'multiselect'
  options?: Array<{ v: string; l: string }> | 'kompetensi' | 'puskesmas' | 'perseptor' | 'tenaga'
  required?: boolean
  placeholder?: string
  help?: string
  colSpan?: 1 | 2
}

export function ResourceManager({
  title, description, endpoint, fields, columns, searchKeys, canWrite, canDelete, exportName,
}: {
  title: string
  description?: string
  endpoint: string
  fields: FieldDef[]
  columns: Column<any>[]
  searchKeys: string[]
  canWrite: boolean
  canDelete?: boolean
  exportName?: string
}) {
  const { user } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<any>(null)
  const [optionsMap, setOptionsMap] = useState<Record<string, Array<{ v: string; l: string }>>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ data: any[] }>(endpoint)
      setRows(res.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { load() }, [load])

  // Muat opsi relasi
  useEffect(() => {
    const needs: string[] = fields.filter((f) => typeof f.options === 'string').map((f) => f.options as string)
    needs.forEach(async (n) => {
      try {
        if (n === 'puskesmas') {
          const r = await apiGet('/api/master/puskesmas')
          setOptionsMap((m) => ({ ...m, puskesmas: r.data.map((x: any) => ({ v: x.id, l: x.nama })) }))
        } else if (n === 'perseptor') {
          const r = await apiGet('/api/master/perseptor')
          setOptionsMap((m) => ({ ...m, perseptor: r.data.map((x: any) => ({ v: x.id, l: x.nama })) }))
        } else if (n === 'tenaga') {
          const r = await apiGet('/api/master/tenaga-kesehatan')
          setOptionsMap((m) => ({ ...m, tenaga: r.data.map((x: any) => ({ v: x.id, l: `${x.nama} (${x.puskesmas?.nama || '-'})` })) }))
        } else if (n === 'kompetensi') {
          const r = await apiGet('/api/master/kompetensi')
          setOptionsMap((m) => ({ ...m, kompetensi: r.data.map((x: any) => ({ v: x.id, l: `${x.kelompok}: ${x.nama}` })) }))
        }
      } catch { /* ignore */ }
    })
  }, [fields])

  function openCreate() {
    const init: Record<string, any> = {}
    fields.forEach((f) => { init[f.key] = f.type === 'switch' ? true : '' })
    setForm(init)
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(row: any) {
    const init: Record<string, any> = {}
    fields.forEach((f) => {
      let v = row[f.key]
      if (f.type === 'date' && v) v = new Date(v).toISOString().slice(0, 10)
      if (f.type === 'multiselect' && v) v = String(v).split(',').map((s: string) => s.trim())
      if (f.type === 'select' && v && typeof f.options === 'string') {
        // Untuk relasi: konversi id -> nama via row terkait
        const relKey = f.key.replace('Id', '')
        const relName = row[relKey]?.nama || row[relKey]?.kelompok
        if (relName) v = row[f.key]
      }
      init[f.key] = v ?? (f.type === 'switch' ? false : '')
    })
    setForm(init)
    setEditing(row)
    setDialogOpen(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      for (const f of fields) {
        let v = form[f.key]
        if (f.type === 'password' && !v) continue
        if (f.type === 'switch') v = v === true
        payload[f.key] = v
      }
      if (editing) {
        await apiPut(`${endpoint}/${editing.id}`, payload)
        toast({ title: 'Berhasil', description: `${title} diperbarui.` })
      } else {
        await apiPost(endpoint, payload)
        toast({ title: 'Berhasil', description: `${title} ditambahkan.` })
      }
      setDialogOpen(false)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await apiDelete(`${endpoint}/${deleting.id}`)
      toast({ title: 'Berhasil', description: 'Data dihapus atau dinonaktifkan bila masih terpakai.' })
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' })
      setDeleting(null)
    }
  }

  function exportCsv() {
    if (!rows.length) return
    const headers = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object' || rows[0][k] === null)
    const lines = [headers.join(';'), ...rows.map((r) => headers.map((h) => {
      const s = String(r[h] ?? '').replace(/"/g, '""')
      return /[",;\n]/.test(s) ? `"${s}"` : s
    }).join(';'))]
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${exportName || 'data'}.csv`
    a.click()
  }

  const allCols = useMemo<Column<any>[]>(() => {
    if (!canWrite) return columns
    return [
      ...columns,
      {
        key: '_aksi',
        header: 'Aksi',
        className: 'text-right',
        render: (row: any) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(row) }} aria-label="Ubah">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {canDelete !== false && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={(e) => { e.stopPropagation(); setDeleting(row) }} aria-label="Hapus">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ),
      },
    ]
  }, [columns, canWrite, canDelete])

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1.5 h-4 w-4" /> Ekspor CSV</Button>
            {canWrite && (
              <Button size="sm" className="bg-teal-700 hover:bg-teal-800" onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" /> Tambah
              </Button>
            )}
          </>
        }
      />
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <DataTable data={rows} columns={allCols} searchKeys={searchKeys} loading={loading} emptyText={`Belum ada data ${title.toLowerCase()}.`} />
      )}

      {/* Dialog form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${title}` : `Tambah ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {fields.map((f) => {
              const opts: Array<{ v: string; l: string }> = typeof f.options === 'string' ? optionsMap[f.options] || [] : f.options || []
              return (
                <div key={f.key} className={f.colSpan === 2 ? 'col-span-full' : ''}>
                  {f.type === 'switch' ? (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{f.label}</div>
                        {f.help && <div className="text-xs text-muted-foreground">{f.help}</div>}
                      </div>
                      <Switch checked={form[f.key] === true} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} />
                    </div>
                  ) : f.type === 'select' ? (
                    <>
                      <Label className="text-xs">{f.label}{f.required && ' *'}</Label>
                      <Select value={form[f.key] || ''} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={`Pilih ${f.label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                          {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </>
                  ) : f.type === 'textarea' ? (
                    <>
                      <Label className="text-xs">{f.label}{f.required && ' *'}</Label>
                      <Textarea rows={3} className="mt-1" value={form[f.key] || ''} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <Label className="text-xs">{f.label}{f.required && ' *'}</Label>
                      <Input
                        className="mt-1"
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'password' ? 'password' : 'text'}
                        value={form[f.key] || ''}
                        placeholder={f.placeholder}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                      {f.help && <div className="mt-0.5 text-[11px] text-muted-foreground">{f.help}</div>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Data yang masih terpakai di kegiatan lain akan dinonaktifkan, bukan dihapus. Tindakan ini tercatat pada audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={confirmDelete}>Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
