import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

/** GET /api/rtl — daftar rencana tindak lanjut dengan scoping role + auto-flag TERLAMBAT */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('status')) where.status = sp.get('status')
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (sp.get('temuanId')) where.temuanId = sp.get('temuanId')
    if (sp.get('rekomendasiId')) where.rekomendasiId = sp.get('rekomendasiId')
    if (user.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) where.puskesmasId = user.puskesmasId
    else if (user.role === 'PESERTA' && user.puskesmasId) where.puskesmasId = user.puskesmasId
    else if (user.role === 'PERSEPTOR' && user.perseptorId) {
      where.temuan = { jadwal: { perseptorId: user.perseptorId } }
    }
    const q = sp.get('q')
    if (q) where.kegiatan = { contains: q }

    const rows = await db.rTL.findMany({
      where,
      include: {
        temuan: { include: { jadwal: { select: { id: true, topik: true, tanggal: true, puskesmas: { select: { id: true, nama: true } }, perseptor: { select: { id: true, nama: true } } } } } },
        rekomendasi: { select: { id: true, rekomendasi: true, masalah: true } },
        puskesmas: { select: { nama: true } },
        verifikasi: { orderBy: { pada: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    // Auto-flag terlambat
    const hariIni = new Date()
    const data = rows.map((r) => {
      const autoTerlambat = ['BELUM_DIMULAI', 'DALAM_PROSES'].includes(r.status) && r.targetSelesai && new Date(r.targetSelesai) < hariIni
      return { ...r, terlambatOtomatis: autoTerlambat }
    })
    return ok({ data })
  })
}

/** POST /api/rtl — Puskesmas/Dinas membuat RTL */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (!['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'].includes(user.role)) {
      return fail('Hanya Admin Dinas / Admin Puskesmas yang membuat rencana tindak lanjut.', 403)
    }
    const body = await req.json()
    const kegiatan = str(body.kegiatan, 2000)
    if (!kegiatan) return fail('Kegiatan tindak lanjut wajib diisi.', 422)
    let temuanId = str(body.temuanId, 50) || null
    let rekomendasiId = str(body.rekomendasiId, 50) || null
    let puskesmasId = str(body.puskesmasId, 50) || user.puskesmasId
    if (temuanId) {
      const temuan = await db.temuan.findUnique({ where: { id: temuanId }, include: { jadwal: { select: { puskesmasId: true } } } })
      if (temuan) puskesmasId = puskesmasId || temuan.jadwal.puskesmasId
    }
    if (user.role === 'ADMIN_PUSKESMAS' && puskesmasId && puskesmasId !== user.puskesmasId) {
      return fail('Akses ditolak: RTL hanya untuk Puskesmas Anda.', 403)
    }
    const row = await db.rTL.create({
      data: {
        temuanId, rekomendasiId, puskesmasId,
        kegiatan,
        penanggungJawab: str(body.penanggungJawab, 200) || null,
        targetSelesai: dateOrNull(body.targetSelesai),
        status: pick(body.status, ['BELUM_DIMULAI', 'DALAM_PROSES', 'SELESAI'], 'BELUM_DIMULAI'),
        bukti: str(body.bukti, 2000) || null,
        tanggalSelesai: dateOrNull(body.tanggalSelesai),
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'rencana_tindak_lanjut', entitasId: row.id, deskripsi: `Membuat RTL: ${kegiatan.slice(0, 100)}`, dataSesudah: row })
    // Notifikasi perseptor utk verifikasi nanti & dinas utk monitoring
    const { notifyUsers } = await import('@/lib/api')
    await notifyUsers({ roles: ['SUPERADMIN', 'ADMIN_DINAS'], judul: 'RTL baru dibuat', pesan: `${user.nama}: ${kegiatan.slice(0, 100)}`, tipe: 'RTL', refType: 'rtl', refId: row.id })
    return ok({ data: row }, 201)
  })
}
