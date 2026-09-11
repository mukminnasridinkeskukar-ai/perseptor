import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** GET: daftar penilaian jadwal ini */
export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const rows = await db.penilaian.findMany({
      where: { jadwalId: id },
      include: { tenagaKesehatan: { select: { id: true, nama: true, profesi: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return ok({ data: rows })
  })
}

/** POST: tambah penilaian (perseptor) */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR' && jadwal.perseptorId === user.perseptorId) && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) {
      return fail('Hanya perseptor yang mengisi instrumen penilaian.', 403)
    }
    const body = await req.json()
    const aspek = str(body.aspek, 200)
    if (!aspek) return fail('Aspek penilaian wajib diisi.', 422)
    const skor = intOrNull(body.skor)
    if (skor !== null && (skor < 1 || skor > 5)) return fail('Skor harus 1-5.', 422)
    const row = await db.penilaian.create({
      data: {
        jadwalId: id,
        tenagaKesehatanId: str(body.tenagaKesehatanId, 50) || null,
        kategori: pick(body.kategori, ['PERSIAPAN', 'OBSERVASI', 'PENILAIAN'], 'OBSERVASI'),
        aspek, skor,
        catatan: str(body.catatan, 2000) || null,
        metode: str(body.metode, 200) || jadwal.metode,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'penilaian', entitasId: row.id, deskripsi: `Mengisi instrumen "${aspek}" (skor ${skor ?? '-'}) pada ${jadwal.topik}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}

/** PATCH: ubah penilaian by body.id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const body = await req.json()
    const pid = str(body.id, 50)
    const sebelum = await db.penilaian.findUnique({ where: { id: pid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Penilaian tidak ditemukan.', 404)
    const skor = body.skor !== undefined ? intOrNull(body.skor) : sebelum.skor
    if (skor !== null && (skor < 1 || skor > 5)) return fail('Skor harus 1-5.', 422)
    const row = await db.penilaian.update({
      where: { id: pid },
      data: {
        aspek: str(body.aspek, 200) || sebelum.aspek,
        skor,
        catatan: body.catatan !== undefined ? (str(body.catatan, 2000) || null) : sebelum.catatan,
        kategori: body.kategori !== undefined ? pick(body.kategori, ['PERSIAPAN', 'OBSERVASI', 'PENILAIAN'], sebelum.kategori) : sebelum.kategori,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'penilaian', entitasId: pid, deskripsi: `Mengubah penilaian "${row.aspek}"`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

/** DELETE ?penilaianId=xxx */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const pid = req.nextUrl.searchParams.get('penilaianId') || ''
    const sebelum = await db.penilaian.findUnique({ where: { id: pid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Penilaian tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR') && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) return fail('Akses ditolak.', 403)
    await db.penilaian.delete({ where: { id: pid } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'penilaian', entitasId: pid, deskripsi: `Menghapus penilaian "${sebelum.aspek}"`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
