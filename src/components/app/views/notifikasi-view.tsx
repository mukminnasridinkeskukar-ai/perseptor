'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiPatch } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { PageHeader, EmptyState, BadgeStatus } from '../ui-bits'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const TIPE_WARNA: Record<string, string> = {
  INFO: 'bg-slate-100 text-slate-700 border-slate-200',
  JADWAL: 'bg-teal-100 text-teal-800 border-teal-200',
  TEMUAN: 'bg-amber-100 text-amber-800 border-amber-200',
  RTL: 'bg-sky-100 text-sky-700 border-sky-200',
  VERIFIKASI: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  PERINGATAN: 'bg-rose-100 text-rose-700 border-rose-200',
}

export function NotifikasiView() {
  const { setUnread } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ data: any[]; unread: number }>('/api/notifikasi?limit=100')
      setRows(res.data)
      setUnread(res.unread)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [setUnread])

  useEffect(() => { load() }, [load])

  async function tandai(id?: string) {
    try {
      await apiPatch('/api/notifikasi', id ? { id } : { semua: true })
      setRows((prev) => prev.map((n) => (!id || n.id === id) ? { ...n, dibaca: true } : n))
      if (!id) setUnread(0)
      toast({ title: id ? 'Notifikasi ditandai dibaca' : 'Semua notifikasi ditandai dibaca' })
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifikasi"
        description="Pemberitahuan jadwal, perubahan status, temuan, RTL, dan verifikasi. Integrasi WhatsApp/email disiapkan untuk pengembangan berikutnya."
        actions={
          <Button size="sm" variant="outline" onClick={() => tandai()}><CheckCheck className="mr-1.5 h-4 w-4" /> Tandai Semua Dibaca</Button>
        }
      />
      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada notifikasi" description="Notifikasi akan muncul ketika ada jadwal baru, perubahan status, temuan, atau RTL." />
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n.id} className={cn('py-0 transition-colors', !n.dibaca && 'border-teal-300 bg-teal-50/40')}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100">
                  <Bell className="h-4 w-4 text-teal-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{n.judul}</span>
                    <BadgeStatus label={n.tipe} className={TIPE_WARNA[n.tipe] || TIPE_WARNA.INFO} />
                    {!n.dibaca && <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.pesan}</p>
                  <div className="mt-1 text-[11px] text-muted-foreground/70">
                    {new Date(n.createdAt).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {!n.dibaca && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => tandai(n.id)}>Tandai dibaca</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
