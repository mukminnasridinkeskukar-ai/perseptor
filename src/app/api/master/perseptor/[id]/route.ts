import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const row = await db.perseptor.findUnique({
      where: { id },
      include: { penugasan: { include: { puskesmas: true } }, _count: { select: { jadwal: true, program: true } } },
    })
    if (!row) return fail('Perseptor tidak ditemukan.', 404)
    return ok({ data: row })
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.perseptor.findUnique({ where: { id } })
    if (!sebelum) return fail('Perseptor tidak ditemukan.', 404)
    const body = await req.json()
    const row = await db.perseptor.update({
      where: { id },
      data: {
        nama: str(body.nama, 200) || sebelum.nama,
        nip: str(body.nip, 60) || null,
        profesi: str(body.profesi, 60) || sebelum.profesi,
        jabatan: str(body.jabatan, 150) || null,
        unitKerja: str(body.unitKerja, 150) || null,
        kompetensi: Array.isArray(body.kompetensi) ? body.kompetensi.join(', ') : str(body.kompetensi, 500) || null,
        nomorSTR: str(body.nomorSTR, 60) || null,
        nomorSIP: str(body.nomorSIP, 60) || null,
        sertifikat: str(body.sertifikat, 500) || null,
        areaKeahlian: str(body.areaKeahlian, 300) || null,
        statusAktif: body.statusAktif !== undefined ? body.statusAktif === true : sebelum.statusAktif,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'perseptor', entitasId: id, deskripsi: `Mengubah perseptor ${row.nama}`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN'])
    const { id } = await ctx.params
    const sebelum = await db.perseptor.findUnique({ where: { id }, include: { _count: { select: { jadwal: true } } } })
    if (!sebelum) return fail('Perseptor tidak ditemukan.', 404)
    if (sebelum._count.jadwal > 0) {
      const row = await db.perseptor.update({ where: { id }, data: { statusAktif: false } })
      await auditLog({ user, aksi: 'UPDATE', entitas: 'perseptor', entitasId: id, deskripsi: `Menonaktifkan perseptor ${row.nama} (masih memiliki riwayat jadwal)`, dataSebelum: sebelum, dataSesudah: row })
      return ok({ data: row, softDeleted: true })
    }
    await db.perseptor.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'perseptor', entitasId: id, deskripsi: `Menghapus perseptor ${sebelum.nama}`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
