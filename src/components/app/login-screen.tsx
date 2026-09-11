'use client'

import { useState } from 'react'
import { apiPost } from '@/lib/client-api'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Eye, EyeOff, Loader2, ShieldCheck, HeartPulse, Users, ClipboardCheck } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const DEMO_AKUN = [
  { role: 'Superadmin Dinas', email: 'superadmin@dinkes.go.id', pass: 'dinkes123' },
  { role: 'Admin Dinas', email: 'admin@dinkes.go.id', pass: 'dinkes123' },
  { role: 'Perseptor', email: 'ratna.widyaningrum@dinkes.go.id', pass: 'perseptor123' },
  { role: 'Admin Puskesmas', email: 'admin.sukamaju@puskesmas.go.id', pass: 'puskes123' },
  { role: 'Peserta', email: 'budianto@puskesmas.go.id', pass: 'peserta123' },
]

export function LoginScreen() {
  const { setAuth } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  async function doLogin(e?: React.FormEvent, demEmail?: string, demPass?: string) {
    e?.preventDefault()
    const em = demEmail || email
    const pw = demPass || password
    if (!em || !pw) {
      toast({ title: 'Perhatian', description: 'Email dan password wajib diisi.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const res = await apiPost<{ user: any }>('/api/auth/login', { email: em, password: pw })
      setAuth(res.user)
      toast({ title: 'Selamat datang', description: `Anda masuk sebagai ${res.user.nama}` })
    } catch (err: any) {
      toast({ title: 'Gagal masuk', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-teal-50 via-slate-50 to-emerald-50">
      {/* Kiri: branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-teal-800 p-10 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-widest">PERSEPTOR</div>
              <div className="text-xs text-teal-200">Program Pembimbingan dan Supervisi Klinik Terintegrasi</div>
            </div>
          </div>
          <p className="mt-10 max-w-md text-2xl font-medium leading-relaxed">
            &ldquo;Mendampingi, Membina, Meningkatkan Mutu Pelayanan.&rdquo;
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-teal-100">
            Sistem tata kelola pembimbingan klinik Puskesmas yang terstruktur, terdokumentasi, terukur, dan berkelanjutan — menghubungkan Dinas Kesehatan, perseptor, Puskesmas, dan tenaga kesehatan dalam satu alur utuh.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { icon: HeartPulse, label: 'Pemetaan & Perencanaan' },
            { icon: ClipboardCheck, label: 'Instrumen & Temuan' },
            { icon: ShieldCheck, label: 'Tindak Lanjut & Verifikasi' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl bg-white/10 p-3">
              <f.icon className="mx-auto mb-1.5 h-5 w-5" />
              <div className="leading-tight">{f.label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-teal-200">Dinas Kesehatan Kabupaten bersama Jaringan Puskesmas</div>
      </div>

      {/* Kanan: form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <div className="mb-2 flex items-center justify-center gap-2 lg:justify-start">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white lg:hidden">
                <Activity className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold tracking-widest text-teal-800">PERSEPTOR</div>
            </div>
            <p className="text-sm text-muted-foreground">Masuk untuk mengakses platform pembimbingan klinik</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={doLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="nama@dinkes.go.id" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={show ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" autoComplete="current-password" />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground" aria-label="Tampilkan password">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Masuk
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-white/60 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> AKUN DEMO — klik untuk masuk cepat
            </div>
            <div className="grid gap-1.5">
              {DEMO_AKUN.map((a) => (
                <button
                  key={a.email}
                  onClick={() => doLogin(undefined, a.email, a.pass)}
                  disabled={loading}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50"
                >
                  <span className="font-medium">{a.role}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
