/** Helper API: response JSON, error wrapper, audit, notifikasi */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SessionUser } from '@/lib/auth'

export function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function fail(message: string, status = 400, extra?: any) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

/** Wrap handler supaya error (termasuk thrown Response dari guard) tertangani */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (e: any) {
    if (e instanceof Response) return e as NextResponse
    console.error('[API ERROR]', e)
    return fail(e?.message || 'Terjadi kesalahan pada server', 500)
  }
}

export async function auditLog(params: {
  user?: SessionUser | null
  aksi: string
  entitas: string
  entitasId?: string | null
  deskripsi?: string
  dataSebelum?: any
  dataSesudah?: any
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.user?.id || null,
        userName: params.user?.nama || 'Sistem',
        aksi: params.aksi,
        entitas: params.entitas,
        entitasId: params.entitasId || null,
        deskripsi: params.deskripsi || null,
        dataSebelum: params.dataSebelum ? JSON.stringify(params.dataSebelum) : null,
        dataSesudah: params.dataSesudah ? JSON.stringify(params.dataSesudah) : null,
      },
    })
  } catch (e) {
    console.error('[AUDIT ERROR]', e)
  }
}

/** Kirim notifikasi ke banyak user (by userId list) atau semua user dengan role tertentu */
export async function notifyUsers(params: {
  userIds?: string[]
  roles?: string[]
  judul: string
  pesan: string
  tipe?: string
  refType?: string
  refId?: string
}) {
  try {
    let ids = params.userIds || []
    if (params.roles?.length) {
      const users = await db.user.findMany({ where: { role: { in: params.roles }, aktif: true }, select: { id: true } })
      ids = [...new Set([...ids, ...users.map((u) => u.id)])]
    }
    if (!ids.length) return
    await db.notification.createMany({
      data: ids.map((userId) => ({
        userId, judul: params.judul, pesan: params.pesan,
        tipe: params.tipe || 'INFO', refType: params.refType || null, refId: params.refId || null,
      })),
    })
  } catch (e) {
    console.error('[NOTIF ERROR]', e)
  }
}

export function parseBody<T = any>(body: any): T {
  if (!body || typeof body !== 'object') return {} as T
  return body as T
}

/** Konversi string tanggal kosong ke null */
export function dateOrNull(v: any): Date | null {
  if (!v || typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export function intOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseInt(v, 10)
  return isNaN(n) ? null : n
}

export function floatOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

/** Sanitasi string: trim, batasi panjang */
export function str(v: any, max = 2000): string {
  if (v === null || v === undefined) return ''
  return String(v).trim().slice(0, max)
}

/** Pastikan nilai berada dalam daftar yang diizinkan */
export function pick(v: any, allowed: string[], def: string): string {
  return allowed.includes(v) ? v : def
}
