import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** GET detail lengkap satu jadwal (pusat pengelolaan pembimbingan) */
export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const row = await db.jadwal.findUnique({
      where: { id },
      include: {
        program: true,
        puskesmas: true,
        perseptor: true,
        peserta: { include: { tenagaKesehatan: true } },
        penilaian: { include: { tenagaKesehatan: { select: { id: true, nama: true } } }, orderBy: { createdAt: 'asc' } },
        kasus: { orderBy: { tanggal: 'asc' } },
        temuan: { include: { rtl: true }, orderBy: { createdAt: 'asc' } },
        rekomendasi: { orderBy: { createdAt: 'asc' } },
        dokumentasi: true,
        beritaAcara: true,
      },
    })
    if (!row) return fail('Jadwal pembimbingan tidak ditemukan.', 404)
    // Scoping
    if (user.role === 'PERSEPTOR' && row.perseptorId !== user.perseptorId) return fail('Akses ditolak: bukan binaan Anda.', 403)
    if (user.role === 'ADMIN_PUSKESMAS' && row.puskesmasId !== user.puskesmasId) return fail('Akses ditolak.', 403)
    if (user.role === 'PESERTA' && user.tenagaKesehatanId) {
      const ikut = row.peserta.some((p) => p.tenagaKesehatanId === user.tenagaKesehatanId)
      if (!ikut) return fail('Akses ditolak: Anda bukan peserta kegiatan ini.', 403)
    }
    // Kompetensi yang tersedia untuk evaluasi
    const kompetensiList = await db.kompetensi.findMany({ where: { aktif: true }, orderBy: { nama: 'asc' } })
    // Evaluasi kompetensi peserta (progres)
    const evaluasi = await db.evaluasiKompetensi.findMany({
      where: { tenagaKesehatanId: { in: row.peserta.map((p) => p.tenagaKesehatanId) } },
      include: { kompetensi: { select: { nama: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return ok({ data: row, kompetensiList, evaluasi })
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const sebelum = await db.jadwal.findUnique({ where: { id } })
    if (!sebelum) return fail('Jadwal tidak ditemukan.', 404)
    const bolehUbah = isDinas(user.role) || (user.role === 'PERSEPTOR' && sebelum.perseptorId === user.perseptorId)
    if (!bolehUbah) return fail('Akses ditolak.', 403)
    const body = await req.json()
    let tanggal = sebelum.tanggal
    if (body.tanggal) {
      const t = new Date(body.tanggal)
      if (isNaN(t.getTime())) return fail('Tanggal tidak valid.', 422)
      tanggal = t
    }
    if (body.perseptorId && body.perseptorId !== sebelum.perseptorId && !isDinas(user.role)) return fail('Hanya dinas yang dapat mengganti perseptor.', 403)
    const row = await db.jadwal.update({
      where: { id },
      data: {
        programId: body.programId !== undefined ? (str(body.programId, 50) || null) : sebelum.programId,
        puskesmasId: isDinas(user.role) && body.puskesmasId ? str(body.puskesmasId, 50) : sebelum.puskesmasId,
        perseptorId: isDinas(user.role) && body.perseptorId ? str(body.perseptorId, 50) : sebelum.perseptorId,
        tanggal,
        waktuMulai: str(body.waktuMulai, 10) || sebelum.waktuMulai,
        waktuSelesai: str(body.waktuSelesai, 10) || sebelum.waktuSelesai,
        topik: str(body.topik, 300) || sebelum.topik,
        tujuan: body.tujuan !== undefined ? (str(body.tujuan, 1000) || null) : sebelum.tujuan,
        metode: body.metode !== undefined ? (Array.isArray(body.metode) ? body.metode.join(', ') : str(body.metode, 300) || null) : sebelum.metode,
        catatan: body.catatan !== undefined ? (str(body.catatan, 1000) || null) : sebelum.catatan,
        status: body.status !== undefined ? pick(body.status, ['DIRENCANAKAN', 'DIJADWALKAN', 'DIKONFIRMASI', 'BERLANGSUNG', 'SELESAI', 'DITUNDA', 'DIBATALKAN'], sebelum.status) : sebelum.status,
      },
    })
    // Update peserta bila dikirim
    if (Array.isArray(body.pesertaIds)) {
      await db.peserta.deleteMany({ where: { jadwalId: id } })
      if (body.pesertaIds.length) {
        await db.peserta.createMany({ data: body.pesertaIds.map((tid: string) => ({ jadwalId: id, tenagaKesehatanId: tid, hadir: row.status === 'SELESAI' || row.status === 'BERLANGSUNG' })) })
      }
    }
    await auditLog({ user, aksi: 'UPDATE', entitas: 'jadwal', entitasId: id, deskripsi: `Mengubah jadwal pembimbingan "${row.topik}"`, dataSebelum: sebelum, dataSesudah: row })
    // Notifikasi bila tanggal/status berubah
    if (body.tanggal && new Date(body.tanggal).getTime() !== sebelum.tanggal.getTime()) {
      const { notifyUsers } = await import('@/lib/api')
      const pesertaUserIds = await db.user.findMany({ where: { tenagaKesehatanId: { in: row.peserta.map((p) => p.tenagaKesehatanId) } } })
      const adminPkm = await db.user.findMany({ where: { role: 'ADMIN_PUSKESMAS', puskesmasId: row.puskesmasId } })
      await notifyUsers({
        userIds: pesertaUserIds.map((u) => u.id).concat(adminPkm.map((u) => u.id)),
        judul: 'Perubahan jadwal pembimbingan', pesan: `Jadwal "${row.topik}" diubah menjadi ${row.tanggal.toLocaleDateString('id-ID')} ${row.waktuMulai}.`, tipe: 'JADWAL', refType: 'jadwal', refId: row.id,
      })
    }
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (!isDinas(user.role)) return fail('Hanya dinas yang dapat menghapus jadwal.', 403)
    const { id } = await ctx.params
    const sebelum = await db.jadwal.findUnique({ where: { id }, include: { _count: { select: { penilaian: true, temuan: true } } } })
    if (!sebelum) return fail('Jadwal tidak ditemukan.', 404)
    if (sebelum._count.penilaian > 0 || sebelum._count.temuan > 0) {
      return fail('Jadwal sudah memiliki hasil pembimbingan (instrumen/temuan). Ubah status menjadi DIBATALKAN daripada menghapus.', 409)
    }
    await db.jadwal.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'jadwal', entitasId: id, deskripsi: `Menghapus jadwal pembimbingan "${sebelum.topik}"`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
