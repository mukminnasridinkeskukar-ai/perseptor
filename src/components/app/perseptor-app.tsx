'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/client-api'
import { AppShell } from '@/components/app/app-shell'
import { LoginScreen } from '@/components/app/login-screen'
import { Loader2 } from 'lucide-react'

export function PerseptorApp() {
  const { user, loaded, setAuth, setLoaded } = useApp()

  useEffect(() => {
    let alive = true
    apiGet<{ user: any }>('/api/auth/me')
      .then((res) => {
        if (!alive) return
        setAuth(res.user)
      })
      .catch(() => {
        if (alive) setAuth(null)
      })
      .finally(() => alive && setLoaded(true))
    return () => { alive = false }
  }, [setAuth, setLoaded])

  if (!loaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-teal-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        <div className="text-sm font-medium text-teal-800">Memuat PERSEPTOR...</div>
      </div>
    )
  }

  return user ? <AppShell /> : <LoginScreen />
}
