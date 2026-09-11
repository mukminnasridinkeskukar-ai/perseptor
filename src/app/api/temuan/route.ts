import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

/** GET /api/temuan — daftar temuan global dengan scoping role */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('kategori')) where.kategori = sp.get('kategori')
    if (sp.get('tingkatRisiko')) where.tingkatRisiko = sp.get('tingkatRisiko')
    if (sp.get('status')) where.status = sp.get('status')
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) {
      where.jadwal = { puskesmasId: user.puskesmasId }
    } else if (user.role === 'PERSEPTOR' && user.perseptorId) {
      where.jadwal = { perseptorId: user.perseptorId }
    } else if (sp.get('puskesmasId')) {
      where.jadwal = { puskesmasId: sp.get('puskesmasId') }
    }
    const q = sp.get('q')
    if (q) where.uraian = { contains: q }
    const rows = await db.temuan.findMany({
      where,
      include: {
        jadwal: { select: { id: true, topik: true, tanggal: true, puskesmas: { select: { id: true, nama: true } }, perseptor: { select: { nama: true } } } },
        rtl: { select: { id: true, status: true, kegiatan: true, verifikasiStatus: true } },
        rekomendasi: { select: { id: true, rekomendasi: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    })
    return ok({ data: rows })
  })
}
