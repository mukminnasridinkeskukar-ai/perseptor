import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'
import { STATUS_JADWAL } from '@/lib/constants'

type Ctx = { params: Promise<{ id: string }> }

/** PATCH status jadwal + notifikasi otomatis */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id }, include: { puskesmas: true } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    const body = await req.json()
    const status = pick(body.status, [...STATUS_JADWAL], jadwal.status)
    const boleh: boolean =
      isDinas(user.role) ||
      (user.role === 'PERSEPTOR' && jadwal.perseptorId === user.perseptorId) ||
      (user.role === 'ADMIN_PUSKESMAS' && jadwal.puskesmasId === user.puskesmasId && ['DIKONFIRMASI', 'DITUNDA', 'DIBATALKAN'].includes(status))
    if (!boleh) return fail('Akses ditolak untuk mengubah status ini.', 403)
    const sebelum = jadwal.status
    const row = await db.jadwal.update({
      where: { id },
      data: {
        status,
        catatan: body.keterangan ? str(body.keterangan, 1000) : jadwal.catatan,
      },
    })
    await auditLog({ user, aksi: 'UPDATE_STATUS', entitas: 'jadwal', entitasId: id, deskripsi: `Mengubah status jadwal "${jadwal.topik}" dari ${sebelum} menjadi ${status}`, dataSebelum: { status: sebelum }, dataSesudah: { status } })
    const { notifyUsers } = await import('@/lib/api')
    const adminsDinas = await db.user.findMany({ where: { role: { in: ['SUPERADMIN', 'ADMIN_DINAS'] } } })
    const perseptorUser = await db.user.findFirst({ where: { perseptorId: row.perseptorId } })
    const adminPkm = await db.user.findMany({ where: { role: 'ADMIN_PUSKESMAS', puskesmasId: row.puskesmasId } })
    const petaStatus: Record<string, string> = { DIJADWALKAN: 'dijadwalkan', DIKONFIRMASI: 'dikonfirmasi', BERLANGSUNG: 'sedang berlangsung', SELESAI: 'telah selesai', DITUNDA: 'ditunda', DIBATALKAN: 'dibatalkan' }
    const pesan = `Kegiatan "${row.topik}" di ${jadwal.puskesmas.nama} ${petaStatus[status] || status}.`
    const semua = [...new Set([...adminsDinas.map((u) => u.id), ...(perseptorUser ? [perseptorUser.id] : []), ...adminPkm.map((u) => u.id)])].filter((uid) => uid !== user.id)
    await notifyUsers({ userIds: semua, judul: 'Perubahan status pembimbingan', pesan, tipe: 'JADWAL', refType: 'jadwal', refId: row.id })
    return ok({ data: row })
  })
}
