import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { destroySession, SESSION_COOKIE } from '@/lib/auth'
import { handle, ok, auditLog } from '@/lib/api'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (token) {
      const session = await db.session.findUnique({ where: { token }, include: { user: true } })
      if (session) {
        await auditLog({ user: { id: session.user.id, nama: session.user.nama } as any, aksi: 'LOGOUT', entitas: 'auth', deskripsi: `${session.user.nama} keluar dari sistem` })
      }
      await destroySession(token)
    }
    const res = ok({ success: true })
    res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
    return res
  })
}
