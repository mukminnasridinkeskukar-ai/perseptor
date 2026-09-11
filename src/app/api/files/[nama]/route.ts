import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { getSessionUser } from '@/lib/auth'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv', txt: 'text/plain', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** Serve file yang diunggah (dengan proteksi login) */
export async function GET(req: NextRequest, ctx: { params: Promise<{ nama: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  const { nama } = await ctx.params
  // Sanitasi nama file: tanpa path traversal
  if (nama.includes('..') || nama.includes('/') || nama.includes('\\')) {
    return NextResponse.json({ error: 'Nama file tidak valid' }, { status: 400 })
  }
  try {
    const buf = await readFile(path.join(UPLOAD_DIR, nama))
    const ext = nama.split('.').pop()?.toLowerCase() || ''
    return new NextResponse(new Uint8Array(buf), {
      headers: { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Disposition': `inline; filename="${nama}"` },
    })
  } catch {
    return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 404 })
  }
}
