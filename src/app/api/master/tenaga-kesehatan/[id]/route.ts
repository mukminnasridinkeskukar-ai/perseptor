import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const row = await db.tenagaKesehatan.findUnique({
      where: { id },
      include: {
        puskesmas: true,
        peserta: { include: { jadwal: { select: { id: true, topik: true, tanggal: true, status: true } } } },
        evaluasi: { include: { kompetensi: true }, orderBy: { createdAt: 'asc' } },
        penilaian: { include: { jadwal: { select: { topik: true, tanggal: true } } } },
      },
    })
    if (!row) return fail('Tenaga kesehatan tidak ditemukan.', 404)
    return ok({ data: row })
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'])
    const { id } = await ctx.params
    const sebelum = await db.tenagaKesehatan.findUnique({ where: { id } })
    if (!sebelum) return fail('Tenaga kesehatan tidak ditemukan.', 404)
    if (user.role === 'ADMIN_PUSKESMAS' && sebelum.puskesmasId !== user.puskesmasId) return fail('Akses ditolak.', 403)
    const body = await req.json()
    const row = await db.tenagaKesehatan.update({
      where: { id },
      data: {
        nama: str(body.nama, 200) || sebelum.nama,
        nipNik: str(body.nipNik, 60) || null,
        profesi: str(body.profesi, 60) || sebelum.profesi,
        jabatan: str(body.jabatan, 150) || null,
        unitKerja: str(body.unitKerja, 150) || null,
        puskesmasId: str(body.puskesmasId, 50) || sebelum.puskesmasId,
        kompetensi: str(body.kompetensi, 500) || null,
        masaKerja: intOrNull(body.masaKerja),
        status: str(body.status, 20) || sebelum.status,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'tenaga_kesehatan', entitasId: id, deskripsi: `Mengubah tenaga kesehatan ${row.nama}`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.tenagaKesehatan.findUnique({ where: { id }, include: { _count: { select: { peserta: true } } } })
    if (!sebelum) return fail('Tenaga kesehatan tidak ditemukan.', 404)
    if (sebelum._count.peserta > 0) {
      const row = await db.tenagaKesehatan.update({ where: { id }, data: { status: 'NONAKTIF' } })
      await auditLog({ user, aksi: 'UPDATE', entitas: 'tenaga_kesehatan', entitasId: id, deskripsi: `Menonaktifkan tenaga kesehatan ${row.nama} (masih tercatat di kegiatan)`, dataSebelum: sebelum, dataSesudah: row })
      return ok({ data: row, softDeleted: true })
    }
    await db.tenagaKesehatan.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'tenaga_kesehatan', entitasId: id, deskripsi: `Menghapus tenaga kesehatan ${sebelum.nama}`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
