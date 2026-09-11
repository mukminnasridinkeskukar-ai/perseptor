import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** PUT: set ulang daftar peserta + kehadiran */
export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    const boleh = ['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role) || (user.role === 'ADMIN_PUSKESMAS' && jadwal.puskesmasId === user.puskesmasId)
    if (!boleh) return fail('Akses ditolak.', 403)
    const body = await req.json()
    await db.peserta.deleteMany({ where: { jadwalId: id } })
    if (Array.isArray(body.peserta) && body.peserta.length) {
      for (const p of body.peserta) {
        await db.peserta.create({
          data: { jadwalId: id, tenagaKesehatanId: str(p.tenagaKesehatanId, 50), hadir: p.hadir === true, catatan: str(p.catatan, 300) || null },
        })
      }
    }
    await auditLog({ user, aksi: 'UPDATE', entitas: 'peserta_pembimbingan', entitasId: id, deskripsi: `Mengubah daftar peserta pembimbingan "${jadwal.topik}" (${(body.peserta || []).length} peserta)`, dataSesudah: { jumlah: (body.peserta || []).length } })
    const rows = await db.peserta.findMany({ where: { jadwalId: id }, include: { tenagaKesehatan: true } })
    return ok({ data: rows })
  })
}

/** PATCH: tandai kehadiran satu peserta */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const body = await req.json()
    const pesertaId = str(body.pesertaId, 50)
    const peserta = await db.peserta.findUnique({ where: { id: pesertaId } })
    if (!peserta || peserta.jadwalId !== id) return fail('Peserta tidak ditemukan.', 404)
    const row = await db.peserta.update({ where: { id: pesertaId }, data: { hadir: body.hadir === true } })
    return ok({ data: row })
  })
}
