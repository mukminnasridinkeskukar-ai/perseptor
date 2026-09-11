import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

/** GET /api/jadwal?tahun=&bulan=&status=&puskesmasId=&perseptorId=&q=&view=kalender */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    // Scoping role
    if (user.role === 'PERSEPTOR' && user.perseptorId) where.perseptorId = user.perseptorId
    else if (user.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) where.puskesmasId = user.puskesmasId
    else if (user.role === 'PESERTA' && user.tenagaKesehatanId) where.peserta = { some: { tenagaKesehatanId: user.tenagaKesehatanId } }

    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (sp.get('perseptorId')) where.perseptorId = sp.get('perseptorId')
    if (sp.get('status')) where.status = sp.get('status')
    if (sp.get('programId')) where.programId = sp.get('programId')
    const tahun = sp.get('tahun') ? parseInt(sp.get('tahun')!) : null
    const bulan = sp.get('bulan') ? parseInt(sp.get('bulan')!) : null
    if (tahun && !bulan) where.tanggal = { gte: new Date(tahun, 0, 1), lt: new Date(tahun + 1, 0, 1) }
    else if (tahun && bulan) where.tanggal = { gte: new Date(tahun, bulan - 1, 1), lt: new Date(tahun, bulan, 1) }
    const q = sp.get('q')
    if (q) where.OR = [{ topik: { contains: q } }, { catatan: { contains: q } }]

    const rows = await db.jadwal.findMany({
      where,
      include: {
        puskesmas: { select: { id: true, nama: true, kecamatan: true } },
        perseptor: { select: { id: true, nama: true, profesi: true } },
        program: { select: { id: true, nama: true } },
        peserta: { include: { tenagaKesehatan: { select: { id: true, nama: true, profesi: true } } } },
        _count: { select: { temuan: true, kasus: true, penilaian: true, dokumentasi: true } },
      },
      orderBy: { tanggal: 'desc' },
    })
    return ok({ data: rows })
  })
}

/** POST /api/jadwal — buat jadwal baru (Dinas / Admin Dinas) */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const bolehBuat = isDinas(user.role)
    if (!bolehBuat) return fail('Hanya Dinas Kesehatan yang dapat membuat jadwal pembimbingan.', 403)
    const body = await req.json()
    const puskesmasId = str(body.puskesmasId, 50)
    const perseptorId = str(body.perseptorId, 50)
    const topik = str(body.topik, 300)
    if (!puskesmasId || !perseptorId || !topik) return fail('Puskesmas, perseptor, dan topik wajib diisi.', 422)
    const tanggal = new Date(body.tanggal)
    if (isNaN(tanggal.getTime())) return fail('Tanggal tidak valid.', 422)

    // Cek benturan jadwal perseptor (hari sama)
    const mulaiHari = new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate())
    const akhirHari = new Date(mulaiHari.getTime() + 86400000)
    const benturan = await db.jadwal.findFirst({
      where: { perseptorId, tanggal: { gte: mulaiHari, lt: akhirHari }, status: { in: ['DIRENCANAKAN', 'DIJADWALKAN', 'DIKONFIRMASI', 'BERLANGSUNG'] } },
      include: { puskesmas: { select: { nama: true } } },
    })
    if (benturan && !body.paksa) {
      return fail(`Benturan jadwal: perseptor sudah ditugaskan di ${benturan.puskesmas.nama} pada tanggal tersebut (topik: ${benturan.topik}).`, 409, { benturan: { id: benturan.id, puskesmas: benturan.puskesmas.nama, topik: benturan.topik } })
    }

    const row = await db.jadwal.create({
      data: {
        programId: str(body.programId, 50) || null,
        puskesmasId, perseptorId, tanggal,
        waktuMulai: str(body.waktuMulai, 10) || '08:00',
        waktuSelesai: str(body.waktuSelesai, 10) || '12:00',
        topik,
        tujuan: str(body.tujuan, 1000) || null,
        status: pick(body.status, ['DIRENCANAKAN', 'DIJADWALKAN', 'DIKONFIRMASI'], 'DIJADWALKAN'),
        metode: Array.isArray(body.metode) ? body.metode.join(', ') : str(body.metode, 300) || null,
        catatan: str(body.catatan, 1000) || null,
      },
    })
    // Set peserta
    if (Array.isArray(body.pesertaIds) && body.pesertaIds.length) {
      await db.peserta.createMany({ data: body.pesertaIds.map((tid: string) => ({ jadwalId: row.id, tenagaKesehatanId: tid })) })
    }
    const pUser = await db.user.findFirst({ where: { perseptorId } })
    const pkmUsers = await db.user.findMany({ where: { role: 'ADMIN_PUSKESMAS', puskesmasId } })
    const { notifyUsers } = await import('@/lib/api')
    await notifyUsers({
      userIds: pUser ? [pUser.id] : [], judul: 'Penugasan pembimbingan baru',
      pesan: `Anda ditugaskan membimbing "${topik}" pada ${tanggal.toLocaleDateString('id-ID')}.`, tipe: 'JADWAL', refType: 'jadwal', refId: row.id,
    })
    await notifyUsers({
      userIds: pkmUsers.map((u) => u.id), judul: 'Jadwal pembimbingan baru',
      pesan: `Dinas menetapkan jadwal pembimbingan "${topik}" pada ${tanggal.toLocaleDateString('id-ID')}. Siapkan data dan peserta.`, tipe: 'JADWAL', refType: 'jadwal', refId: row.id,
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'jadwal', entitasId: row.id, deskripsi: `Membuat jadwal pembimbingan "${topik}"`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
