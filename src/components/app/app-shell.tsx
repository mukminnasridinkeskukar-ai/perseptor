'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp, isDinas } from '@/lib/store'
import { apiGet, apiPost, apiPatch } from '@/lib/client-api'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import {
  Activity, LayoutDashboard, Map, CalendarDays, ClipboardList, History, Users, Building2, Stethoscope,
  Award, AlertTriangle, Repeat, BarChart3, FolderOpen, Database, Settings, Bell, LogOut, Search,
  ChevronDown, Menu, MessageSquare, FileText, UserCog, TrendingUp,
} from 'lucide-react'
import { DashboardView } from './views/dashboard-view'
import { PemetaanView } from './views/pemetaan-view'
import { ProgramView } from './views/program-view'
import { JadwalView } from './views/jadwal-view'
import { DetailView } from './views/detail-view'
import { TemuanView } from './views/temuan-view'
import { RtlView } from './views/rtl-view'
import { LaporanView } from './views/laporan-view'
import { DokumentasiView } from './views/dokumentasi-view'
import { MasterView } from './views/master-view'
import { PerseptorView } from './views/perseptor-view'
import { PuskesmasView } from './views/puskesmas-view'
import { TenagaKesehatanView } from './views/tenaga-kesehatan-view'
import { KompetensiView } from './views/kompetensi-view'
import { PengaturanView } from './views/pengaturan-view'
import { NotifikasiView } from './views/notifikasi-view'
import { AuditView } from './views/audit-view'

interface MenuDef {
  key: string
  label: string
  icon: any
  roles?: string[]
  children?: MenuDef[]
}

const MENU: MenuDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    key: 'pembimbingan', label: 'Pembimbingan', icon: CalendarDays,
    children: [
      { key: 'pemetaan', label: 'Pemetaan', icon: Map },
      { key: 'program', label: 'Program', icon: ClipboardList },
      { key: 'jadwal', label: 'Jadwal', icon: CalendarDays },
      { key: 'pelaksanaan', label: 'Pelaksanaan', icon: TrendingUp },
      { key: 'riwayat', label: 'Riwayat', icon: History },
    ],
  },
  { key: 'perseptor', label: 'Perseptor', icon: Users },
  { key: 'puskesmas', label: 'Puskesmas', icon: Building2 },
  { key: 'tenaga-kesehatan', label: 'Tenaga Kesehatan', icon: Stethoscope },
  { key: 'kompetensi', label: 'Kompetensi', icon: Award },
  { key: 'temuan', label: 'Temuan', icon: AlertTriangle },
  { key: 'tindak-lanjut', label: 'Tindak Lanjut', icon: Repeat },
  { key: 'laporan', label: 'Laporan', icon: BarChart3 },
  { key: 'dokumentasi', label: 'Dokumentasi', icon: FolderOpen },
  {
    key: 'master-data', label: 'Master Data', icon: Database, roles: ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'],
    children: [
      { key: 'master-puskesmas', label: 'Puskesmas', icon: Building2 },
      { key: 'master-perseptor', label: 'Perseptor', icon: Users },
      { key: 'master-tenaga', label: 'Tenaga Kesehatan', icon: Stethoscope },
      { key: 'master-kompetensi', label: 'Jenis Kompetensi', icon: Award },
      { key: 'master-users', label: 'Pengguna Sistem', icon: UserCog, roles: ['SUPERADMIN', 'ADMIN_DINAS'] },
    ],
  },
  {
    key: 'sistem', label: 'Sistem', icon: Settings, roles: ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'],
    children: [
      { key: 'notifikasi', label: 'Notifikasi', icon: Bell },
      { key: 'audit', label: 'Audit Trail', icon: FileText },
    ],
  },
]

export function AppShell() {
  const { user, view, params, go, setAuth, unread, setUnread } = useApp()
  const [openSidebar, setOpenSidebar] = useState(false)
  const [openSearch, setOpenSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [notifs, setNotifs] = useState<any[]>([])

  const allowed = useMemo(() => {
    const role = user?.role || ''
    const visible = (m: MenuDef): boolean => {
      if (m.roles && !m.roles.includes(role)) return false
      return true
    }
    const hasil = MENU.filter(visible).map((m) => ({ ...m, children: m.children?.filter(visible) }))
    if (!isDinas(role)) {
      // Perseptor & Puskesmas & Peserta: program/pemetaan tetap terlihat namun terbatas via API
    }
    return hasil
  }, [user?.role])

  // Polling notifikasi setiap 30 detik
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await apiGet<{ data: any[]; unread: number }>('/api/notifikasi?limit=15')
        if (!alive) return
        setNotifs(res.data)
        setUnread(res.unread)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [setUnread])

  // Debounce pencarian global
  useEffect(() => {
    if (searchQ.trim().length < 2) return
    const t = setTimeout(async () => {
      try {
        const res = await apiGet<{ hasil: any[] }>(`/api/search?q=${encodeURIComponent(searchQ)}`)
        setSearchResults(res.hasil)
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpenSearch(true) }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  if (!user) return null

  async function logout() {
    try {
      await apiPost('/api/auth/logout')
    } catch { /* ignore */ }
    setAuth(null)
    toast({ title: 'Keluar', description: 'Anda telah keluar dari sistem.' })
  }

  async function markAllRead() {
    try {
      await apiPatch('/api/notifikasi', { semua: true })
      setNotifs((prev) => prev.map((n) => ({ ...n, dibaca: true })))
      setUnread(0)
    } catch { /* ignore */ }
  }

  function handleSearchGo(item: any) {
    setOpenSearch(false)
    setSearchQ('')
    const peta: Record<string, string> = {
      Puskesmas: 'puskesmas', Perseptor: 'perseptor', 'Tenaga Kesehatan': 'tenaga-kesehatan',
      Pembimbingan: 'jadwal', Kasus: 'pembimbingan-detail', Temuan: 'temuan', 'Tindak Lanjut': 'tindak-lanjut', Dokumen: 'dokumentasi',
    }
    if (item.tipe === 'Kasus' || item.tipe === 'Temuan' && false) { /* noop */ }
    if (item.tipe === 'Kasus') {
      // perlu jadwalId dari temuan kasus: gunakan pembimbingan-detail
      go('jadwal')
      return
    }
    const target = peta[item.tipe] || 'dashboard'
    if (target === 'pembimbingan-detail') go('jadwal')
    else go(target, { id: item.id })
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-teal-900 text-teal-50">
      <div className="flex items-center gap-2.5 border-b border-teal-800 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700/60">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold tracking-[0.2em]">PERSEPTOR</div>
          <div className="truncate text-[10px] text-teal-300">Pembimbingan Klinik Terintegrasi</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {allowed.map((m) =>
          m.children && m.children.length > 0 ? (
            <SidebarGroup key={m.key} item={m} current={view} onNavigate={(k) => { go(k); setOpenSidebar(false) }} />
          ) : (
            <button
              key={m.key}
              onClick={() => { go(m.key); setOpenSidebar(false) }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                view === m.key ? 'bg-teal-700 font-semibold text-white' : 'text-teal-100 hover:bg-teal-800'
              )}
            >
              <m.icon className="h-4 w-4 shrink-0" />
              {m.label}
            </button>
          )
        )}
      </nav>
      <div className="border-t border-teal-800 px-4 py-3 text-[11px] leading-relaxed text-teal-300">
        <div className="font-semibold text-teal-100">&ldquo;Mendampingi, Membina, Meningkatkan Mutu Pelayanan.&rdquo;</div>
        <div className="mt-1">Dinas Kesehatan Kabupaten × Puskesmas</div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Sidebar mobile */}
      <Sheet open={openSidebar} onOpenChange={setOpenSidebar}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed left-3 top-3 z-40 lg:hidden" aria-label="Buka menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      {/* Konten */}
      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-white/95 px-4 py-2.5 backdrop-blur">
          <div className="hidden pl-0 lg:block" />
          <button
            onClick={() => setOpenSearch(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-sm"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Cari Puskesmas, perseptor, jadwal...</span>
            <kbd className="hidden rounded border bg-background px-1.5 text-[10px] font-medium sm:inline-block">Ctrl K</kbd>
          </button>
          <div className="flex-1 lg:hidden" />
          {/* Notifikasi */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifikasi
                <button className="text-xs font-medium text-teal-700 hover:underline" onClick={markAllRead}>Tandai semua dibaca</button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ada notifikasi.</div>
                ) : (
                  notifs.map((n) => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2" onClick={() => go('notifikasi')}>
                      <div className="flex w-full items-center gap-1.5">
                        {!n.dibaca && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />}
                        <span className={cn('text-xs font-semibold', !n.dibaca && 'text-foreground')}>{n.judul}</span>
                      </div>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.pesan}</span>
                      <span className="text-[10px] text-muted-foreground/70">
                        {new Date(n.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Profil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-teal-700 text-xs font-bold text-white">
                    {user.nama.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <div className="max-w-[160px] truncate text-sm font-semibold">{user.nama}</div>
                  <div className="text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</div>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate text-sm font-semibold">{user.nama}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => go('pengaturan')}>
                <Settings className="mr-2 h-4 w-4" /> Pengaturan & Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go('notifikasi')}>
                <Bell className="mr-2 h-4 w-4" /> Semua Notifikasi
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-rose-600 focus:text-rose-600">
                <LogOut className="mr-2 h-4 w-4" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {view === 'dashboard' && <DashboardView />}
            {view === 'pemetaan' && <PemetaanView />}
            {view === 'program' && <ProgramView />}
            {view === 'jadwal' && <JadwalView mode="jadwal" />}
            {view === 'pelaksanaan' && <JadwalView mode="pelaksanaan" />}
            {view === 'riwayat' && <JadwalView mode="riwayat" />}
            {view === 'pembimbingan-detail' && <DetailView id={params.id} />}
            {view === 'perseptor' && <PerseptorView />}
            {view === 'puskesmas' && <PuskesmasView />}
            {view === 'tenaga-kesehatan' && <TenagaKesehatanView />}
            {view === 'kompetensi' && <KompetensiView />}
            {view === 'temuan' && <TemuanView />}
            {view === 'tindak-lanjut' && <RtlView />}
            {view === 'laporan' && <LaporanView />}
            {view === 'dokumentasi' && <DokumentasiView />}
            {view.startsWith('master-') && <MasterView which={view.replace('master-', '')} />}
            {view === 'pengaturan' && <PengaturanView />}
            {view === 'notifikasi' && <NotifikasiView />}
            {view === 'audit' && <AuditView />}
          </div>
        </main>

        <footer className="mt-auto border-t bg-white px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
          PERSEPTOR — Program Pembimbingan dan Supervisi Klinik Terintegrasi • Mendampingi, Membina, Meningkatkan Mutu Pelayanan
        </footer>
      </div>

      {/* Global search dialog */}
      <CommandDialog open={openSearch} onOpenChange={setOpenSearch}>
        <CommandInput placeholder="Cari Puskesmas, perseptor, tenaga kesehatan, jadwal, kasus, temuan, RTL, dokumen..." value={searchQ} onValueChange={setSearchQ} />
        <CommandList>
          <CommandEmpty>Tidak ditemukan hasil untuk &ldquo;{searchQ}&rdquo;.</CommandEmpty>
          {['Puskesmas', 'Perseptor', 'Tenaga Kesehatan', 'Pembimbingan', 'Kasus', 'Temuan', 'Tindak Lanjut', 'Dokumen'].map((tipe) => {
            const rows = searchResults.filter((r) => r.tipe === tipe)
            if (!rows.length) return null
            return (
              <CommandGroup key={tipe} heading={tipe}>
                {rows.map((r) => (
                  <CommandItem key={r.tipe + r.id} onSelect={() => handleSearchGo(r)}>
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate text-sm">{r.judul}</div>
                      <div className="truncate text-xs text-muted-foreground">{r.subjudul}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </CommandDialog>
    </div>
  )
}

function SidebarGroup({ item, current, onNavigate }: { item: MenuDef; current: string; onNavigate: (key: string) => void }) {
  const [open, setOpen] = useState(true)
  const active = item.children?.some((c) => c.key === current)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors', active ? 'bg-teal-800 font-semibold text-white' : 'text-teal-100 hover:bg-teal-800')}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-teal-800 pl-2">
          {item.children!.map((c) => (
            <button
              key={c.key}
              onClick={() => onNavigate(c.key)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                current === c.key ? 'bg-teal-700 font-semibold text-white' : 'text-teal-200 hover:bg-teal-800 hover:text-white'
              )}
            >
              <c.icon className="h-3.5 w-3.5 shrink-0" />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
