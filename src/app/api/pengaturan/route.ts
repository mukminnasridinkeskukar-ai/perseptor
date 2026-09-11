import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, str } from '@/lib/api'

/** GET: pengaturan sistem */
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAuth(req)
    const rows = await db.pengaturan.findMany()
    const data: Record<string, string> = {}
    for (const r of rows) data[r.kunci] = r.nilai || ''
    return ok({ data })
  })
}

/** PUT: ubah pengaturan (superadmin) */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN'])
    const body = await req.json()
    const izinkan = ['nama_dinas', 'tagline', 'tahun_aktif']
    for (const k of izinkan) {
      if (body[k] !== undefined) {
        await db.pengaturan.upsert({ where: { kunci: k }, create: { kunci: k, nilai: str(body[k], 200) }, update: { nilai: str(body[k], 200) } })
      }
    }
    const rows = await db.pengaturan.findMany()
    const data: Record<string, string> = {}
    for (const r of rows) data[r.kunci] = r.nilai || ''
    const { auditLog } = await import('@/lib/api')
    await auditLog({ user, aksi: 'UPDATE', entitas: 'pengaturan', deskripsi: 'Memperbarui konfigurasi sistem' })
    return ok({ data })
  })
}
