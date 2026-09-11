/**
 * AUTH: session cookie, password hashing, guard helpers
 */
import { db } from '@/lib/db'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'perseptor_session'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

export async function createSession(userId: string, userAgent?: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000) // 7 hari
  await db.session.create({ data: { token, userId, userAgent: userAgent || null, expiresAt } })
  return { token, expiresAt }
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { token } })
}

export interface SessionUser {
  id: string
  email: string
  nama: string
  role: string
  puskesmasId: string | null
  perseptorId: string | null
  tenagaKesehatanId: string | null
  puskesmasNama?: string | null
  perseptorNama?: string | null
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          puskesmas: { select: { nama: true } },
          perseptor: { select: { nama: true } },
        },
      },
    },
  })
  if (!session || session.expiresAt < new Date()) return null
  const u = session.user
  if (!u.aktif) return null
  return {
    id: u.id,
    email: u.email,
    nama: u.nama,
    role: u.role,
    puskesmasId: u.puskesmasId,
    perseptorId: u.perseptorId,
    tenagaKesehatanId: u.tenagaKesehatanId,
    puskesmasNama: u.puskesmas?.nama || null,
    perseptorNama: u.perseptor?.nama || null,
  }
}

/** Guard: harus login. Return user atau throw Response 401 */
export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(req)
  if (!user) throw new Response(JSON.stringify({ error: 'Tidak terautentikasi. Silakan login.' }), { status: 401 })
  return user
}

/** Guard: harus punya salah satu role. */
export async function requireRole(req: NextRequest, roles: string[]): Promise<SessionUser> {
  const user = await requireAuth(req)
  if (!roles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'Akses ditolak untuk peran Anda.' }), { status: 403 })
  }
  return user
}

export function isDinas(role: string) {
  return role === 'SUPERADMIN' || role === 'ADMIN_DINAS'
}
