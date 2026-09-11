'use client'

/** Client API helper — fetch JSON dengan pesan error Indonesia */
export class ApiError extends Error {
  status: number
  data: any
  constructor(message: string, status: number, data?: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function request<T>(method: string, path: string, body?: any, isForm = false): Promise<T> {
  const opts: RequestInit = { method, credentials: 'same-origin' }
  if (body !== undefined) {
    if (isForm) {
      opts.body = body
    } else {
      opts.headers = { 'Content-Type': 'application/json' }
      opts.body = JSON.stringify(body)
    }
  }
  const res = await fetch(path, opts)
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Terjadi kesalahan (${res.status})`, res.status, data)
  }
  return data as T
}

export const apiGet = <T = any>(path: string) => request<T>('GET', path)
export const apiPost = <T = any>(path: string, body?: any) => request<T>('POST', path, body)
export const apiPut = <T = any>(path: string, body?: any) => request<T>('PUT', path, body)
export const apiPatch = <T = any>(path: string, body?: any) => request<T>('PATCH', path, body)
export const apiDelete = <T = any>(path: string) => request<T>('DELETE', path)
export const apiUpload = <T = any>(path: string, form: FormData) => request<T>('POST', path, form, true)
