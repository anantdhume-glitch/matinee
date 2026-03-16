'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleTokens = async () => {
      // Check query string for token_hash
      const params = new URLSearchParams(window.location.search)
      const token_hash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')

      // Check fragment for access_token
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.substring(1))
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')

      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
        router.push('/auth/set-password')
        return
      }

      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
        if (!error) { router.push('/auth/set-password'); return }
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { router.push('/auth/set-password'); return }
      }

      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { router.push('/studio'); return }

      setChecking(false)
    }

    handleTokens()
  }, [])

  const handleAuth = async () => {
    setLoading(true)
    setError('')
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/studio')
  }

  if (checking) return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: '#c9a96e', letterSpacing: '0.2em', fontSize: '0.85rem' }}>
      Setting the scene...
    </main>
  )

  return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <h1 style={{ fontSize: '1rem', letterSpacing: '0.3em', marginBottom: '3rem', color: '#c9a96e' }}>MATINEE</h1>
      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#e8e0d0', padding: '0.75rem 0', fontSize: '0.9rem', outline: 'none', fontFamily: 'Georgia, serif' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#e8e0d0', padding: '0.75rem 0', fontSize: '0.9rem', outline: 'none', fontFamily: 'Georgia, serif' }} />
        {error && <p style={{ color: '#c0392b', fontSize: '0.8rem' }}>{error}</p>}
        <button onClick={handleAuth} disabled={loading}
          style={{ background: 'transparent', border: '1px solid #c9a96e', color: '#c9a96e', padding: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.15em', cursor: 'pointer', marginTop: '1rem', fontFamily: 'Georgia, serif' }}>
          {loading ? 'One moment...' : isSignUp ? 'ENTER THE STUDIO' : 'RETURN TO THE STUDIO'}
        </button>
        <p onClick={() => setIsSignUp(!isSignUp)}
          style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666', cursor: 'pointer', marginTop: '0.5rem' }}>
          {isSignUp ? 'Already have an account? Sign in.' : 'First time here? Create an account.'}
        </p>
      </div>
    </main>
  )
}