import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick, dateOrNull } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const sebelum = await db.rTL.findUnique({ where: { id } })
    if (!sebelum) return fail('RTL tidak ditemukan.', 404)
    if (user.role === 'ADMIN_PUSKESMAS' && sebelum.puskesmasId && sebelum.puskesmasId !== user.puskesmasId) return fail('Akses ditolak.', 403)
    if (user.role === 'PESERTA') return fail('Akses ditolak.', 403)
    const body = await req.json()
    const status = body.status !== undefined ? pick(body.status, ['BELUM_DIMULAI', 'DALAM_PROSES', 'SELESAI'], sebelum.status) : sebelum.status
    // Jika RTL ditandai selesai, verifikasiStatus kembali menunggu
    const verifikasiStatus = status === 'SELESAI' && sebelum.verifikasiStatus !== 'DISETUJUI' ? 'MENUNGGU' : sebelum.verifikasiStatus
    const row = await db.rTL.update({
      where: { id },
      data: {
        kegiatan: str(body.kegiatan, 2000) || sebelum.kegiatan,
        penanggungJawab: body.penanggungJawab !== undefined ? (str(body.penanggungJawab, 200) || null) : sebelum.penanggungJawab,
        targetSelesai: body.targetSelesai !== undefined ? dateOrNull(body.targetSelesai) : sebelum.targetSelesai,
        status,
        bukti: body.bukti !== undefined ? (str(body.bukti, 2000) || null) : sebelum.bukti,
        tanggalSelesai: body.tanggalSelesai !== undefined ? dateOrNull(body.tanggalSelesai) : sebelum.tanggalSelesai,
        verifikasiStatus,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'rencana_tindak_lanjut', entitasId: id, deskripsi: `Mengubah RTL "${row.kegiatan.slice(0, 80)}" (status: ${status})`, dataSebelum: sebelum, dataSesudah: row })
    if (status === 'SELESAI') {
      const { notifyUsers } = await import('@/lib/api')
      // Notifikasi perseptor pembimbing utk verifikasi
      if (row.temuanId) {
        const temuan = await db.temuan.findUnique({ where: { id: row.temuanId }, include: { jadwal: { include: { perseptor: true } } } })
        if (temuan) {
          const pUser = await db.user.findFirst({ where: { perseptorId: temuan.jadwal.perseptorId } })
          await notifyUsers({ userIds: pUser ? [pUser.id] : [], judul: 'RTL menunggu verifikasi Anda', pesan: `"${row.kegiatan.slice(0, 80)}" telah selesai dan menunggu verifikasi.`, tipe: 'VERIFIKASI', refType: 'rtl', refId: row.id })
        }
      }
    }
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (!['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'].includes(user.role)) return fail('Akses ditolak.', 403)
    const { id } = await ctx.params
    const sebelum = await db.rTL.findUnique({ where: { id } })
    if (!sebelum) return fail('RTL tidak ditemukan.', 404)
    if (user.role === 'ADMIN_PUSKESMAS' && sebelum.puskesmasId && sebelum.puskesmasId !== user.puskesmasId) return fail('Akses ditolak.', 403)
    await db.rTL.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'rencana_tindak_lanjut', entitasId: id, deskripsi: `Menghapus RTL "${sebelum.kegiatan.slice(0, 80)}"`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
