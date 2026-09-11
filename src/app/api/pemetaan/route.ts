import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull, pick } from '@/lib/api'

/** Pemetaan kebutuhan pembimbingan */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('tahun')) where.tahun = parseInt(sp.get('tahun')!)
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (sp.get('prioritas')) where.prioritas = sp.get('prioritas')
    if (sp.get('status')) where.status = sp.get('status')
    if (!isDinas(user.role) && user.puskesmasId) where.puskesmasId = user.puskesmasId
    const q = sp.get('q')
    if (q) where.OR = [{ masalah: { contains: q } }, { kebutuhan: { contains: q } }]
    const rows = await db.pemetaan.findMany({
      where,
      include: { puskesmas: { select: { id: true, nama: true, kecamatan: true } }, kompetensi: { select: { id: true, nama: true, kelompok: true } } },
      orderBy: [{ prioritas: 'desc' }, { createdAt: 'desc' }],
    })
    // Urutkan manual: SANGAT_TINGGI > TINGGI > SEDANG > RENDAH
    const urutan: Record<string, number> = { SANGAT_TINGGI: 0, TINGGI: 1, SEDANG: 2, RENDAH: 3 }
    rows.sort((a, b) => (urutan[a.prioritas] ?? 9) - (urutan[b.prioritas] ?? 9))
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'])
    const body = await req.json()
    const puskesmasId = str(body.puskesmasId, 50) || user.puskesmasId
    if (!puskesmasId) return fail('Puskesmas wajib dipilih.', 422)
    const skor = intOrNull(body.skor) ?? 1
    if (skor < 1 || skor > 8) return fail('Skor harus 1-8.', 422)
    const prioritas = skor >= 7 ? 'SANGAT_TINGGI' : skor >= 5 ? 'TINGGI' : skor >= 3 ? 'SEDANG' : 'RENDAH'
    const row = await db.pemetaan.create({
      data: {
        puskesmasId, tahun: intOrNull(body.tahun) ?? new Date().getFullYear(),
        kompetensiId: str(body.kompetensiId, 50) || null,
        kompetensiTeks: str(body.kompetensiTeks, 200) || null,
        masalah: str(body.masalah, 2000) || null,
        kasusSering: str(body.kasusSering, 1000) || null,
        risiko: str(body.risiko, 1000) || null,
        kebutuhan: str(body.kebutuhan, 2000) || null,
        skor, prioritas,
        status: pick(body.status, ['DIPROSES', 'MASUK_PERENCANAAN', 'SELESAI'], 'DIPROSES'),
        catatan: str(body.catatan, 1000) || null,
        createdBy: user.nama,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'pemetaan', entitasId: row.id, deskripsi: `Menambah pemetaan kebutuhan (prioritas ${prioritas})`, dataSesudah: row })
    // Notifikasi dinas: pemetaan baru masuk
    if (user.role === 'ADMIN_PUSKESMAS') {
      const { notifyUsers } = await import('@/lib/api')
      await notifyUsers({ roles: ['SUPERADMIN', 'ADMIN_DINAS'], judul: 'Pemetaan kebutuhan baru', pesan: `${user.nama} menginput pemetaan kebutuhan pembimbingan (prioritas ${prioritas}).`, tipe: 'INFO' })
    }
    return ok({ data: row }, 201)
  })
}
