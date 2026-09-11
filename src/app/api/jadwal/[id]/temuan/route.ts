import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick, dateOrNull } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** POST: catat temuan baru dari kegiatan pembimbingan */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Jadwal tidak ditemukan.', 404)
    if (!(user.role === 'PERSEPTOR' && jadwal.perseptorId === user.perseptorId) && !['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) {
      return fail('Hanya perseptor yang mencatat temuan.', 403)
    }
    const body = await req.json()
    const uraian = str(body.uraian, 3000)
    if (!uraian) return fail('Uraian temuan wajib diisi.', 422)
    const tingkatRisiko = pick(body.tingkatRisiko, ['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'], 'SEDANG')
    const row = await db.temuan.create({
      data: {
        jadwalId: id,
        kategori: str(body.kategori, 100) || 'Lainnya',
        uraian, tingkatRisiko,
        bukti: str(body.bukti, 2000) || null,
        rekomendasiTeks: str(body.rekomendasiTeks, 2000) || null,
        penanggungJawab: str(body.penanggungJawab, 200) || null,
        batasWaktu: dateOrNull(body.batasWaktu),
        status: 'TERBUKA',
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'temuan', entitasId: row.id, deskripsi: `Mencatat temuan ${row.kategori} (risiko ${tingkatRisiko}) pada ${jadwal.topik}`, dataSesudah: row })
    // Notifikasi dinas & puskesmas bila risiko tinggi
    if (['TINGGI', 'KRITIS'].includes(tingkatRisiko)) {
      const { notifyUsers } = await import('@/lib/api')
      const adminPkm = await db.user.findMany({ where: { role: 'ADMIN_PUSKESMAS', puskesmasId: jadwal.puskesmasId } })
      await notifyUsers({
        userIds: adminPkm.map((u) => u.id),
        judul: `Temuan risiko ${tingkatRisiko === 'KRITIS' ? 'KRITIS' : 'TINGGI'}`,
        pesan: `${jadwal.puskesmas.nama}: ${uraian.slice(0, 120)}`, tipe: 'PERINGATAN', refType: 'jadwal', refId: id,
      })
      await notifyUsers({
        roles: ['SUPERADMIN', 'ADMIN_DINAS'],
        judul: `Temuan risiko ${tingkatRisiko} di ${jadwal.puskesmas.nama}`,
        pesan: `${uraian.slice(0, 120)}`, tipe: 'PERINGATAN', refType: 'jadwal', refId: id,
      })
    }
    return ok({ data: row }, 201)
  })
}

/** PATCH: ubah temuan by body.id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const body = await req.json()
    const tid = str(body.id, 50)
    const sebelum = await db.temuan.findUnique({ where: { id: tid } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Temuan tidak ditemukan.', 404)
    const row = await db.temuan.update({
      where: { id: tid },
      data: {
        kategori: body.kategori !== undefined ? (str(body.kategori, 100) || sebelum.kategori) : sebelum.kategori,
        uraian: str(body.uraian, 3000) || sebelum.uraian,
        tingkatRisiko: body.tingkatRisiko !== undefined ? pick(body.tingkatRisiko, ['RENDAH', 'SEDANG', 'TINGGI', 'KRITIS'], sebelum.tingkatRisiko) : sebelum.tingkatRisiko,
        bukti: body.bukti !== undefined ? (str(body.bukti, 2000) || null) : sebelum.bukti,
        rekomendasiTeks: body.rekomendasiTeks !== undefined ? (str(body.rekomendasiTeks, 2000) || null) : sebelum.rekomendasiTeks,
        penanggungJawab: body.penanggungJawab !== undefined ? (str(body.penanggungJawab, 200) || null) : sebelum.penanggungJawab,
        batasWaktu: body.batasWaktu !== undefined ? dateOrNull(body.batasWaktu) : sebelum.batasWaktu,
        status: body.status !== undefined ? pick(body.status, ['TERBUKA', 'SELESAI', 'DITUTUP'], sebelum.status) : sebelum.status,
      },
    })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'temuan', entitasId: tid, deskripsi: `Mengubah temuan "${row.kategori}"`, dataSebelum: sebelum, dataSesudah: row })
    return ok({ data: row })
  })
}

/** DELETE ?temuanId=xxx */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const tid = req.nextUrl.searchParams.get('temuanId') || ''
    const sebelum = await db.temuan.findUnique({ where: { id: tid }, include: { _count: { select: { rtl: true } } } })
    if (!sebelum || sebelum.jadwalId !== id) return fail('Temuan tidak ditemukan.', 404)
    if (!['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role) && user.role !== 'PERSEPTOR') return fail('Akses ditolak.', 403)
    if (sebelum._count.rtl > 0) return fail('Temuan memiliki rencana tindak lanjut (RTL) terkait. Hapus RTL terlebih dahulu.', 409)
    await db.temuan.delete({ where: { id: tid } })
    await auditLog({ user, aksi: 'DELETE', entitas: 'temuan', entitasId: tid, deskripsi: `Menghapus temuan "${sebelum.kategori}"`, dataSebelum: sebelum })
    return ok({ success: true })
  })
}
