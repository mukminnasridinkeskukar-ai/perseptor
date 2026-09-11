import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireRole, isDinas } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull } from '@/lib/api'

export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const q = sp.get('q') || ''
    const where: any = {}
    if (q) where.OR = [{ nama: { contains: q } }, { nip: { contains: q } }, { profesi: { contains: q } }]
    if (sp.get('profesi')) where.profesi = sp.get('profesi')
    const rows = await db.perseptor.findMany({
      where,
      include: {
        penugasan: { include: { puskesmas: { select: { id: true, nama: true, kecamatan: true } } } },
        _count: { select: { jadwal: true } },
      },
      orderBy: { nama: 'asc' },
    })
    // Non-dinas hanya melihat perseptor binaan terkait (data tetap tersedia penuh untuk dinas)
    return ok({ data: rows })
  })
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const body = await req.json()
    const nama = str(body.nama, 200)
    if (!nama) return fail('Nama perseptor wajib diisi.', 422)
    const row = await db.perseptor.create({
      data: {
        nama,
        nip: str(body.nip, 60) || null,
        profesi: str(body.profesi, 60) || 'Dokter',
        jabatan: str(body.jabatan, 150) || null,
        unitKerja: str(body.unitKerja, 150) || null,
        kompetensi: Array.isArray(body.kompetensi) ? body.kompetensi.join(', ') : str(body.kompetensi, 500) || null,
        nomorSTR: str(body.nomorSTR, 60) || null,
        nomorSIP: str(body.nomorSIP, 60) || null,
        sertifikat: str(body.sertifikat, 500) || null,
        areaKeahlian: str(body.areaKeahlian, 300) || null,
        statusAktif: body.statusAktif !== false,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'perseptor', entitasId: row.id, deskripsi: `Menambah perseptor ${nama}`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
