import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'])
    const { id } = await ctx.params
    const sebelum = await db.pemetaan.findUnique({ where: { id } })
    if (!sebelum) return fail('Data pemetaan tidak ditemukan.', 404)
    if (user.role === 'ADMIN_PUSKESMAS' && sebelum.puskesmasId !== user.puskesmasId) return fail('Akses ditolak.', 403)
    const body = await req.json()
    const skor = body.skor !== undefined ? (intOrNull(body.skor) ?? sebelum.skor) : sebelum.skor
    const prioritas = skor >= 7 ? 'SANGAT_TINGGI' : skor >= 5 ? 'TINGGI' : skor >= 3 ? 'SEDANG' : 'RENDAH'
    const row = await db.pemetaan.update({
      where: { id },
      data: {
        tahun: intOrNull(body.tahun) ?? sebelum.tahun,
        kompetensiId: body.kompetensiId !== undefined ? (str(body.kompetensiId, 50) || null) : sebelum.kompetensiId,
        kompetensiTeks: body.kompetensiTeks !== undefined ? (str(body.kompetensiTeks, 200) || null) : sebelum.kompetensiTeks,
        masalah: body.masalah !== undefined ? (str(body.masalah, 2000) || null) : sebelum.masalah,
        kasusSering: body.kasusSering !== undefined ? (str(body.kasusSering, 1000) || null) : sebelum.kasusSering,
        risiko: body.risiko !== undefined ? (str(body.risiko, 1000) || null) : sebelum.risiko,
        kebutuhan: body.kebutuhan !== undefined ? (str(body.kebutuhan, 2000) || null) : sebelum.kebutuhan,
        skor, prioritas,
        status: body.status !== undefined ? pick(body.status, ['DIPROSES', 'MASUK_PERENCANAAN', 'SELESAI'], sebelum.status) : sebelum.status,
        catatan: body.catatan !== undefined ? (str(body.catatan, 1000) || null) : sebelum.catatan,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'pemetaan', entitasId: id, deskripsi: `Mengubah pemetaan kebutuhan (prioritas ${prioritas})`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sebelum = await db.pemetaan.findUnique({ where: { id } })
    if (!sebelum) return fail('Data pemetaan tidak ditemukan.', 404)
    await db.pemetaan.delete({ where: { id } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'pemetaan', entitasId: id, deskripsi: 'Menghapus data pemetaan', dataSebelum: sebelum })
    return ok({ success: true })
  })
}
