'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    setLoading(true)
    setError('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/studio')
    }
  }

  return (
    <main style={{
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Georgia, serif',
      color: '#e8e0d0'
    }}>
      <h1 style={{ fontSize: '1rem', letterSpacing: '0.3em', marginBottom: '3rem', color: '#c9a96e' }}>
        MATINEE
      </h1>

      <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #333',
            color: '#e8e0d0',
            padding: '0.75rem 0',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'Georgia, serif'
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #333',
            color: '#e8e0d0',
            padding: '0.75rem 0',
            fontSize: '0.9rem',
            outline: 'none',
            fontFamily: 'Georgia, serif'
          }}
        />

        {error && <p style={{ color: '#c0392b', fontSize: '0.8rem' }}>{error}</p>}

        <button
          onClick={handleAuth}
          disabled={loading}
          style={{
            background: 'transparent',
            border: '1px solid #c9a96e',
            color: '#c9a96e',
            padding: '0.75rem',
            fontSize: '0.85rem',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            marginTop: '1rem',
            fontFamily: 'Georgia, serif'
          }}
        >
          {loading ? 'One moment...' : isSignUp ? 'ENTER THE STUDIO' : 'RETURN TO THE STUDIO'}
        </button>

        <p
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666', cursor: 'pointer', marginTop: '0.5rem' }}
        >
          {isSignUp ? 'Already have an account? Sign in.' : 'First time here? Create an account.'}
        </p>
      </div>
    </main>
  )
}