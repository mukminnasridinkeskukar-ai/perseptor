import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, SESSION_COOKIE } from '@/lib/auth'
import { handle, fail, ok, auditLog, str } from '@/lib/api'

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}))
    const email = str(body.email, 200).toLowerCase()
    const password = str(body.password, 200)
    if (!email || !password) return fail('Email dan password wajib diisi.', 422)

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.aktif) return fail('Email atau password salah.', 401)
    if (!verifyPassword(password, user.passwordHash)) return fail('Email atau password salah.', 401)

    const { token, expiresAt } = await createSession(user.id, req.headers.get('user-agent') || undefined)
    await auditLog({ user: { id: user.id, nama: user.nama } as any, aksi: 'LOGIN', entitas: 'auth', deskripsi: `${user.nama} (${user.role}) masuk ke sistem` })

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, nama: user.nama, role: user.role, puskesmasId: user.puskesmasId, perseptorId: user.perseptorId, tenagaKesehatanId: user.tenagaKesehatanId },
    })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', secure: false, path: '/', expires: expiresAt,
    })
    return res
  })
}
