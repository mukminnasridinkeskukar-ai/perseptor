import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull, pick } from '@/lib/api'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('tahun')) where.tahun = parseInt(sp.get('tahun')!)
    if (sp.get('status')) where.status = sp.get('status')
    if (sp.get('periode')) where.periode = sp.get('periode')
    if (sp.get('perseptorId')) where.perseptorId = sp.get('perseptorId')
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    if (user.role === 'PERSEPTOR' && user.perseptorId) {
      where.OR = [{ perseptorId: user.perseptorId }, { perseptorId: null }]
    }
    const q = sp.get('q')
    if (q) where.OR = [{ nama: { contains: q } }, { topik: { contains: q } }, { bidang: { contains: q } }]
    const rows = await db.program.findMany({
      where,
      include: {
        puskesmas: { select: { nama: true } },
        perseptor: { select: { nama: true, profesi: true } },
        _count: { select: { jadwal: true } },
      },
      orderBy: [{ tahun: 'desc' }, { createdAt: 'desc' }],
    })
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const body = await req.json()
    const nama = str(body.nama, 300)
    if (!nama) return fail('Nama kegiatan wajib diisi.', 422)
    const row = await db.program.create({
      data: {
        nama,
        tahun: intOrNull(body.tahun) ?? new Date().getFullYear(),
        periode: pick(body.periode, ['TAHUNAN', 'SEMESTER', 'BULANAN', 'KHUSUS', 'KASUS', 'KEBUTUHAN'], 'TAHUNAN'),
        jenis: pick(body.jenis, ['REGULER', 'KHUSUS', 'KASUS', 'KEBUTUHAN'], 'REGULER'),
        puskesmasId: str(body.puskesmasId, 50) || null,
        bidang: str(body.bidang, 200) || null,
        topik: str(body.topik, 500) || null,
        tujuan: str(body.tujuan, 2000) || null,
        perseptorId: str(body.perseptorId, 50) || null,
        sasaran: str(body.sasaran, 1000) || null,
        prioritas: pick(body.prioritas, ['RENDAH', 'SEDANG', 'TINGGI', 'SANGAT_TINGGI'], 'SEDANG'),
        target: str(body.target, 500) || null,
        status: pick(body.status, ['DRAFT', 'AKTIF', 'SELESAI', 'DIBATALKAN'], 'DRAFT'),
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'program', entitasId: row.id, deskripsi: `Membuat program pembimbingan: ${nama}`, dataSesudah: row })
    if (row.perseptorId) {
      const pUser = await db.user.findFirst({ where: { perseptorId: row.perseptorId } })
      if (pUser) {
        const { notifyUsers } = await import('@/lib/api')
        await notifyUsers({ userIds: [pUser.id], judul: 'Anda ditetapkan pada program pembimbingan', pesan: `Program "${nama}" menetapkan Anda sebagai perseptor.`, tipe: 'INFO' })
      }
    }
    return ok({ data: row }, 201)
  })
}

/** POST duplicate via query ?action=duplicate&id=xxx diganti route terpisah [id]/duplicate */
