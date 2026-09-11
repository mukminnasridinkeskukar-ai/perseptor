import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handle, ok, fail, str } from '@/lib/api'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'pptx', 'txt']

/** GET: daftar dokumentasi (scoping role) */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    const sp = req.nextUrl.searchParams
    const where: any = {}
    if (sp.get('jadwalId')) where.jadwalId = sp.get('jadwalId')
    if (sp.get('jenis')) where.jenis = sp.get('jenis')
    if ((user.role === 'ADMIN_PUSKESMAS' || user.role === 'PESERTA') && user.puskesmasId) where.puskesmasId = user.puskesmasId
    if (user.role === 'PERSEPTOR' && user.perseptorId) where.OR = [{ puskesmasId: null }, { jadwal: { perseptorId: user.perseptorId } }]
    const rows = await db.dokumentasi.findMany({
      where,
      include: { jadwal: { select: { id: true, topik: true, tanggal: true } }, puskesmas: { select: { nama: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ data: rows })
  })
}

/** POST: unggah file (multipart/form-data) atau metadata tanpa file */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (user.role === 'PESERTA') return fail('Akses ditolak.', 403)
    const ct = req.headers.get('content-type') || ''

    let jadwalId: string | null = null
    let rtlId: string | null = null
    let puskesmasId: string | null = user.puskesmasId || null
    let jenis = 'DOKUMEN'
    let nama = ''
    let deskripsi: string | null = null
    let fileName: string | null = null
    let fileUrl: string | null = null
    let fileType: string | null = null
    let fileSize: number | null = null

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      jadwalId = (form.get('jadwalId') as string) || null
      rtlId = (form.get('rtlId') as string) || null
      puskesmasId = (form.get('puskesmasId') as string) || puskesmasId
      jenis = (form.get('jenis') as string) || 'DOKUMEN'
      nama = ((form.get('nama') as string) || '').trim()
      deskripsi = (form.get('deskripsi') as string) || null
      const file = form.get('file') as File | null
      if (file && file.size > 0) {
        if (file.size > MAX_SIZE) return fail('Ukuran file maksimal 10 MB.', 422)
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        if (!ALLOWED_EXT.includes(ext)) return fail(`Tipe file .${ext} tidak diizinkan.`, 422)
        await mkdir(UPLOAD_DIR, { recursive: true })
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const bytes = Buffer.from(await file.arrayBuffer())
        await writeFile(path.join(UPLOAD_DIR, safeName), bytes)
        fileName = file.name
        fileUrl = `/api/files/${safeName}`
        fileType = file.type || ext
        fileSize = file.size
      }
    } else {
      const body = await req.json()
      jadwalId = body.jadwalId || null
      rtlId = body.rtlId || null
      puskesmasId = body.puskesmasId || puskesmasId
      jenis = body.jenis || 'DOKUMEN'
      nama = (body.nama || '').trim()
      deskripsi = body.deskripsi || null
      fileName = body.fileName || null
    }
    if (!nama) return fail('Nama dokumentasi wajib diisi.', 422)

    if (jadwalId) {
      const j = await db.jadwal.findUnique({ where: { id: jadwalId } })
      if (j) puskesmasId = j.puskesmasId
    }
    const row = await db.dokumentasi.create({
      data: { jadwalId, rtlId, puskesmasId, jenis, nama, deskripsi, fileName, fileUrl, fileType, fileSize, uploadedBy: user.nama },
    })
    const { auditLog } = await import('@/lib/api')
    await auditLog({ user, aksi: 'CREATE', entitas: 'dokumentasi', entitasId: row.id, deskripsi: `Mengunggah dokumentasi "${nama}"` })
    return ok({ data: row }, 201)
  })
}

/** DELETE ?id=xxx */
export async function DELETE(req: NextRequest) {
  return handle(async () => {
    const user = await requireAuth(req)
    if (user.role === 'PESERTA') return fail('Akses ditolak.', 403)
    const id = req.nextUrl.searchParams.get('id') || ''
    const sebelum = await db.dokumentasi.findUnique({ where: { id } })
    if (!sebelum) return fail('Dokumentasi tidak ditemukan.', 404)
    await db.dokumentasi.delete({ where: { id } })
    const { auditLog } = await import('@/lib/api')
    await auditLog({ user, aksi: 'DELETE', entitas: 'dokumentasi', entitasId: id, deskripsi: `Menghapus dokumentasi "${sebelum.nama}"` })
    return ok({ success: true })
  })
}
