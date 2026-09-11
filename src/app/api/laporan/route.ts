import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

/**
 * GET /api/laporan?tipe=pembimbingan|temuan|rtl|perseptor&format=json|csv
 * Filter: periode (tanggalMulai/tanggalSelesai), puskesmasId, profesi, perseptorId, topik, status
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const tipe = sp.get('tipe') || 'pembimbingan'
    const format = sp.get('format') || 'json'
    const where: any = {}
    // Scoping
    if (user.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) where.puskesmasId = user.puskesmasId
    if (user.role === 'PESERTA' && user.puskesmasId) where.puskesmasId = user.puskesmasId
    if (user.role === 'PERSEPTOR' && user.perseptorId) where.perseptorId = user.perseptorId
    // Filter
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (sp.get('perseptorId')) where.perseptorId = sp.get('perseptorId')
    if (sp.get('status')) where.status = sp.get('status')
    if (sp.get('topik')) where.topik = { contains: sp.get('topik')! }
    const mulai = sp.get('tanggalMulai'), akhir = sp.get('tanggalSelesai')
    where.tanggal = {}
    if (mulai) where.tanggal.gte = new Date(mulai)
    if (akhir) { const a = new Date(akhir); a.setHours(23, 59, 59); where.tanggal.lte = a }
    if (!mulai && !akhir) delete where.tanggal
    const tahun = sp.get('tahun')
    if (tahun) where.tanggal = { gte: new Date(parseInt(tahun), 0, 1), lt: new Date(parseInt(tahun) + 1, 0, 1) }

    if (tipe === 'pembimbingan') {
      const rows = await db.jadwal.findMany({
        where,
        include: {
          puskesmas: { select: { nama: true, kecamatan: true } },
          perseptor: { select: { nama: true, profesi: true } },
          program: { select: { nama: true } },
          peserta: { include: { tenagaKesehatan: { select: { profesi: true } } } },
          _count: { select: { temuan: true, kasus: true, penilaian: true } },
        },
        orderBy: { tanggal: 'asc' },
      })
      const data = rows.map((j) => ({
        tanggal: j.tanggal.toISOString().slice(0, 10),
        puskesmas: j.puskesmas.nama,
        kecamatan: j.puskesmas.kecamatan,
        perseptor: j.perseptor.nama,
        profesiPerseptor: j.perseptor.profesi,
        program: j.program?.nama || '-',
        topik: j.topik,
        metode: j.metode || '-',
        status: j.status,
        jumlahPeserta: j.peserta.length,
        jumlahTemuan: j._count.temuan,
        jumlahKasus: j._count.kasus,
        jumlahInstrumen: j._count.penilaian,
      }))
      if (format === 'csv') return csvResponse(`laporan_pembimbingan_${Date.now()}.csv`, data)
      return ok({ data })
    }

    if (tipe === 'temuan') {
      const jadwalWhere = { ...where }
      const rows = await db.temuan.findMany({
        where: { jadwal: jadwalWhere },
        include: { jadwal: { select: { topik: true, tanggal: true, puskesmas: { select: { nama: true } } } }, rtl: { select: { id: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const data = rows.map((t) => ({
        tanggal: t.jadwal.tanggal.toISOString().slice(0, 10),
        puskesmas: t.jadwal.puskesmas.nama,
        kegiatan: t.jadwal.topik,
        kategori: t.kategori,
        uraian: t.uraian,
        tingkatRisiko: t.tingkatRisiko,
        penanggungJawab: t.penanggungJawab || '-',
        batasWaktu: t.batasWaktu ? t.batasWaktu.toISOString().slice(0, 10) : '-',
        status: t.status,
        jumlahRTL: t.rtl.length,
      }))
      if (format === 'csv') return csvResponse(`laporan_temuan_${Date.now()}.csv`, data)
      return ok({ data })
    }

    if (tipe === 'rtl') {
      const rows = await db.rTL.findMany({
        where: user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA' ? { puskesmasId: user.puskesmasId } : (user.role === 'PERSEPTOR' && user.perseptorId ? { temuan: { jadwal: { perseptorId: user.perseptorId } } } : {}),
        include: {
          puskesmas: { select: { nama: true } },
          temuan: { select: { kategori: true, tingkatRisiko: true, jadwal: { select: { topik: true } } } },
          verifikasi: { orderBy: { pada: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      })
      const hariIni = new Date()
      const data = rows.map((r) => ({
        puskesmas: r.puskesmas?.nama || '-',
        kegiatan: r.kegiatan,
        temuanKategori: r.temuan?.kategori || '-',
        tingkatRisiko: r.temuan?.tingkatRisiko || '-',
        penanggungJawab: r.penanggungJawab || '-',
        targetSelesai: r.targetSelesai ? r.targetSelesai.toISOString().slice(0, 10) : '-',
        status: r.status,
        verifikasi: r.verifikasiStatus,
        diverifikasiOleh: r.verifikasiOleh || '-',
        keterlambatan: r.status === 'TERLAMBAT' || (['BELUM_DIMULAI', 'DALAM_PROSES'].includes(r.status) && r.targetSelesai && r.targetSelesai < hariIni) ? 'YA' : 'TIDAK',
      }))
      if (format === 'csv') return csvResponse(`laporan_rtl_${Date.now()}.csv`, data)
      return ok({ data })
    }

    if (tipe === 'perseptor') {
      const rows = await db.perseptor.findMany({
        where: sp.get('perseptorId') ? { id: sp.get('perseptorId')! } : {},
        include: {
          penugasan: { include: { puskesmas: { select: { nama: true } } } },
          jadwal: { include: { peserta: { select: { id: true } }, _count: { select: { temuan: true } } } },
        },
        orderBy: { nama: 'asc' },
      })
      const data = rows.map((p) => {
        const selesai = p.jadwal.filter((j) => j.status === 'SELESAI')
        return {
          nama: p.nama,
          profesi: p.profesi,
          nip: p.nip || '-',
          jumlahPembimbingan: p.jadwal.length,
          pembimbinganSelesai: selesai.length,
          puskesmasBinaan: p.penugasan.map((t) => t.puskesmas.nama).join('; ') || '-',
          jumlahPeserta: [...new Set(p.jadwal.flatMap((j) => j.peserta.map((x) => x.id)))].length,
          jumlahTemuan: p.jadwal.reduce((a, j) => a + j._count.temuan, 0),
          statusAktif: p.statusAktif ? 'Aktif' : 'Nonaktif',
        }
      })
      if (format === 'csv') return csvResponse(`laporan_perseptor_${Date.now()}.csv`, data)
      return ok({ data })
    }

    return ok({ data: [] })
  })
}

function csvResponse(namaFile: string, data: Array<Record<string, any>>) {
  if (!data.length) {
    return new Response('Tidak ada data', { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
  }
  const headers = Object.keys(data[0])
  const escape = (v: any) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(';'), ...data.map((r) => headers.map((h) => escape(r[h])).join(';'))]
  const body = '\uFEFF' + lines.join('\r\n')
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${namaFile}"`,
    },
  })
}
