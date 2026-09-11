/** Konstanta label, warna badge, dan opsi status untuk frontend */

export const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: 'Superadmin Dinas',
  ADMIN_DINAS: 'Admin Dinas Kesehatan',
  PERSEPTOR: 'Perseptor / Pembimbing',
  ADMIN_PUSKESMAS: 'Admin Puskesmas',
  PESERTA: 'Peserta / Tenaga Kesehatan',
}

export const STATUS_JADWAL = ['DIRENCANAKAN', 'DIJADWALKAN', 'DIKONFIRMASI', 'BERLANGSUNG', 'SELESAI', 'DITUNDA', 'DIBATALKAN'] as const

export const STATUS_JADWAL_LABEL: Record<string, string> = {
  DIRENCANAKAN: 'Direncanakan',
  DIJADWALKAN: 'Dijadwalkan',
  DIKONFIRMASI: 'Dikonfirmasi',
  BERLANGSUNG: 'Berlangsung',
  SELESAI: 'Selesai',
  DITUNDA: 'Ditunda',
  DIBATALKAN: 'Dibatalkan',
}

export const STATUS_JADWAL_COLOR: Record<string, string> = {
  DIRENCANAKAN: 'bg-slate-100 text-slate-700 border-slate-200',
  DIJADWALKAN: 'bg-sky-100 text-sky-700 border-sky-200',
  DIKONFIRMASI: 'bg-teal-100 text-teal-700 border-teal-200',
  BERLANGSUNG: 'bg-amber-100 text-amber-800 border-amber-200',
  SELESAI: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DITUNDA: 'bg-orange-100 text-orange-700 border-orange-200',
  DIBATALKAN: 'bg-rose-100 text-rose-700 border-rose-200',
}

export const PRIORITAS_LABEL: Record<string, string> = {
  RENDAH: 'Prioritas Rendah',
  SEDANG: 'Prioritas Sedang',
  TINGGI: 'Prioritas Tinggi',
  SANGAT_TINGGI: 'Prioritas Sangat Tinggi',
}

export const PRIORITAS_COLOR: Record<string, string> = {
  RENDAH: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SEDANG: 'bg-amber-100 text-amber-700 border-amber-200',
  TINGGI: 'bg-orange-100 text-orange-700 border-orange-200',
  SANGAT_TINGGI: 'bg-rose-100 text-rose-700 border-rose-200',
}

export const RISIKO_LABEL: Record<string, string> = { RENDAH: 'Rendah', SEDANG: 'Sedang', TINGGI: 'Tinggi', KRITIS: 'Kritis' }
export const RISIKO_COLOR: Record<string, string> = {
  RENDAH: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SEDANG: 'bg-amber-100 text-amber-700 border-amber-200',
  TINGGI: 'bg-orange-100 text-orange-700 border-orange-200',
  KRITIS: 'bg-rose-100 text-rose-700 border-rose-200',
}

export const STATUS_RTL_LABEL: Record<string, string> = {
  BELUM_DIMULAI: 'Belum Dimulai',
  DALAM_PROSES: 'Dalam Proses',
  SELESAI: 'Selesai',
  TERVERIFIKASI: 'Terverifikasi',
  TERLAMBAT: 'Terlambat',
}
export const STATUS_RTL_COLOR: Record<string, string> = {
  BELUM_DIMULAI: 'bg-slate-100 text-slate-700 border-slate-200',
  DALAM_PROSES: 'bg-amber-100 text-amber-700 border-amber-200',
  SELESAI: 'bg-sky-100 text-sky-700 border-sky-200',
  TERVERIFIKASI: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  TERLAMBAT: 'bg-rose-100 text-rose-700 border-rose-200',
}

export const KATEGORI_TEMUAN = ['Kompetensi', 'SOP', 'Keselamatan Pasien', 'PPI', 'Dokumentasi', 'Sarana', 'SDM', 'Alur Pelayanan', 'Kepatuhan', 'Mutu Pelayanan', 'Lainnya'] as const

export const METODE_PEMBIMBINGAN = ['Observasi langsung', 'Demonstrasi', 'Redemonstrasi', 'Diskusi kasus', 'Bedside teaching', 'Coaching', 'Mentoring', 'Simulasi', 'Audit klinis', 'Review dokumentasi', 'Telaah SOP', 'Pendampingan tindakan', 'Konsultasi klinis'] as const

export const KELOMPOK_KOMPETENSI = ['Klinis', 'Manajerial', 'Keselamatan Pasien', 'Pencegahan dan Pengendalian Infeksi', 'Kegawatdaruratan', 'Pelayanan Maternal dan Neonatal', 'Pelayanan Anak', 'Gizi', 'Kefarmasian', 'Laboratorium', 'Keperawatan', 'Kebidanan', 'Tenaga Kesehatan Lainnya'] as const

export const PROFESI_LIST = ['Dokter', 'Bidan', 'Perawat', 'Nutrisionis', 'Apoteker', 'Analis', 'Sanitarian', 'Teknisi Radiologi', 'Fisioterapis', 'Lainnya'] as const

export const SKALA_PENILAIAN = [
  { nilai: 1, label: 'Belum mampu' },
  { nilai: 2, label: 'Perlu bimbingan' },
  { nilai: 3, label: 'Mampu dengan supervisi' },
  { nilai: 4, label: 'Mandiri' },
  { nilai: 5, label: 'Sangat baik' },
]

export const JENIS_DOKUMEN = ['FOTO', 'DOKUMEN', 'INSTRUMEN', 'HASIL_EVALUASI', 'BERITA_ACARA', 'MATERI', 'BUKTI_RTL'] as const
export const JENIS_DOKUMEN_LABEL: Record<string, string> = {
  FOTO: 'Foto Kegiatan', DOKUMEN: 'Dokumen', INSTRUMEN: 'Instrumen', HASIL_EVALUASI: 'Hasil Evaluasi', BERITA_ACARA: 'Berita Acara', MATERI: 'Materi', BUKTI_RTL: 'Bukti Tindak Lanjut',
}

export const PERIODE_PROGRAM = ['TAHUNAN', 'SEMESTER', 'BULANAN', 'KHUSUS', 'KASUS', 'KEBUTUHAN'] as const
export const PERIODE_PROGRAM_LABEL: Record<string, string> = {
  TAHUNAN: 'Tahunan', SEMESTER: 'Semester', BULANAN: 'Bulanan', KHUSUS: 'Khusus', KASUS: 'Berbasis Kasus', KEBUTUHAN: 'Berbasis Kebutuhan',
}

export const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function tanggalID(d: string | Date | null | undefined, denganJam = false): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  const bulan = BULAN_ID[date.getMonth()]
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()]
  const base = `${hari}, ${date.getDate()} ${bulan} ${date.getFullYear()}`
  if (!denganJam) return base
  const jam = String(date.getHours()).padStart(2, '0')
  const menit = String(date.getMinutes()).padStart(2, '0')
  return `${base} • ${jam}.${menit}`
}

export function tanggalSingkat(d: string | Date | null | undefined): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  return `${date.getDate()} ${BULAN_ID[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`
}
