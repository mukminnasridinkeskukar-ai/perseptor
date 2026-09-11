import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const row = await db.puskesmas.findUnique({
      where: { id },
      include: {
        tenagaKesehatan: true,
        _count: { select: { jadwal: true, pemetaan: true } },
      },
    })
    if (!row) return fail('Puskesmas tidak ditemukan.', 404)
    return ok({ data: row })
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.puskesmas.findUnique({ where: { id } })
    if (!sebelum) return fail('Puskesmas tidak ditemukan.', 404)
    const body = await req.json()
    const row = await db.puskesmas.update({
      where: { id },
      data: {
        kode: str(body.kode, 50) || sebelum.kode,
        nama: str(body.nama, 200) || sebelum.nama,
        kecamatan: str(body.kecamatan, 100),
        alamat: str(body.alamat, 300) || null,
        kepalaPuskesmas: str(body.kepalaPuskesmas, 150) || null,
        telepon: str(body.telepon, 50) || null,
        email: str(body.email, 150) || null,
        status: pick(body.status, ['AKTIF', 'NONAKTIF'], sebelum.status),
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'puskesmas', entitasId: id, deskripsi: `Mengubah Puskesmas ${row.nama}`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.puskesmas.findUnique({ where: { id }, include: { _count: { select: { jadwal: true, tenagaKesehatan: true } } } })
    if (!sebelum) return fail('Puskesmas tidak ditemukan.', 404)
    if (sebelum._count.jadwal > 0 || sebelum._count.tenagaKesehatan > 0) {
      // Soft delete: nonaktifkan
      const row = await db.puskesmas.update({ where: { id }, data: { status: 'NONAKTIF' } })
      await auditLog({ user, aksi: 'UPDATE', entitas: 'puskesmas', entitasId: id, deskripsi: `Menonaktifkan Puskesmas ${row.nama} (masih memiliki data terkait)`, dataSebelum: sebelum, dataSesudah: row })
      return ok({ data: row, softDeleted: true })
    }
    await db.puskesmas.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'puskesmas', entitasId: id, deskripsi: `Menghapus Puskesmas ${sebelum.nama}`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
