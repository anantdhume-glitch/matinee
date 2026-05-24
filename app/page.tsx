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
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleTokens = async () => {
      const params = new URLSearchParams(window.location.search)
      const token_hash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')

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
    <main style={{
      backgroundColor: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      color: 'var(--accent)',
      letterSpacing: '0.1em',
      fontSize: '10px',
      textTransform: 'uppercase',
    }}>
      Setting the scene...
    </main>
  )

  return (
    <main style={{
      backgroundColor: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>

        {/* Wordmark */}
        <h1 style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: '24px',
          fontWeight: 500,
          letterSpacing: '0.4em',
          color: 'var(--accent)',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          MATINEE
        </h1>

        {/* Tagline */}
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          fontWeight: 400,
          letterSpacing: '0.1em',
          color: 'var(--fg-dim)',
          textTransform: 'uppercase',
          marginBottom: '48px',
        }}>
          The filmmaker is always the director.
        </p>

        {/* Inputs */}
        <div style={{ width: '100%' }}>

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={{
              width: '100%',
              background: emailFocused ? '#1C1C21' : 'var(--bg-elev-2)',
              border: `1px solid ${emailFocused ? 'var(--accent-dim)' : 'var(--line)'}`,
              borderBottom: 'none',
              color: 'var(--fg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              padding: '14px 16px',
              display: 'block',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
            style={{
              width: '100%',
              background: passwordFocused ? '#1C1C21' : 'var(--bg-elev-2)',
              border: `1px solid ${passwordFocused ? 'var(--accent-dim)' : 'var(--line)'}`,
              color: 'var(--fg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              padding: '14px 16px',
              display: 'block',
              transition: 'background 0.2s, border-color 0.2s',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{
            width: '100%',
            marginTop: '12px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--fg-dim)',
          }}>
            {error}
          </p>
        )}

        {/* CTA Button */}
        <button
          onClick={handleAuth}
          disabled={loading}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,169,110,0.06)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-dim)'
          }}
          style={{
            width: '100%',
            marginTop: '24px',
            background: 'transparent',
            border: '1px solid var(--accent-dim)',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '14px',
            cursor: loading ? 'default' : 'pointer',
            transition: 'background 0.2s, border-color 0.2s',
          }}
        >
          {loading ? 'One moment...' : isSignUp ? 'ENTER THE STUDIO' : 'RETURN TO THE STUDIO'}
        </button>

        {/* Sub-link */}
        <p
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            marginTop: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--fg-dim)',
            cursor: 'pointer',
          }}
        >
          {isSignUp ? 'Already have an account? Sign in.' : 'First time here? Create an account.'}
        </p>

      </div>
    </main>
  )
}
