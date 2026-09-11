import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, str } from '@/lib/api'

/** GET: notifikasi milik user; PATCH: tandai dibaca */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const limit = sp.get('limit') ? parseInt(sp.get('limit')!) : 50
    const rows = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    const unread = await db.notification.count({ where: { userId: user.id, dibaca: false } })
    return ok({ data: rows, unread })
  })
}

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const body = await req.json().catch(() => ({}))
    const id = str(body.id, 50)
    if (id) {
      await db.notification.updateMany({ where: { id, userId: user.id }, data: { dibaca: true } })
    } else if (body.semua) {
      await db.notification.updateMany({ where: { userId: user.id, dibaca: false }, data: { dibaca: true } })
    }
    return ok({ success: true })
  })
}
