'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Callback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handle = async () => {
      // Handle fragment-based tokens (#access_token=...)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          router.push('/auth/set-password')
          return
        }
      }

      // Handle query-based tokens (?token_hash=...&type=...)
      const search = new URLSearchParams(window.location.search)
      const token_hash = search.get('token_hash')
      const type = search.get('type')
      const code = search.get('code')

      if (token_hash && type) {
        await supabase.auth.verifyOtp({ token_hash, type: type as any })
        router.push('/auth/set-password')
        return
      }

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
        router.push('/auth/set-password')
        return
      }

      router.push('/')
    }

    handle()
  }, [])

  return (
    <main style={{
      backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', color: '#c9a96e',
      letterSpacing: '0.2em', fontSize: '0.85rem'
    }}>
      Setting the scene...
    </main>
  )
}
