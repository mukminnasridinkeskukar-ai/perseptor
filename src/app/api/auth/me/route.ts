import { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getSessionUser(req)
    if (!user) return ok({ user: null })
    const unread = await db.notification.count({ where: { userId: user.id, dibaca: false } })
    return ok({ user, unread })
  })
}
