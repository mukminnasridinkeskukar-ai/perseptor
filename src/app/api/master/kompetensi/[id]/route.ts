import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.kompetensi.findUnique({ where: { id } })
    if (!sebelum) return fail('Kompetensi tidak ditemukan.', 404)
    const body = await req.json()
    const row = await db.kompetensi.update({
      where: { id },
      data: { nama: str(body.nama, 200) || sebelum.nama, kelompok: str(body.kelompok, 100) || sebelum.kelompok, deskripsi: str(body.deskripsi, 500) || null, aktif: body.aktif !== undefined ? body.aktif === true : sebelum.aktif },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'kompetensi', entitasId: id, deskripsi: `Mengubah kompetensi ${row.nama}`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.kompetensi.findUnique({ where: { id }, include: { _count: { select: { pemetaan: true, evaluasi: true } } } })
    if (!sebelum) return fail('Kompetensi tidak ditemukan.', 404)
    if (sebelum._count.pemetaan > 0 || sebelum._count.evaluasi > 0) {
      const row = await db.kompetensi.update({ where: { id }, data: { aktif: false } })
      await auditLog({ user, aksi: 'UPDATE', entitas: 'kompetensi', entitasId: id, deskripsi: `Menonaktifkan kompetensi ${row.nama} (masih dipakai di data lain)`, dataSebelum: sebelum, dataSesudah: row })
      return ok({ data: row, softDeleted: true })
    }
    await db.kompetensi.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'kompetensi', entitasId: id, deskripsi: `Menghapus kompetensi ${sebelum.nama}`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
