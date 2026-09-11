import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull } from '@/lib/api'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const q = sp.get('q') || ''
    const where: any = {}
    if (q) where.OR = [{ nama: { contains: q } }, { nipNik: { contains: q } }, { profesi: { contains: q } }]
    if (sp.get('profesi')) where.profesi = sp.get('profesi')
    if (sp.get('puskesmasId')) where.puskesmasId = sp.get('puskesmasId')
    // Scoping: admin puskesmas & peserta hanya lihat Puskesmasnya
    if (!['SUPERADMIN', 'ADMIN_DINAS', 'PERSEPTOR'].includes(user.role) && user.puskesmasId) {
      where.puskesmasId = user.puskesmasId
    }
    const rows = await db.tenagaKesehatan.findMany({
      where,
      include: { puskesmas: { select: { id: true, nama: true } }, _count: { select: { peserta: true } } },
      orderBy: { nama: 'asc' },
    })
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS', 'ADMIN_PUSKESMAS'])
    const body = await req.json()
    const nama = str(body.nama, 200)
    if (!nama) return fail('Nama tenaga kesehatan wajib diisi.', 422)
    const puskesmasId = str(body.puskesmasId, 50) || user.puskesmasId
    if (!puskesmasId) return fail('Puskesmas wajib dipilih.', 422)
    const row = await db.tenagaKesehatan.create({
      data: {
        nama,
        nipNik: str(body.nipNik, 60) || null,
        profesi: str(body.profesi, 60) || 'Perawat',
        jabatan: str(body.jabatan, 150) || null,
        unitKerja: str(body.unitKerja, 150) || null,
        puskesmasId,
        kompetensi: str(body.kompetensi, 500) || null,
        masaKerja: intOrNull(body.masaKerja),
        status: str(body.status, 20) || 'AKTIF',
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'tenaga_kesehatan', entitasId: row.id, deskripsi: `Menambah tenaga kesehatan ${nama}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
