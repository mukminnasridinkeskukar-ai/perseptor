import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const row = await db.program.findUnique({
      where: { id },
      include: { puskesmas: true, perseptor: true, jadwal: { include: { puskesmas: { select: { nama: true } } }, orderBy: { tanggal: 'asc' } } },
    })
    if (!row) return fail('Program tidak ditemukan.', 404)
    return ok({ data: row })
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.program.findUnique({ where: { id } })
    if (!sebelum) return fail('Program tidak ditemukan.', 404)
    const body = await req.json()
    const row = await db.program.update({
      where: { id },
      data: {
        nama: str(body.nama, 300) || sebelum.nama,
        tahun: intOrNull(body.tahun) ?? sebelum.tahun,
        periode: body.periode !== undefined ? pick(body.periode, ['TAHUNAN', 'SEMESTER', 'BULANAN', 'KHUSUS', 'KASUS', 'KEBUTUHAN'], sebelum.periode) : sebelum.periode,
        jenis: body.jenis !== undefined ? pick(body.jenis, ['REGULER', 'KHUSUS', 'KASUS', 'KEBUTUHAN'], sebelum.jenis) : sebelum.jenis,
        puskesmasId: body.puskesmasId !== undefined ? (str(body.puskesmasId, 50) || null) : sebelum.puskesmasId,
        bidang: body.bidang !== undefined ? (str(body.bidang, 200) || null) : sebelum.bidang,
        topik: body.topik !== undefined ? (str(body.topik, 500) || null) : sebelum.topik,
        tujuan: body.tujuan !== undefined ? (str(body.tujuan, 2000) || null) : sebelum.tujuan,
        perseptorId: body.perseptorId !== undefined ? (str(body.perseptorId, 50) || null) : sebelum.perseptorId,
        sasaran: body.sasaran !== undefined ? (str(body.sasaran, 1000) || null) : sebelum.sasaran,
        prioritas: body.prioritas !== undefined ? pick(body.prioritas, ['RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_TINGGI'], sebelum.prioritas) : sebelum.prioritas,
        target: body.target !== undefined ? (str(body.target, 500) || null) : sebelum.target,
        status: body.status !== undefined ? pick(body.status, ['DRAFT', 'AKTIF', 'SELESAI', 'DIBATALKAN'], sebelum.status) : sebelum.status,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'program', entitasId: id, deskripsi: `Mengubah program: ${row.nama}`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.program.findUnique({ where: { id }, include: { _count: { select: { jadwal: true } } } })
    if (!sebelum) return fail('Program tidak ditemukan.', 404)
    if (sebelum._count.jadwal > 0) return fail('Program memiliki jadwal terkait. Ubah status menjadi DIBATALKAN atau pindahkan jadwal terlebih dahulu.', 409)
    await db.program.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'program', entitasId: id, deskripsi: `Menghapus program: ${sebelum.nama}`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
