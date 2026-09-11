'use client'

import { create } from 'zustand'

export interface SessionUser {
  id: string
  email: string
  nama: string
  role: string
  puskesmasId: string | null
  perseptorId: string | null
  tenagaKesehatanId: string | null
  puskesmasNama?: string | null
  perseptorNama?: string | null
}

export interface AppState {
  user: SessionUser | null
  unread: number
  view: string
  params: Record<string, string>
  loaded: boolean
  setAuth: (user: SessionUser | null, unread?: number) => void
  setUnread: (n: number) => void
  go: (view: string, params?: Record<string, string>) => void
  setLoaded: (v: boolean) => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  unread: 0,
  view: 'dashboard',
  params: {},
  loaded: false,
  setAuth: (user, unread = 0) => set({ user, unread, loaded: true }),
  setUnread: (n) => set({ unread: n }),
  go: (view, params = {}) => set({ view, params }),
  setLoaded: (v) => set({ loaded: v }),
}))

export const isDinas = (role?: string | null) => role === 'SUPERADMIN' || role === 'ADMIN_DINAS'
