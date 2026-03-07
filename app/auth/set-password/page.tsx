'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SetPasswordInner() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const code = searchParams.get('code')

    const establish = async () => {
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any
        })
        if (error) setError(error.message)
        else setReady(true)
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) setError(error.message)
        else setReady(true)
      } else {
        const { data } = await supabase.auth.getSession()
        if (data.session) setReady(true)
        else setError('Invalid or expired link. Please request a new one.')
      }
    }

    establish()
  }, [])

  const handleSetPassword = async () => {
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/studio')
  }

  const inputStyle = {
    background: 'transparent', border: 'none', borderBottom: '1px solid #333',
    color: '#e8e0d0', padding: '0.75rem 0', fontSize: '0.9rem',
    outline: 'none', fontFamily: 'Georgia, serif', width: '100%'
  }

  return (
    <main style={{
      backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, serif', color: '#e8e0d0'
    }}>
      <h1 style={{ fontSize: '1rem', letterSpacing: '0.3em', marginBottom: '0.75rem', color: '#c9a96e' }}>MATINEE</h1>
      <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '3rem', fontStyle: 'italic' }}>
        {ready ? 'Set your password to enter the Studio.' : 'Preparing your Studio...'}
      </p>

      {ready && (
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="password" placeholder="Choose a password" value={password}
            onChange={e => setPassword(e.target.value)} style={inputStyle} />
          <input type="password" placeholder="Confirm your password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
            style={inputStyle} />
          {error && <p style={{ color: '#c0392b', fontSize: '0.8rem' }}>{error}</p>}
          <button onClick={handleSetPassword} disabled={loading}
            style={{ background: 'transparent', border: '1px solid #c9a96e', color: '#c9a96e', padding: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.15em', cursor: 'pointer', marginTop: '1rem', fontFamily: 'Georgia, serif' }}>
            {loading ? 'One moment...' : 'ENTER THE STUDIO'}
          </button>
        </div>
      )}

      {!ready && !error && (
        <p style={{ color: '#444', fontStyle: 'italic', fontSize: '0.9rem' }}>Setting the scene...</p>
      )}

      {error && !ready && (
        <p style={{ color: '#c0392b', fontSize: '0.85rem', maxWidth: '320px', textAlign: 'center' }}>{error}</p>
      )}
    </main>
  )
}

export default function SetPassword() {
  return (
    <Suspense>
      <SetPasswordInner />
    </Suspense>
  )
}