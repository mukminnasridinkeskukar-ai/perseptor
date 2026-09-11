import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const q = sp.get('q') || ''
    const where: any = {}
    if (q) where.OR = [{ nama: { contains: q } }, { kelompok: { contains: q } }]
    if (sp.get('kelompok')) where.kelompok = sp.get('kelompok')
    const rows = await db.kompetensi.findMany({ where, orderBy: [{ kelompok: 'asc' }, { nama: 'asc' }] })
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const body = await req.json()
    const nama = str(body.nama, 200)
    if (!nama) return fail('Nama kompetensi wajib diisi.', 422)
    const row = await db.kompetensi.create({
      data: { nama, kelompok: str(body.kelompok, 100) || 'Klinis', deskripsi: str(body.deskripsi, 500) || null, aktif: body.aktif !== false },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'kompetensi', entitasId: row.id, deskripsi: `Menambah kompetensi ${nama}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
