import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { handle, ok, fail, auditLog } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** Duplikasi program pembimbingan */
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(async () => {
    const user = await requireRole(req, ['SUPERADMIN', 'ADMIN_DINAS'])
    const { id } = await ctx.params
    const sumber = await db.program.findUnique({ where: { id } })
    if (!sumber) return fail('Program tidak ditemukan.', 404)
    const row = await db.program.create({
      data: {
        nama: `[SALIN] ${sumber.nama}`,
        tahun: sumber.tahun, periode: sumber.periode, jenis: sumber.jenis,
        puskesmasId: sumber.puskesmasId, bidang: sumber.bidang, topik: sumber.topik,
        tujuan: sumber.tujuan, perseptorId: sumber.perseptorId, sasaran: sumber.sasaran,
        prioritas: sumber.prioritas, target: sumber.target, status: 'DRAFT',
      },
    })
    await auditLog({ user, aksi: 'CREATE', entitas: 'program', entitasId: row.id, deskripsi: `Menduplikasi program "${sumber.nama}"`, dataSesudah: row })
    return ok({ data: row }, 201)
  })
}
