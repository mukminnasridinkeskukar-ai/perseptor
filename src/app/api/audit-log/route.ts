import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

/** GET /api/audit-log — jejak audit (dinas) */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (!isDinas(user.role) && user.role !== 'ADMIN_PUSKESMAS') return ok({ data: [] })
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('aksi')) where.aksi = sp.get('aksi')
    if (sp.get('entitas')) where.entitas = sp.get('entitas')
    const q = sp.get('q')
    if (q) where.OR = [{ deskripsi: { contains: q } }, { userName: { contains: q } }]
    const limit = sp.get('limit') ? parseInt(sp.get('limit')!) : 200
    const rows = await db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit })
    return ok({ data: rows })
  })
}
