import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

/** POST: pengguna mengubah password sendiri */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const body = await req.json()
    const passwordLama = str(body.passwordLama, 200)
    const passwordBaru = str(body.passwordBaru, 200)
    if (!passwordLama || !passwordBaru) return fail('Password lama dan baru wajib diisi.', 422)
    if (passwordBaru.length < 6) return fail('Password baru minimal 6 karakter.', 422)
    const u = await db.user.findUnique({ where: { id: user.id } })
    if (!u) return fail('Pengguna tidak ditemukan.', 404)
    if (!verifyPassword(passwordLama, u.passwordHash)) return fail('Password lama tidak sesuai.', 401)
    await db.user.update({ where: { id: u.id }, data: { passwordHash: hashPassword(passwordBaru) } })
    await auditLog({ user, aksi: 'UPDATE', entitas: 'user', entitasId: u.id, deskripsi: 'Mengubah password akun sendiri' })
    return ok({ success: true })
  })
}
