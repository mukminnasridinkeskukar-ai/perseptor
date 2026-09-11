import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

/** GET /api/dashboard?tahun=&bulan=&puskesmasId=&perseptorId=&status=&mode= */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const tahun = sp.get('tahun') ? parseInt(sp.get('tahun')!) : null
    const bulan = sp.get('bulan') ? parseInt(sp.get('bulan')!) : null
    const mode = sp.get('mode') // 'puskesmas' untuk dashboard Puskesmas

    // ===== Scoping data berdasarkan role =====
    const where: any = {}
    if (!isDinas(user.role)) {
      if (user.role === 'PERSEPTOR' && user.perseptorId) where.perseptorId = user.perseptorId
      else if (user.puskesmasId) where.puskesmasId = user.puskesmasId
    }
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (sp.get('perseptorId')) where.perseptorId = sp.get('perseptorId')
    if (sp.get('status')) where.status = sp.get('status')

    if (tahun) {
      where.tanggal = { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) }
      if (bulan && bulan >= 1 && bulan <= 12) {
        where.tanggal = { gte: new Date(tahun, bulan - 1, 1), lt: new Date(tahun, bulan, 1) }
      }
    }

    const [allJadwal, puskesmas, perseptor, tenagaKesehatan] = await Promise.all([
      db.jadwal.findMany({
        where,
        include: {
          puskesmas: { select: { id: true, nama: true, kecamatan: true } },
          perseptor: { select: { id: true, nama: true, profesi: true } },
          peserta: { select: { tenagaKesehatanId: true } },
        },
      }),
      db.puskesmas.count({ where: { status: 'AKTIF' } }),
      db.perseptor.count({ where: { statusAktif: true } }),
      db.tenagaKesehatan.count({ where: { status: 'AKTIF' } }),
    ])

    const hariIni = new Date()
    const byStatus: Record<string, number> = {}
    for (const j of allJadwal) byStatus[j.status] = (byStatus[j.status] || 0) + 1
    const terjadwal = (byStatus['DIRENCANAKAN'] || 0) + (byStatus['DIJADWALKAN'] || 0) + (byStatus['DIKONFIRMASI'] || 0)
    const berlangsung = byStatus['BERLANGSUNG'] || 0
    const selesai = byStatus['SELESAI'] || 0
    const belumDilaksanakan = terjadwal + (byStatus['DITUNDA'] || 0) + (byStatus['DIBATALKAN'] || 0)

    // ===== Temuan & RTL terkait jadwal terfilter =====
    const jadwalIds = allJadwal.map((j) => j.id)
    const temuan = await db.temuan.findMany({ where: { jadwalId: { in: jadwalIds } }, select: { id: true, tingkatRisiko: true, status: true, kategori: true, jadwalId: true } })
    const rtlRows = await db.rTL.findMany({ where: { temuanId: { in: temuan.map((t) => t.id) } }, select: { id: true, status: true, targetSelesai: true, kegiatan: true } })

    const hariIniMid = new Date(hariIni.getFullYear(), hariIni.getMonth(), hariIni.getDate())
    const rtlAktif = rtlRows.filter((r) => ['BELUM_DIMULAI', 'DALAM_PROSES', 'TERLAMBAT'].includes(r.status)).length
    const rtlSelesai = rtlRows.filter((r) => ['SELESAI', 'TERVERIFIKASI'].includes(r.status)).length
    const penyelesaianRTL = rtlRows.length ? Math.round((rtlSelesai / rtlRows.length) * 100) : 0
    const temuanPrioritas = temuan.filter((t) => ['TINGGI', 'KRITIS'].includes(t.tingkatRisiko)).length

    // ===== Chart: pembimbingan per bulan =====
    const perBulan: Array<{ bulan: string; jumlah: number; selesai: number }> = []
    const bulanNama = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    for (let b = 0; b < 12; b++) {
      const rows = allJadwal.filter((j) => {
        const d = new Date(j.tanggal)
        return tahun ? d.getFullYear() === tahun && d.getMonth() === b : d.getMonth() === b
      })
      perBulan.push({ bulan: bulanNama[b], jumlah: rows.length, selesai: rows.filter((r) => r.status === 'SELESAI').length })
    }

    // ===== Chart: per Puskesmas =====
    const mapPkm: Record<string, { nama: string; jumlah: number }> = {}
    for (const j of allJadwal) {
      const key = j.puskesmasId
      mapPkm[key] = mapPkm[key] || { nama: j.puskesmas.nama.replace('Puskesmas ', ''), jumlah: 0 }
      mapPkm[key].jumlah++
    }
    const perPuskesmas = Object.values(mapPkm).sort((a, b) => b.jumlah - a.jumlah)

    // ===== Chart: per profesi peserta =====
    const tkIds = [...new Set(allJadwal.flatMap((j) => j.peserta.map((p) => p.tenagaKesehatanId)))]
    const tkRows = tkIds.length ? await db.tenagaKesehatan.findMany({ where: { id: { in: tkIds } }, select: { profesi: true } }) : []
    const mapProf: Record<string, number> = {}
    for (const t of tkRows) mapProf[t.profesi] = (mapProf[t.profesi] || 0) + 1
    const perProfesi = Object.entries(mapProf).map(([profesi, jumlah]) => ({ profesi, jumlah })).sort((a, b) => b.jumlah - a.jumlah)

    // ===== Chart: jenis temuan =====
    const mapKat: Record<string, number> = {}
    for (const t of temuan) mapKat[t.kategori] = (mapKat[t.kategori] || 0) + 1
    const jenisTemuan = Object.entries(mapKat).map(([kategori, jumlah]) => ({ kategori, jumlah })).sort((a, b) => b.jumlah - a.jumlah)

    // ===== Chart: status RTL =====
    const mapRtl: Record<string, number> = {}
    for (const r of rtlRows) mapRtl[r.status] = (mapRtl[r.status] || 0) + 1
    const statusRTL = Object.entries(mapRtl).map(([status, jumlah]) => ({ status, jumlah }))

    // ===== Chart: perkembangan kompetensi (rata-rata skor per bulan) =====
    const evalRows = await db.evaluasiKompetensi.findMany({
      where: { jadwalId: { in: jadwalIds }, sumber: 'EVALUASI' },
      select: { skor: true, createdAt: true },
    })
    const mapEval: Record<string, { total: number; n: number }> = {}
    for (const e of evalRows) {
      const b = e.createdAt.getMonth()
      mapEval[b] = mapEval[b] || { total: 0, n: 0 }
      mapEval[b].total += e.skor
      mapEval[b].n++
    }
    const kompetensiTren = perBulan.map((pb, b) => ({
      bulan: pb.bulan,
      rata: mapEval[b] ? +(mapEval[b].total / mapEval[b].n).toFixed(2) : null,
    }))

    // ===== Agenda mendatang (5) =====
    const agenda = await db.jadwal.findMany({
      where: { ...where, tanggal: { gte: hariIniMid }, status: { in: ['DIJADWALKAN', 'DIKONFIRMASI', 'DIRENCANAKAN'] } },
      include: { puskesmas: { select: { nama: true } }, perseptor: { select: { nama: true } } },
      orderBy: { tanggal: 'asc' }, take: 5,
    })

    // ===== Mode dashboard Puskesmas =====
    if (mode === 'puskesmas' && (user.puskesmasId || sp.get('puskesmasId'))) {
      const pkmId = sp.get('puskesmasId') || user.puskesmasId
      const jPk = allJadwal.filter((j) => j.puskesmasId === pkmId)
      const idsPk = jPk.map((j) => j.id)
      const tmPk = await db.temuan.findMany({ where: { jadwalId: { in: idsPk } } })
      const rtlPk = await db.rTL.findMany({ where: { OR: [{ temuanId: { in: tmPk.map((t) => t.id) } }, { puskesmasId: pkmId }] } })
      const mendatang = jPk.filter((j) => new Date(j.tanggal) >= hariIniMid && ['DIJADWALKAN', 'DIKONFIRMASI'].includes(j.status)).length
      const evalPk = await db.evaluasiKompetensi.findMany({
        where: { jadwalId: { in: idsPk } },
        select: { skor: true, sumber: true, tenagaKesehatanId: true },
      })
      const perTk: Record<string, { awal: number[]; evals: number[] }> = {}
      const semuaEval = await db.evaluasiKompetensi.findMany({
        where: { OR: [{ jadwalId: { in: idsPk } }, { tenagaKesehatan: { puskesmasId: pkmId } }] },
        select: { skor: true, sumber: true, tenagaKesehatanId: true },
      })
      for (const e of semuaEval) {
        perTk[e.tenagaKesehatanId] = perTk[e.tenagaKesehatanId] || { awal: [], evals: [] }
        if (e.sumber === 'AWAL') perTk[e.tenagaKesehatanId].awal.push(e.skor)
        else perTk[e.tenagaKesehatanId].evals.push(e.skor)
      }
      let meningkat = 0, perluPendampingan = 0
      for (const v of Object.values(perTk)) {
        const awal = v.awal.length ? v.awal.reduce((a, b) => a + b, 0) / v.awal.length : 0
        const ev = v.evals.length ? v.evals.reduce((a, b) => a + b, 0) / v.evals.length : 0
        if (ev > 0 && ev > awal) meningkat++
        else if (ev > 0 && ev < 4) perluPendampingan++
      }
      return ok({
        puskesmas: {
          pembimbingan: { terjadwal: jPk.filter((j) => ['DIRENCANAKAN', 'DIJADWALKAN', 'DIKONFIRMASI'].includes(j.status)).length, selesai: jPk.filter((j) => j.status === 'SELESAI').length, mendatang },
          temuan: { total: tmPk.length, prioritasTinggi: tmPk.filter((t) => ['TINGGI', 'KRITIS'].includes(t.tingkatRisiko)).length, belumSelesai: tmPk.filter((t) => t.status === 'TERBUKA').length },
          rtl: { aktif: rtlPk.filter((r) => ['BELUM_DIMULAI', 'DALAM_PROSES'].includes(r.status)).length, selesai: rtlPk.filter((r) => ['SELESAI', 'TERVERIFIKASI'].includes(r.status)).length, terlambat: rtlPk.filter((r) => r.status === 'TERLAMBAT').length },
          kompetensi: { meningkat, perluPendampingan },
        },
      })
    }

    return ok({
      stats: {
        totalPuskesmas: puskesmas, totalPerseptor: perseptor, totalTenagaKesehatan: tenagaKesehatan,
        pembimbinganTerjadwal: terjadwal, pembimbinganBerlangsung: berlangsung, pembimbinganSelesai: selesai,
        pembimbinganBelumDilaksanakan: belumDilaksanakan,
        tindakLanjutAktif: rtlAktif, tindakLanjutSelesai: rtlSelesai,
        temuanPrioritas: temuanPrioritas, penyelesaianRTL,
      },
      charts: { perBulan, perPuskesmas, perProfesi, jenisTemuan, statusRTL, kompetensiTren },
      agenda,
    })
  })
}
