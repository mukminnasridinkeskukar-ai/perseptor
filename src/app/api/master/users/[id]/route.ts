import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, hashPassword, SESSION_COOKIE } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.user.findUnique({ where: { id } })
    if (!sebelum) return fail('Pengguna tidak ditemukan.', 404)
    if (sebelum.role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') return fail('Hanya Superadmin dapat mengubah akun Superadmin.', 403)
    const body = await req.json()
    const data: any = {
      nama: str(body.nama, 200) || sebelum.nama,
      role: pick(body.role, ['SUPERADMIN', 'ADMIN_DINAS', 'PERSEPTOR', 'ADMIN_PUSKESMAS', 'PESERTA'], sebelum.role),
      puskesmasId: body.puskesmasId !== undefined ? (str(body.puskesmasId, 50) || null) : sebelum.puskesmasId,
      perseptorId: body.perseptorId !== undefined ? (str(body.perseptorId, 50) || null) : sebelum.perseptorId,
      tenagaKesehatanId: body.tenagaKesehatanId !== undefined ? (str(body.tenagaKesehatanId, 50) || null) : sebelum.tenagaKesehatanId,
      aktif: body.aktif !== undefined ? body.aktif === true : sebelum.aktif,
    }
    if (body.password) {
      if (String(body.password).length < 6) return fail('Password minimal 6 karakter.', 422)
      data.passwordHash = hashPassword(String(body.password))
    }
    const row = await db.user.update({ where: { id }, data })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'user', entitasId: id, deskripsi: `Mengubah pengguna ${row.nama}`, dataSebelum: { nama: sebelum.nama, role: sebelum.role, aktif: sebelum.aktif }, dataSesudah: { nama: row.nama, role: row.role, aktif: row.aktif } })
    return ok({ data: { ...row, passwordHash: undefined } })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    if (id === user.id) return fail('Tidak dapat menghapus akun sendiri.', 422)
    const sebelum = await db.user.findUnique({ where: { id } })
    if (!sebelum) return fail('Pengguna tidak ditemukan.', 404)
    if (sebelum.role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') return fail('Hanya Superadmin dapat menghapus akun Superadmin.', 403)
    await db.user.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'user', entitasId: id, deskripsi: `Menghapus pengguna ${sebelum.nama}`, dataSebelum: { email: sebelum.email, nama: sebelum.nama, role: sebelum.role } })
    return ok({ success: true })
  })
}
