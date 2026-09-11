import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str, intOrNull } from '@/lib/api'

/** GET /api/evaluasi?tenagaKesehatanId= — profil perkembangan kompetensi */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const tkId = sp.get('tenagaKesehatanId') || user.tenagaKesehatanId
    if (!tkId) return ok({ data: [] })
    const rows = await db.evaluasiKompetensi.findMany({
      where: { tenagaKesehatanId: tkId },
      include: { kompetensi: true },
      orderBy: { createdAt: 'asc' },
    })
    // Grup per kompetensi: deret skor awal -> evaluasi
    const grouped: Record<string, { kompetensi: string; kelompok: string; deret: Array<{ skor: number; sumber: string; periode: string | null; tanggal: string }> }> = {}
    for (const r of rows) {
      const key = r.kompetensiId
      grouped[key] = grouped[key] || { kompetensi: r.kompetensi.nama, kelompok: r.kompetensi.kelompok, deret: [] }
      grouped[key].deret.push({ skor: r.skor, sumber: r.sumber, periode: r.periode, tanggal: r.createdAt.toISOString() })
    }
    const data = Object.values(grouped).map((g) => ({ ...g, deret: g.deret.sort((a, b) => a.tanggal.localeCompare(b.tanggal)) }))
    return ok({ data })
  })
}

/** POST: catat skor evaluasi kompetensi (perseptor setelah pembimbingan) */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (!['PERSEPTOR', 'SUPERADMIN', 'ADMIN_DINAS'].includes(user.role)) return fail('Hanya perseptor yang mencatat evaluasi kompetensi.', 403)
    const body = await req.json()
    const tenagaKesehatanId = str(body.tenagaKesehatanId, 50)
    const kompetensiId = str(body.kompetensiId, 50)
    const skor = intOrNull(body.skor)
    if (!tenagaKesehatanId || !kompetensiId || !skor) return fail('Tenaga kesehatan, kompetensi, dan skor wajib diisi.', 422)
    if (skor < 1 || skor > 5) return fail('Skor harus 1-5.', 422)
    const row = await db.evaluasiKompetensi.create({
      data: {
        tenagaKesehatanId, kompetensiId, skor,
        sumber: str(body.sumber, 20) || 'EVALUASI',
        jadwalId: str(body.jadwalId, 50) || null,
        periode: str(body.periode, 20) || null,
        catatan: str(body.catatan, 1000) || null,
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'evaluasi_kompetensi', entitasId: row.id, deskripsi: `Mencatat evaluasi kompetensi (skor ${skor}/5)`, dataSesudah: { tenagaKesehatanId, kompetensiId, skor } })
    return ok({ data: row }, 201)
  })
}
