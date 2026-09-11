import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** POST verifikasi RTL oleh perseptor: DISETUJUI / PERLU_PERBAIKAN / VERIFIKASI_ULANG */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const rtl = await db.rTL.findUnique({
      where: { id },
      include: { temuan: { include: { jadwal: { include: { puskesmas: true } } } } },
    })
    if (!rtl) return fail('RTL tidak ditemukan.', 404)
    const bolehVerif =
      ['SUPERADMIN', 'ADMIN_DINAS'].includes(user.role) ||
      (user.role === 'PERSEPTOR' && rtl.temuan && rtl.temuan.jadwal.perseptorId === user.perseptorId)
    if (!bolehVerif) return fail('Hanya perseptor pembimbing yang dapat memverifikasi RTL ini.', 403)
    const body = await req.json()
    const aksi = pick(body.aksi, ['DISETUJUI', 'PERLU_PERBAIKAN', 'VERIFIKASI_ULANG'], 'PERLU_PERBAIKAN')
    const catatan = str(body.catatan, 2000) || null

    const row = await db.rTL.update({
      where: { id },
      data: {
        verifikasiStatus: aksi === 'DISETUJUI' ? 'DISETUJUI' : 'PERLU_PERBAIKAN',
        verifikasiCatatan: catatan,
        verifikasiOleh: user.nama,
        verifikasiPada: new Date(),
        status: aksi === 'DISETUJUI' ? 'TERVERIFIKASI' : rtl.status,
      },
    })
    await db.verifikasiRTL.create({ data: { rtlId: id, aksi, catatan, oleh: user.nama } })
    await auditLog({ user, aksi: 'VERIFIKASI', entitas: 'rencana_tindak_lanjut', entitasId: id, deskripsi: `Verifikasi RTL "${rtl.kegiatan.slice(0, 80)}": ${aksi}`, dataSebelum: { status: rtl.status, verifikasiStatus: rtl.verifikasiStatus }, dataSesudah: { status: row.status, verifikasiStatus: row.verifikasiStatus, aksi } })
    const { notifyUsers } = await import('@/lib/api')
    const adminPkm = await db.user.findMany({ where: { role: 'ADMIN_PUSKESMAS', puskesmasId: rtl.puskesmasId } })
    await notifyUsers({
      userIds: adminPkm.map((u) => u.id),
      judul: aksi === 'DISETUJUI' ? 'RTL terverifikasi' : 'RTL perlu perbaikan',
      pesan: aksi === 'DISETUJUI' ? `"${rtl.kegiatan.slice(0, 80)}" telah diverifikasi dan disetujui oleh ${user.nama}.` : `${user.nama} meminta perbaikan pada "${rtl.kegiatan.slice(0, 80)}". ${catatan || ''}`,
      tipe: aksi === 'DISETUJUI' ? 'VERIFIKASI' : 'PERINGATAN', refType: 'rtl', refId: id,
    })
    if (aksi !== 'DISETUJUI') {
      await notifyUsers({ roles: ['SUPERADMIN', 'ADMIN_DINAS'], judul: 'Verifikasi ulang RTL', pesan: `${user.nama}: PERLU PERBAIKAN pada "${rtl.kegiatan.slice(0, 80)}".`, tipe: 'RTL', refType: 'rtl', refId: id })
    }
    return ok({ data: row })
  })
}

/** GET: histori verifikasi */
export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const rows = await db.verifikasiRTL.findMany({ where: { rtlId: id }, orderBy: { pada: 'desc' } })
    return ok({ data: rows })
  })
}
