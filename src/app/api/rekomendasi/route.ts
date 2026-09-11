import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick, dateOrNull } from '@/lib/api'

/** GET: daftar rekomendasi global */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('jadwalId')) where.jadwalId = sp.get('jadwalId')
    if (user.role === 'ADMIN_PUSKESMAS' && user.puskesmasId) where.jadwal = { puskesmasId: user.puskesmasId }
    if (user.role === 'PERSEPTOR' && user.perseptorId) where.jadwal = { perseptorId: user.perseptorId }
    const rows = await db.rekomendasi.findMany({
      where,
      include: { jadwal: { select: { topik: true, tanggal: true, puskesmas: { select: { nama: true } } } }, temuan: { select: { kategori: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ data: rows })
  })
}
