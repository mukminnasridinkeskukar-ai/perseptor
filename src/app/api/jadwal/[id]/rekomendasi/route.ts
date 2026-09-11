import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, dateOrNull, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** POST: buat rekomendasi (alur Temuan -> Analisis -> Rekomendasi) */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR' && jadwal.perseptorId === user.perseptorId) && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) {
      return fail('Hanya perseptor yang memberikan rekomendasi.', 403)
    }
    const body = await req.json()
    const rekomendasi = str(body.rekomendasi, 3000)
    if (!rekomendasi) return fail('Isi rekomendasi wajib diisi.', 422)
    const row = await db.rekomendasi.create({
      data: {
        jadwalId: id,
        temuanId: str(body.temuanId, 50) || null,
        masalah: str(body.masalah, 2000) || null,
        akarMasalah: str(body.akarMasalah, 2000) || null,
        rekomendasi,
        penanggungJawab: str(body.penanggungJawab, 200) || null,
        targetWaktu: dateOrNull(body.targetWaktu),
        indikatorKeberhasilan: str(body.indikatorKeberhasilan, 500) || null,
        status: pick(body.status, ['AKTIF', 'DILAKSANAKAN', 'SELESAI'], 'AKTIF'),
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'rekomendasi', entitasId: row.id, deskripsi: `Memberikan rekomendasi pada ${jadwal.topik}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}

/** PATCH: ubah rekomendasi by body.id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const body = await req.json()
    const rid = str(body.id, 50)
    const sebelum = await db.rekomendasi.findUnique({ where: { id: rid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Rekomendasi tidak ditemukan.', 404)
    const row = await db.rekomendasi.update({
      where: { id: rid },
      data: {
        masalah: body.masalah !== undefined ? (str(body.masalah, 2000) || null) : sebelum.masalah,
        akarMasalah: body.akarMasalah !== undefined ? (str(body.akarMasalah, 2000) || null) : sebelum.akarMasalah,
        rekomendasi: str(body.rekomendasi, 3000) || sebelum.rekomendasi,
        penanggungJawab: body.penanggungJawab !== undefined ? (str(body.penanggungJawab, 200) || null) : sebelum.penanggungJawab,
        targetWaktu: body.targetWaktu !== undefined ? dateOrNull(body.targetWaktu) : sebelum.targetWaktu,
        indikatorKeberhasilan: body.indikatorKeberhasilan !== undefined ? (str(body.indikatorKeberhasilan, 500) || null) : sebelum.indikatorKeberhasilan,
        status: body.status !== undefined ? pick(body.status, ['AKTIF', 'DILAKSANAKAN', 'SELESAI'], sebelum.status) : sebelum.status,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'rekomendasi', entitasId: rid, deskripsi: `Mengubah rekomendasi`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

/** DELETE ?rekomendasiId=xxx */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const rid = req.nextUrl.searchParams.get('rekomendasiId') || ''
    const sebelum = await db.rekomendasi.findUnique({ where: { id: rid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Rekomendasi tidak ditemukan.', 404)
    if (!['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role) && user.role !== 'PERSEPTOR') return fail('Akses ditolak.', 403)
    await db.rekomendasi.delete({ where: { id: rid } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'rekomendasi', entitasId: rid, deskripsi: 'Menghapus rekomendasi', dataSebelum: sebelum })
    return ok({ success: true })
  })
}
