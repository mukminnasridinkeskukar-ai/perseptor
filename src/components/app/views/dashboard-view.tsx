'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApp, isDinas } from '@/lib/store'
import { apiGet } from '@/lib/client-api'
import { PageHeader, StatCard, EmptyState, ErrorState } from '../ui-bits'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BULAN_ID, STATUS_JADWAL_COLOR, STATUS_JADWAL_LABEL, tanggalSingkat } from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts'
import {
  Building2, Users, Stethoscope, CalendarDays, CheckCircle2, Hourglass, Repeat, CheckCheck,
  AlertTriangle, Gauge, CalendarClock, Loader2,
} from 'lucide-react'

const WARNA = ['#0f766e', '#14b8a6', '#0d9488', '#f59e0b', '#f97316', '#e11d48', '#64748b', '#10b981', '#84cc16', '#a855f7']

export function DashboardView() {
  const { user, go } = useApp()
  const [filters, setFilters] = useState({ tahun: '2026', bulan: 'all', puskesmasId: 'all', perseptorId: 'all', status: 'all' })
  const [data, setData] = useState<any>(null)
  const [pkmList, setPkmList] = useState<any[]>([])
  const [perList, setPerList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pkmDash, setPkmDash] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (filters.tahun !== 'all') qs.set('tahun', filters.tahun)
      if (filters.bulan !== 'all') qs.set('bulan', filters.bulan)
      if (filters.puskesmasId !== 'all') qs.set('puskesmasId', filters.puskesmasId)
      if (filters.perseptorId !== 'all') qs.set('perseptorId', filters.perseptorId)
      if (filters.status !== 'all') qs.set('status', filters.status)
      const res = await apiGet(`/api/dashboard?${qs.toString()}`)
      setData(res)
      if (user?.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) {
        const p = await apiGet(`/api/dashboard?mode=puskesmas`)
        setPkmDash(p.puskesmas)
      } else if (filters.puskesmasId !== 'all') {
        const p = await apiGet(`/api/dashboard?mode=puskesmas&puskesmasId=${filters.puskesmasId}`)
        setPkmDash(p.puskesmas)
      } else {
        setPkmDash(null)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, user])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (isDinas(user?.role) || user?.role === 'PERSEPTOR') {
      apiGet('/api/master/puskesmas').then((r) => setPkmList(r.data)).catch(() => {})
      apiGet('/api/master/perseptor').then((r) => setPerList(r.data)).catch(() => {})
    }
  }, [user])

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    )
  }
  if (error && !data) return <ErrorState message={error} onRetry={load} />

  const stats = data?.stats
  const charts = data?.charts
  const agenda = data?.agenda || []
  const tahun = new Date().getFullYear()
  const tahunList = [tahun - 2, tahun - 1, tahun, tahun + 1].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Selamat datang, ${user?.nama?.split(',')[0]}`}
        description="Ringkasan tata kelola pembimbingan dan supervisi klinik Puskesmas."
      />

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <FilterSelect label="Tahun" value={filters.tahun} onChange={(v) => setFilters({ ...filters, tahun: v })} options={[{ v: 'all', l: 'Semua Tahun' }, ...tahunList.map((t) => ({ v: String(t), l: String(t) }))]} />
        <FilterSelect label="Bulan" value={filters.bulan} onChange={(v) => setFilters({ ...filters, bulan: v })} options={[{ v: 'all', l: 'Semua Bulan' }, ...BULAN_ID.map((b, i) => ({ v: String(i + 1), l: b }))]} />
        {(isDinas(user?.role) || user?.role === 'PERSEPTOR') && (
          <FilterSelect label="Puskesmas" value={filters.puskesmasId} onChange={(v) => setFilters({ ...filters, puskesmasId: v })} options={[{ v: 'all', l: 'Semua Puskesmas' }, ...pkmList.map((p) => ({ v: p.id, l: p.nama }))]} />
        )}
        {isDinas(user?.role) && (
          <FilterSelect label="Perseptor" value={filters.perseptorId} onChange={(v) => setFilters({ ...filters, perseptorId: v })} options={[{ v: 'all', l: 'Semua Perseptor' }, ...perList.map((p) => ({ v: p.id, l: p.nama }))]} />
        )}
        <FilterSelect
          label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
          options={[{ v: 'all', l: 'Semua Status' }, ...Object.entries(STATUS_JADWAL_LABEL).map(([v, l]) => ({ v, l }))]}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Puskesmas" value={stats?.totalPuskesmas ?? 0} icon={Building2} tone="teal" onClick={() => go('puskesmas')} />
        <StatCard label="Total Perseptor" value={stats?.totalPerseptor ?? 0} icon={Users} tone="emerald" onClick={() => go('perseptor')} />
        <StatCard label="Tenaga Kesehatan" value={stats?.totalTenagaKesehatan ?? 0} icon={Stethoscope} tone="sky" onClick={() => go('tenaga-kesehatan')} />
        <StatCard label="Pembimbingan Terjadwal" value={stats?.pembimbinganTerjadwal ?? 0} sub={`${stats?.pembimbinganBerlangsung ?? 0} berlangsung`} icon={CalendarDays} tone="teal" onClick={() => go('jadwal')} />
        <StatCard label="Pembimbingan Selesai" value={stats?.pembimbinganSelesai ?? 0} icon={CheckCircle2} tone="emerald" onClick={() => go('riwayat')} />
        <StatCard label="Belum Dilaksanakan" value={stats?.pembimbinganBelumDilaksanakan ?? 0} icon={Hourglass} tone="amber" onClick={() => go('jadwal')} />
        <StatCard label="Tindak Lanjut Aktif" value={stats?.tindakLanjutAktif ?? 0} icon={Repeat} tone="amber" onClick={() => go('tindak-lanjut')} />
        <StatCard label="Tindak Lanjut Selesai" value={stats?.tindakLanjutSelesai ?? 0} icon={CheckCheck} tone="emerald" onClick={() => go('tindak-lanjut')} />
        <StatCard label="Temuan Prioritas" value={stats?.temuanPrioritas ?? 0} sub="Risiko tinggi & kritis" icon={AlertTriangle} tone="rose" onClick={() => go('temuan')} />
        <StatCard label="Penyelesaian RTL" value={`${stats?.penyelesaianRTL ?? 0}%`} icon={Gauge} tone="teal" onClick={() => go('tindak-lanjut')} />
      </div>

      {/* Dashboard Puskesmas (section 20) */}
      {pkmDash && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dashboard Puskesmas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <MiniGroup title="Pembimbingan" rows={[['Terjadwal', pkmDash.pembimbingan.terjadwal], ['Selesai', pkmDash.pembimbingan.selesai], ['Mendatang', pkmDash.pembimbingan.mendatang]]} />
            <MiniGroup title="Temuan" rows={[['Total', pkmDash.temuan.total], ['Prioritas Tinggi', pkmDash.temuan.prioritasTinggi], ['Belum Selesai', pkmDash.temuan.belumSelesai]]} />
            <MiniGroup title="RTL" rows={[['Aktif', pkmDash.rtl.aktif], ['Selesai', pkmDash.rtl.selesai], ['Terlambat', pkmDash.rtl.terlambat]]} />
            <MiniGroup title="Kompetensi" rows={[['Meningkat', pkmDash.kompetensi.meningkat], ['Perlu Pendampingan', pkmDash.kompetensi.perluPendampingan]]} />
          </CardContent>
        </Card>
      )}

      {/* Grafik baris 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pembimbingan per Bulan</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.perBulan} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="jumlah" name="Total" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="selesai" name="Selesai" fill="#5eead4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Pembimbingan per Puskesmas</CardTitle></CardHeader>
          <CardContent className="h-64">
            {charts?.perPuskesmas?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.perPuskesmas} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nama" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Kegiatan" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Belum ada data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grafik baris 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Peserta berdasarkan Profesi</CardTitle></CardHeader>
          <CardContent className="h-60">
            {charts?.perProfesi?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.perProfesi} dataKey="jumlah" nameKey="profesi" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {charts.perProfesi.map((_: any, i: number) => <Cell key={i} fill={WARNA[i % WARNA.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Belum ada data" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Jenis Temuan</CardTitle></CardHeader>
          <CardContent className="h-60">
            {charts?.jenisTemuan?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.jenisTemuan} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="kategori" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={54} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="jumlah" name="Temuan" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Belum ada data" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Status Tindak Lanjut</CardTitle></CardHeader>
          <CardContent className="h-60">
            {charts?.statusRTL?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts.statusRTL.map((s: any) => ({ ...s, nama: STATUS_JADWAL_LABEL[s.status] || s.status }))} dataKey="jumlah" nameKey="nama" innerRadius={40} outerRadius={70} paddingAngle={2}>
                    {charts.statusRTL.map((_: any, i: number) => <Cell key={i} fill={[ '#94a3b8', '#f59e0b', '#0ea5e9', '#10b981', '#e11d48'][i % 5]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState title="Belum ada data" />}
          </CardContent>
        </Card>
      </div>

      {/* Grafik kompetensi + agenda */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Perkembangan Kompetensi (Rata-rata Skor Evaluasi)</CardTitle></CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.kompetensiTren} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradKomp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="rata" name="Rata-rata skor" stroke="#0f766e" strokeWidth={2.5} fill="url(#gradKomp)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="h-4 w-4 text-teal-700" /> Agenda Mendatang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {agenda.length === 0 ? (
              <EmptyState title="Tidak ada agenda mendatang" />
            ) : (
              agenda.map((a: any) => (
                <button
                  key={a.id}
                  onClick={() => go('pembimbingan-detail', { id: a.id })}
                  className="block w-full rounded-lg border p-2.5 text-left transition-colors hover:border-teal-400 hover:bg-teal-50/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-sm font-semibold">{a.topik}</span>
                    <Badge variant="outline" className={STATUS_JADWAL_COLOR[a.status]}>{STATUS_JADWAL_LABEL[a.status]}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{a.puskesmas.nama} • {tanggalSingkat(a.tanggal)} • {a.waktuMulai}</div>
                  <div className="text-xs text-muted-foreground">Perseptor: {a.perseptor.nama}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ v: string; l: string }> }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function MiniGroup({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-bold tabular-nums">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
