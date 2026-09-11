import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, auditLog, str } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** GET: data lengkap untuk preview berita acara */
export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({
      where: { id },
      include: {
        program: { select: { nama: true } },
        puskesmas: true, perseptor: true,
        peserta: { include: { tenagaKesehatan: { select: { nama: true, profesi: true } } } },
        penilaian: { where: { skor: { not: null } } },
        kasus: true,
        temuan: true,
        rekomendasi: true,
        beritaAcara: true,
      },
    })
    if (!jadwal) return fail('Kegiatan tidak ditemukan.', 404)
    const pengaturan = await db.pengaturan.findMany({ where: { kunci: { in: ['nama_dinas', 'nama_aplikasi', 'tagline'] } } })
    const set: Record<string, string> = {}
    for (const p of pengaturan) set[p.kunci] = p.nilai || ''
    return ok({ data: jadwal, pengaturan: set })
  })
}

/** POST: simpan/generate berita acara */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireAuth(req)
    const { id } = await ctx.params
    const jadwal = await db.jadwal.findUnique({ where: { id } })
    if (!jadwal) return fail('Kegiatan tidak ditemukan.', 404)
    const body = await req.json().catch(() => ({}))
    const jumlah = await db.beritaAcara.count()
    const nomor = str(body.nomor, 100) || `BA/PERSEPTOR/${jadwal.tanggal.getFullYear()}/${String(jumlah + 1).padStart(3, '0')}`
    const konten = JSON.stringify(body.konten || {})
    const row = await db.beritaAcara.upsert({
      where: { jadwalId: id },
      create: { jadwalId: id, nomor, konten, dibuatOleh: user.nama },
      update: { nomor, konten, dibuatOleh: user.nama },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'berita_acara', entitasId: row.id, deskripsi: `Membuat berita acara ${nomor} untuk ${jadwal.topik}` })
    return ok({ data: row }, 201)
  })
}
