'use client'

import { useMemo } from 'react'
import { useApp, isDinas } from '@/lib/store'
import { ResourceManager } from './resource-manager'
import { Badge } from '@/components/ui/badge'
import { BadgeStatus } from '../ui-bits'

export function MasterView({ which }: { which: string }) {
  const role = useApp((s) => s.user?.role)
  const dinas = isDinas(role)

  if (which === 'puskesmas') {
    return (
      <ResourceManager
        title="Puskesmas"
        description="Master data jaringan Puskesmas di wilayah kerja Dinas Kesehatan."
        endpoint="/api/master/puskesmas"
        searchKeys={['nama', 'kode', 'kecamatan', 'kepalaPuskesmas']}
        canWrite={dinas}
        exportName="master_puskesmas"
        fields={[
          { key: 'kode', label: 'ID Puskesmas', type: 'text', required: true, placeholder: 'PKM-001' },
          { key: 'nama', label: 'Nama Puskesmas', type: 'text', required: true },
          { key: 'kecamatan', label: 'Kecamatan', type: 'text', required: true },
          { key: 'alamat', label: 'Alamat', type: 'textarea', colSpan: 2 },
          { key: 'kepalaPuskesmas', label: 'Kepala Puskesmas', type: 'text' },
          { key: 'telepon', label: 'Nomor Kontak', type: 'text', placeholder: '08xx-xxxx-xxxx' },
          { key: 'email', label: 'Email', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: [{ v: 'AKTIF', l: 'Aktif' }, { v: 'NONAKTIF', l: 'Nonaktif' }] },
        ]}
        columns={[
          { key: 'kode', header: 'ID', render: (r) => <span className="font-mono text-xs">{r.kode}</span> },
          { key: 'nama', header: 'Nama Puskesmas', render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: 'kecamatan', header: 'Kecamatan' },
          { key: 'kepalaPuskesmas', header: 'Kepala Puskesmas' },
          { key: 'telepon', header: 'Kontak' },
          { key: '_count', header: 'TK & Jadwal', render: (r) => <span className="text-xs">{r._count?.tenagaKesehatan ?? 0} TK • {r._count?.jadwal ?? 0} jadwal</span> },
          { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'AKTIF' ? 'default' : 'secondary'} className={r.status === 'AKTIF' ? 'bg-teal-700' : ''}>{r.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}</Badge> },
        ]}
      />
    )
  }

  if (which === 'perseptor') {
    return (
      <ResourceManager
        title="Perseptor"
        description="Data pembimbing/supervisor klinik beserta kompetensi dan Puskesmas binaan."
        endpoint="/api/master/perseptor"
        searchKeys={['nama', 'nip', 'profesi', 'unitKerja']}
        canWrite={dinas}
        exportName="master_perseptor"
        fields={[
          { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true, colSpan: 2, placeholder: 'dr. Nama Lengkap, Sp.XXX' },
          { key: 'nip', label: 'NIP', type: 'text' },
          { key: 'profesi', label: 'Profesi', type: 'select', required: true, options: ['Dokter', 'Bidan', 'Perawat', 'Apoteker', 'Nutrisionis', 'Analis', 'Sanitarian', 'Lainnya'].map((v) => ({ v, l: v })) },
          { key: 'jabatan', label: 'Jabatan', type: 'text' },
          { key: 'unitKerja', label: 'Unit Kerja', type: 'text' },
          { key: 'nomorSTR', label: 'Nomor STR', type: 'text' },
          { key: 'nomorSIP', label: 'Nomor SIP', type: 'text' },
          { key: 'sertifikat', label: 'Sertifikat Kompetensi/Pelatihan', type: 'textarea', colSpan: 2 },
          { key: 'areaKeahlian', label: 'Area Keahlian', type: 'text', colSpan: 2 },
          { key: 'kompetensi', label: 'Kompetensi', type: 'textarea', colSpan: 2, help: 'Pisahkan dengan koma' },
          { key: 'statusAktif', label: 'Status Aktif', type: 'switch' },
        ]}
        columns={[
          { key: 'nama', header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: 'profesi', header: 'Profesi', render: (r) => <Badge variant="outline">{r.profesi}</Badge> },
          { key: 'nip', header: 'NIP', render: (r) => <span className="font-mono text-xs">{r.nip || '-'}</span> },
          { key: 'unitKerja', header: 'Unit Kerja' },
          { key: 'penugasan', header: 'Puskesmas Binaan', render: (r) => <span className="text-xs">{r.penugasan?.map((t: any) => t.puskesmas.nama.replace('Puskesmas ', '')).join(', ') || '-'}</span> },
          { key: '_count', header: 'Jadwal', render: (r) => <span className="tabular-nums">{r._count?.jadwal ?? 0}</span> },
          { key: 'statusAktif', header: 'Status', render: (r) => <BadgeStatus label={r.statusAktif ? 'Aktif' : 'Nonaktif'} className={r.statusAktif ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'} /> },
        ]}
      />
    )
  }

  if (which === 'tenaga') {
    return (
      <ResourceManager
        title="Tenaga Kesehatan"
        description="Data tenaga kesehatan per Puskesmas sebagai sasaran pembimbingan."
        endpoint="/api/master/tenaga-kesehatan"
        searchKeys={['nama', 'nipNik', 'profesi', 'jabatan']}
        canWrite={dinas || role === 'ADMIN_PUSKESMAS'}
        exportName="master_tenaga_kesehatan"
        fields={[
          { key: 'nama', label: 'Nama', type: 'text', required: true, colSpan: 2 },
          { key: 'nipNik', label: 'NIP/NIK', type: 'text' },
          { key: 'profesi', label: 'Profesi', type: 'select', required: true, options: ['Dokter', 'Bidan', 'Perawat', 'Nutrisionis', 'Apoteker', 'Analis', 'Sanitarian', 'Lainnya'].map((v) => ({ v, l: v })) },
          { key: 'jabatan', label: 'Jabatan', type: 'text' },
          { key: 'unitKerja', label: 'Unit Kerja', type: 'text' },
          { key: 'puskesmasId', label: 'Puskesmas', type: 'select', options: 'puskesmas', required: true },
          { key: 'kompetensi', label: 'Kompetensi', type: 'textarea', colSpan: 2 },
          { key: 'masaKerja', label: 'Masa Kerja (tahun)', type: 'number' },
          { key: 'status', label: 'Status', type: 'select', options: [{ v: 'AKTIF', l: 'Aktif' }, { v: 'NONAKTIF', l: 'Nonaktif' }] },
        ]}
        columns={[
          { key: 'nama', header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: 'profesi', header: 'Profesi', render: (r) => <Badge variant="outline">{r.profesi}</Badge> },
          { key: 'jabatan', header: 'Jabatan' },
          { key: 'puskesmas', header: 'Puskesmas', render: (r) => r.puskesmas?.nama || '-' },
          { key: 'masaKerja', header: 'Masa Kerja', render: (r) => (r.masaKerja ? `${r.masaKerja} th` : '-') },
          { key: 'status', header: 'Status', render: (r) => <BadgeStatus label={r.status} className={r.status === 'AKTIF' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'} /> },
        ]}
      />
    )
  }

  if (which === 'kompetensi') {
    return (
      <ResourceManager
        title="Jenis Kompetensi"
        description="Kamus kompetensi klinis dan manajerial sebagai acuan pembimbingan."
        endpoint="/api/master/kompetensi"
        searchKeys={['nama', 'kelompok', 'deskripsi']}
        canWrite={dinas}
        exportName="master_kompetensi"
        fields={[
          { key: 'nama', label: 'Nama Kompetensi', type: 'text', required: true, colSpan: 2 },
          { key: 'kelompok', label: 'Kelompok', type: 'select', required: true, options: ['Klinis', 'Manajerial', 'Keselamatan Pasien', 'Pencegahan dan Pengendalian Infeksi', 'Kegawatdaruratan', 'Pelayanan Maternal dan Neonatal', 'Pelayanan Anak', 'Gizi', 'Kefarmasian', 'Laboratorium', 'Keperawatan', 'Kebidanan', 'Tenaga Kesehatan Lainnya'].map((v) => ({ v, l: v })) },
          { key: 'deskripsi', label: 'Deskripsi', type: 'textarea', colSpan: 2 },
          { key: 'aktif', label: 'Aktif', type: 'switch' },
        ]}
        columns={[
          { key: 'nama', header: 'Kompetensi', render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: 'kelompok', header: 'Kelompok', render: (r) => <Badge variant="outline" className="max-w-[240px] truncate">{r.kelompok}</Badge> },
          { key: 'deskripsi', header: 'Deskripsi', render: (r) => <span className="line-clamp-1 text-xs text-muted-foreground">{r.deskripsi || '-'}</span> },
          { key: 'aktif', header: 'Status', render: (r) => <BadgeStatus label={r.aktif ? 'Aktif' : 'Nonaktif'} className={r.aktif ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'} /> },
        ]}
      />
    )
  }

  if (which === 'users') {
    return (
      <ResourceManager
        title="Pengguna Sistem"
        description="Kelola akun pengguna dan peran akses (RBAC)."
        endpoint="/api/master/users"
        searchKeys={['nama', 'email', 'role']}
        canWrite={dinas}
        exportName="master_pengguna"
        fields={[
          { key: 'nama', label: 'Nama', type: 'text', required: true, colSpan: 2 },
          { key: 'email', label: 'Email', type: 'text', required: true, colSpan: 2 },
          { key: 'password', label: 'Password', type: 'password', colSpan: 2, help: 'Kosongkan saat mengubah bila tidak diganti. Minimal 6 karakter.' },
          { key: 'role', label: 'Peran (Role)', type: 'select', required: true, options: [
            { v: 'SUPERADMIN', l: 'Superadmin Dinas' }, { v: 'ADMIN_DINAS', l: 'Admin Dinas Kesehatan' },
            { v: 'PERSEPTOR', l: 'Perseptor / Pembimbing' }, { v: 'ADMIN_PUSKESMAS', l: 'Admin Puskesmas' }, { v: 'PESERTA', l: 'Peserta / Tenaga Kesehatan' },
          ] },
          { key: 'puskesmasId', label: 'Puskesmas (untuk Admin Puskesmas/Peserta)', type: 'select', options: 'puskesmas' },
          { key: 'aktif', label: 'Status Aktif', type: 'switch' },
        ]}
        columns={[
          { key: 'nama', header: 'Nama', render: (r) => <span className="font-medium">{r.nama}</span> },
          { key: 'email', header: 'Email', render: (r) => <span className="font-mono text-xs">{r.email}</span> },
          { key: 'role', header: 'Peran', render: (r) => <Badge variant="outline">{({ SUPERADMIN: 'Superadmin', ADMIN_DINAS: 'Admin Dinas', PERSEPTOR: 'Perseptor', ADMIN_PUSKESMAS: 'Admin Puskesmas', PESERTA: 'Peserta' } as any)[r.role] || r.role}</Badge> },
          { key: 'puskesmas', header: 'Puskesmas', render: (r) => r.puskesmas?.nama || '-' },
          { key: 'aktif', header: 'Status', render: (r) => <BadgeStatus label={r.aktif ? 'Aktif' : 'Nonaktif'} className={r.aktif ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'} /> },
        ]}
      />
    )
  }

  return null
}
