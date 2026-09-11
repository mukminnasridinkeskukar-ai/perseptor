import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

/** GET /api/search?q= — pencarian global lintas entitas */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const q = (req.nextUrl.searchParams.get('q') || '').trim()
    if (!q || q.length < 2) return ok({ hasil: [] })
    const hasil: Array<{ tipe: string; judul: string; subjudul: string; id: string }> = []

    const pkmWhere: any = { OR: [{ nama: { contains: q } }, { kode: { contains: q } }, { kecamatan: { contains: q } }] }
    const pkm = await db.puskesmas.findMany({ where: pkmWhere, take: 5 })
    pkm.forEach((p) => hasil.push({ tipe: 'Puskesmas', judul: p.nama, subjudul: `${p.kecamatan} • ${p.kode}`, id: p.id }))

    const per = await db.perseptor.findMany({ where: { OR: [{ nama: { contains: q } }, { nip: { contains: q } }, { profesi: { contains: q } }] }, take: 5 })
    per.forEach((p) => hasil.push({ tipe: 'Perseptor', judul: p.nama, subjudul: `${p.profesi} • ${p.unitKerja || '-'}`, id: p.id }))

    const tkWhere: any = { OR: [{ nama: { contains: q } }, { nipNik: { contains: q } }, { profesi: { contains: q } }] }
    if (user.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) tkWhere.puskesmasId = user.puskesmasId
    const tk = await db.tenagaKesehatan.findMany({ where: tkWhere, include: { puskesmas: { select: { nama: true } } }, take: 5 })
    tk.forEach((t) => hasil.push({ tipe: 'Tenaga Kesehatan', judul: t.nama, subjudul: `${t.profesi} • ${t.puskesmas?.nama || '-'}`, id: t.id }))

    const jadwalWhere: any = { OR: [{ topik: { contains: q } }, { catatan: { contains: q } }] }
    if (user.role === 'PERSEPTOR' && user.perseptorId) jadwalWhere.perseptorId = user.perseptorId
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) jadwalWhere.puskesmasId = user.puskesmasId
    const jadwal = await db.jadwal.findMany({ where: jadwalWhere, include: { puskesmas: { select: { nama: true } } }, take: 5 })
    jadwal.forEach((j) => hasil.push({ tipe: 'Pembimbingan', judul: j.topik, subjudul: `${j.puskesmas.nama} • ${j.tanggal.toLocaleDateString('id-ID')}`, id: j.id }))

    const kasusWhere: any = { OR: [{ masalah: { contains: q } }, { jenisKasus: { contains: q } }, { pembahasan: { contains: q } }] }
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) kasusWhere.jadwal = { puskesmasId: user.puskesmasId }
    const kasus = await db.kasus.findMany({ where: kasusWhere, include: { jadwal: { select: { topik: true } } }, take: 5 })
    kasus.forEach((k) => hasil.push({ tipe: 'Kasus', judul: `${k.jenisKasus} (${k.kodeAnonim || 'anonim'})`, subjudul: k.jadwal.topik, id: k.id }))

    const temuanWhere: any = { OR: [{ uraian: { contains: q } }, { kategori: { contains: q } }] }
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) temuanWhere.jadwal = { puskesmasId: user.puskesmasId }
    if (user.role === 'PERSEPTOR' && user.perseptorId) temuanWhere.jadwal = { perseptorId: user.perseptorId }
    const temuan = await db.temuan.findMany({ where: temuanWhere, include: { jadwal: { select: { topik: true } } }, take: 5 })
    temuan.forEach((t) => hasil.push({ tipe: 'Temuan', judul: t.uraian.slice(0, 80), subjudul: `${t.kategori} • ${t.jadwal.topik}`, id: t.id }))

    const rtlWhere: any = { kegiatan: { contains: q } }
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) rtlWhere.puskesmasId = user.puskesmasId
    const rtl = await db.rTL.findMany({ where: rtlWhere, include: { puskesmas: { select: { nama: true } } }, take: 5 })
    rtl.forEach((r) => hasil.push({ tipe: 'Tindak Lanjut', judul: r.kegiatan.slice(0, 80), subjudul: `${r.puskesmas?.nama || '-'} • ${r.status}`, id: r.id }))

    if (isDinas(user.role)) {
      const dok = await db.dokumentasi.findMany({ where: { OR: [{ nama: { contains: q } }, { deskripsi: { contains: q } }] }, take: 5 })
      dok.forEach((d) => hasil.push({ tipe: 'Dokumen', judul: d.nama, subjudul: `${JENIS_LABEL[d.jenis] || d.jenis} • ${d.fileName || '-'}`, id: d.id }))
    }

    return ok({ hasil })
  })
}

const JENIS_LABEL: Record<string, string> = {
  FOTO: 'Foto', DOKUMEN: 'Dokumen', INSTRUMEN: 'Instrumen', HASIL_EVALUASI: 'Hasil Evaluasi', BERITA_ACARA: 'Berita Acara', MATERI: 'Materi', BUKTI_RTL: 'Bukti RTL',
}
