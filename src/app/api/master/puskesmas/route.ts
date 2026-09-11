import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, pick } from '@/lib/api'

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const q = sp.get('q') || ''
    const rows = await db.puskesmas.findMany({
      where: {
        OR: q ? [{ nama: { contains: q } }, { kode: { contains: q } }, { kecamatan: { contains: q } }] : undefined,
      },
      include: { _count: { select: { tenagaKesehatan: true, jadwal: true } } },
      orderBy: { nama: 'asc' },
    })
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const body = await req.json()
    const kode = str(body.kode, 50)
    const nama = str(body.nama, 200)
    if (!kode || !nama) return fail('ID Puskesmas dan nama wajib diisi.', 422)
    const ada = await db.puskesmas.findUnique({ where: { kode } })
    if (ada) return fail('ID Puskesmas sudah digunakan.', 409)
    const row = await db.puskesmas.create({
      data: {
        kode, nama,
        kecamatan: str(body.kecamatan, 100),
        alamat: str(body.alamat, 300) || null,
        kepalaPuskesmas: str(body.kepalaPuskesmas, 150) || null,
        telepon: str(body.telepon, 50) || null,
        email: str(body.email, 150) || null,
        status: pick(body.status, ['AKTIF', 'NONAKTIF'], 'AKTIF'),
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'puskesmas', entitasId: row.id, deskripsi: `Menambah Puskesmas ${nama}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
