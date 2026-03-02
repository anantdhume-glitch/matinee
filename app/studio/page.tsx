'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Film = {
  id: string
  title: string
  created_at: string
}

export default function Studio() {
  const [films, setFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase.from('films').select('*').order('created_at', { ascending: false })
      setFilms(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const createFilm = async () => {
    if (creating) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('films').insert({
      title: newTitle.trim() || 'Untitled Film',
      user_id: user!.id
    }).select().single()
    if (data) router.push(`/studio/${data.id}`)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontFamily: 'Georgia, serif', letterSpacing: '0.2em' }}>
      Setting the scene...
    </main>
  )

  return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 3rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ color: '#c9a96e', letterSpacing: '0.3em', fontSize: '0.9rem' }}>MATINEE</span>
        <span onClick={signOut} style={{ color: '#555', fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.1em' }}>LEAVE</span>
      </nav>

      <div style={{ padding: '4rem 3rem', maxWidth: '600px' }}>
        <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: '#555', marginBottom: '3rem' }}>THE STUDIO</h2>

        {films.length === 0 && (
          <p style={{ color: '#444', fontSize: '0.95rem', marginBottom: '3rem' }}>No films yet. Begin one.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {films.map(film => (
            <div
              key={film.id}
              onClick={() => router.push(`/studio/${film.id}`)}
              style={{ padding: '1.5rem 0', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', color: '#e8e0d0', fontSize: '1.1rem' }}
            >
              {film.title}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            placeholder="Name your film, or leave it untitled"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createFilm()}
            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: '#e8e0d0', padding: '0.75rem 0', fontSize: '0.9rem', outline: 'none', fontFamily: 'Georgia, serif' }}
          />
          <button
            onClick={createFilm}
            style={{ background: 'transparent', border: '1px solid #c9a96e', color: '#c9a96e', padding: '0.75rem', fontSize: '0.85rem', letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'Georgia, serif', width: 'fit-content' }}
          >
            BEGIN A NEW FILM
          </button>
        </div>
      </div>
    </main>
  )
}