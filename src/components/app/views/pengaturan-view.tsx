'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPut, apiPost } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { PageHeader } from '../ui-bits'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { ROLE_LABELS } from '@/lib/constants'
import { Loader2, Save, Info } from 'lucide-react'

export function PengaturanView() {
  const { user } = useApp()
  const [pengaturan, setPengaturan] = useState<Record<string, string>>({})
  const [form, setForm] = useState<any>({})
  const [profil, setProfil] = useState({ nama: '', email: '' })
  const [passLama, setPassLama] = useState('')
  const [passBaru, setPassBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const isSuper = user?.role === 'SUPERADMIN'

  useEffect(() => {
    Promise.all([
      apiGet('/api/pengaturan'),
      apiGet('/api/auth/me'),
    ]).then(([p, m]) => {
      setPengaturan(p.data)
      setForm({ nama_dinas: p.data.nama_dinas || '', tagline: p.data.tagline || '', tahun_aktif: p.data.tahun_aktif || '' })
      if (m.user) setProfil({ nama: m.user.nama, email: m.user.email })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function simpanPengaturan() {
    setSaving(true)
    try {
      await apiPut('/api/pengaturan', form)
      toast({ title: 'Berhasil', description: 'Konfigurasi sistem diperbarui.' })
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function gantiPassword() {
    if (passBaru.length < 6) return toast({ title: 'Password baru minimal 6 karakter', variant: 'destructive' })
    setSaving(true)
    try {
      // Verifikasi password lama via endpoint login ringan lalu ubah via users API bila berhak
      // Untuk semua role: gunakan endpoint khusus berbasis session
      await apiPost('/api/auth/ganti-password', { passwordLama: passLama, passwordBaru: passBaru })
      toast({ title: 'Berhasil', description: 'Password diperbarui.' })
      setPassLama(''); setPassBaru('')
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Pengaturan" description="Profil akun, keamanan, dan konfigurasi sistem." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profil */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Profil Akun</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {user?.nama.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{user?.nama}</div>
                <Badge variant="outline">{ROLE_LABELS[user?.role || '']}</Badge>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>Email: <span className="font-medium text-foreground">{user?.email}</span></div>
              {user?.puskesmasNama && <div>Puskesmas: <span className="font-medium text-foreground">{user.puskesmasNama}</span></div>}
              {user?.perseptorNama && <div>Perseptor: <span className="font-medium text-foreground">{user.perseptorNama}</span></div>}
            </div>
          </CardContent>
        </Card>

        {/* Ganti password */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Keamanan — Ganti Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Password Lama</Label>
              <Input type="password" className="mt-1" value={passLama} onChange={(e) => setPassLama(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Password Baru (min. 6 karakter)</Label>
              <Input type="password" className="mt-1" value={passBaru} onChange={(e) => setPassBaru(e.target.value)} />
            </div>
            <Button className="bg-teal-700 hover:bg-teal-800" onClick={gantiPassword} disabled={saving || !passLama || !passBaru}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Simpan Password
            </Button>
          </CardContent>
        </Card>

        {/* Konfigurasi sistem (superadmin) */}
        {isSuper && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Info className="h-4 w-4 text-teal-700" /> Konfigurasi Sistem</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Nama Dinas</Label>
                <Input className="mt-1" value={form.nama_dinas || ''} onChange={(e) => setForm({ ...form, nama_dinas: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Tagline</Label>
                <Input className="mt-1" value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Tahun Aktif</Label>
                <Input className="mt-1" type="number" value={form.tahun_aktif || ''} onChange={(e) => setForm({ ...form, tahun_aktif: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <Button className="bg-teal-700 hover:bg-teal-800" onClick={simpanPengaturan} disabled={saving}>
                  <Save className="mr-1.5 h-4 w-4" /> Simpan Konfigurasi
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informasi sistem */}
        <Card className={isSuper ? '' : 'lg:col-span-2'}>
          <CardHeader className="pb-2"><CardTitle className="text-base">Tentang PERSEPTOR</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm text-muted-foreground">
            <div><span className="font-semibold text-foreground">PERSEPTOR</span> — {pengaturan.tagline || 'Mendampingi, Membina, Meningkatkan Mutu Pelayanan.'}</div>
            <div>Program Pembimbingan dan Supervisi Klinik Terintegrasi untuk Dinas Kesehatan Kabupaten bersama jaringan Puskesmas.</div>
            <div className="pt-1">Alur tata kelola: Pemetaan → Perencanaan → Penetapan Perseptor → Penjadwalan → Pembimbingan → Observasi → Diskusi Kasus → Evaluasi → Rekomendasi → Tindak Lanjut → Verifikasi → Monitoring → Pelaporan.</div>
            <div className="pt-1 text-xs">Keamanan: autentikasi session, RBAC 5 peran, scoping data per Puskesmas, validasi input, dan audit trail. Data klinis diperlakukan sensitif & dianonimkan.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
