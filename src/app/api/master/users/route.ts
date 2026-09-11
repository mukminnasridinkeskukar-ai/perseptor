import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, hashPassword } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

/** Manajemen pengguna sistem — hanya dinas */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const rows = await db.user.findMany({
      select: { id: true, email: true, nama: true, role: true, aktif: true, createdAt: true, puskesmasId: true, perseptorId: true, tenagaKesehatanId: true, puskesmas: { select: { nama: true } }, perseptor: { select: { nama: true } }, tenagaKesehatan: { select: { nama: true } } },
      orderBy: [{ role: 'asc' }, { nama: 'asc' }],
    })
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const body = await req.json()
    const email = str(body.email, 200).toLowerCase()
    const nama = str(body.nama, 200)
    const password = str(body.password, 200)
    const role = pick(body.role, ['SUPERADMIN', 'ADMIN_DINAS', 'PERSEPTOR', 'ADMIN_PUSKESMAS', 'PESERTA'], '')
    if (!email || !nama || !password || !role) return fail('Nama, email, password, dan role wajib diisi.', 422)
    if (password.length < 6) return fail('Password minimal 6 karakter.', 422)
    const ada = await db.user.findUnique({ where: { email } })
    if (ada) return fail('Email sudah terdaftar.', 409)
    if (role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') return fail('Hanya Superadmin dapat membuat akun Superadmin.', 403)
    const row = await db.user.create({
      data: {
        email, nama, role, passwordHash: hashPassword(password),
        puskesmasId: str(body.puskesmasId, 50) || null,
        perseptorId: str(body.perseptorId, 50) || null,
        tenagaKesehatanId: str(body.tenagaKesehatanId, 50) || null,
        aktif: true,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'user', entitasId: row.id, deskripsi: `Menambah pengguna ${nama} (${role})`, dataSesudah: { email, nama, role } })
    return ok({ data: { ...row, passwordHash: undefined } }, 201)
  })
}
