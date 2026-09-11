import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** POST: catat kasus (dengan anonimisasi pasien) */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR' && jadwal.perseptorId === user.perseptorId) && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) {
      return fail('Hanya perseptor yang mencatat kasus.', 403)
    }
    const body = await req.json()
    const masalah = str(body.masalah, 2000)
    if (!masalah) return fail('Masalah kasus wajib diisi.', 422)
    // Anonimisasi: hindari menyimpan nama/NIK pasien — hanya kode anonim
    const jumlahKasus = await db.kasus.count({ where: { jadwalId: id } })
    const row = await db.kasus.create({
      data: {
        jadwalId: id,
        tanggal: body.tanggal ? new Date(body.tanggal) : jadwal.tanggal,
        jenisKasus: str(body.jenisKasus, 150) || 'Lainnya',
        kodeAnonim: str(body.kodeAnonim, 40) || `P-${String(100 + jumlahKasus + 1).slice(0, 4)}`,
        masalah,
        kondisi: str(body.kondisi, 2000) || null,
        tindakan: str(body.tindakan, 2000) || null,
        analisis: str(body.analisis, 2000) || null,
        pembahasan: str(body.pembahasan, 2000) || null,
        pembelajaran: str(body.pembelajaran, 2000) || null,
        rekomendasi: str(body.rekomendasi, 2000) || null,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'kasus', entitasId: row.id, deskripsi: `Mencatat kasus "${row.jenisKasus}" (${row.kodeAnonim}) pada ${jadwal.topik}`, dataSesudah: { jenisKasus: row.jenisKasus, kodeAnonim: row.kodeAnonim } })
    return ok({ data: row }, 201)
  })
}

/** PATCH: ubah kasus by body.id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const body = await req.json()
    const kid = str(body.id, 50)
    const sebelum = await db.kasus.findUnique({ where: { id: kid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Kasus tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR') && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) return fail('Akses ditolak.', 403)
    const row = await db.kasus.update({
      where: { id: kid },
      data: {
        jenisKasus: str(body.jenisKasus, 150) || sebelum.jenisKasus,
        kodeAnonim: str(body.kodeAnonim, 40) || sebelum.kodeAnonim,
        masalah: str(body.masalah, 2000) || sebelum.masalah,
        kondisi: body.kondisi !== undefined ? (str(body.kondisi, 2000) || null) : sebelum.kondisi,
        tindakan: body.tindakan !== undefined ? (str(body.tindakan, 2000) || null) : sebelum.tindakan,
        analisis: body.analisis !== undefined ? (str(body.analisis, 2000) || null) : sebelum.analisis,
        pembahasan: body.pembahasan !== undefined ? (str(body.pembahasan, 2000) || null) : sebelum.pembahasan,
        pembelajaran: body.pembelajaran !== undefined ? (str(body.pembelajaran, 2000) || null) : sebelum.pembelajaran,
        rekomendasi: body.rekomendasi !== undefined ? (str(body.rekomendasi, 2000) || null) : sebelum.rekomendasi,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'kasus', entitasId: kid, deskripsi: `Mengubah catatan kasus "${row.jenisKasus}"`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

/** DELETE ?kasusId=xxx */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const kid = req.nextUrl.searchParams.get('kasusId') || ''
    const sebelum = await db.kasus.findUnique({ where: { id: kid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Kasus tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR') && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) return fail('Akses ditolak.', 403)
    await db.kasus.delete({ where: { id: kid } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'kasus', entitasId: kid, deskripsi: `Menghapus catatan kasus "${sebelum.jenisKasus}"`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
