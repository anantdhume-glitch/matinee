'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Film = {
  id: string
  title: string
  created_at: string
  current_mode: string | null
}

export default function Studio() {
  const [films, setFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [heroMessage, setHeroMessage] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('films')
        .select('id, title, created_at, current_mode')
        .order('created_at', { ascending: false })
      const filmList = data || []
      setFilms(filmList)

      if (filmList.length > 0) {
        const { data: msgData } = await supabase
          .from('messages')
          .select('content')
          .eq('film_id', filmList[0].id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (msgData) setHeroMessage(msgData.content)
      }

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

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()

  const modeDisplay = (mode: string | null) =>
    mode ? mode.replace('_', ' ').toUpperCase() : 'DISCOVERY'

  const openModal = () => { setNewTitle(''); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setNewTitle('') }

  if (loading) return (
    <main style={{
      backgroundColor: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
      color: 'var(--gold)',
      letterSpacing: '0.1em',
      fontSize: '10px',
      textTransform: 'uppercase',
    }}>
      Setting the scene...
    </main>
  )

  const [heroFilm, ...restFilms] = films

  return (
    <main style={{
      backgroundColor: 'var(--bg)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text)',
    }}>

      {/* HEADER STRIP */}
      <header style={{
        height: '56px',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          fontWeight: 500,
          letterSpacing: '0.3em',
          color: 'var(--gold)',
          textTransform: 'uppercase',
        }}>
          MATINEE
        </span>
        <span
          onClick={signOut}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          LEAVE
        </span>
      </header>

      {/* BODY */}
      <div style={{ padding: '32px 32px 0', flex: 1, overflowY: 'auto' }}>

        {/* Section label */}
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.2em',
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          marginBottom: '24px',
        }}>
          THE STUDIO
        </p>

        {/* Film list */}
        <div style={{ borderTop: '1px solid var(--border)' }}>

          {/* Hero row */}
          {heroFilm && (
            <div
              onClick={() => router.push(`/studio/${heroFilm.id}`)}
              style={{
                padding: '20px 0',
                borderBottom: '1px solid var(--border)',
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              {/* Gold left border — always present on hero */}
              <div style={{
                position: 'absolute',
                left: '-32px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'var(--gold)',
              }} />

              <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '22px',
                  fontWeight: 400,
                  color: 'var(--text)',
                  marginBottom: '4px',
                  lineHeight: 1.2,
                }}>
                  {heroFilm.title}
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  color: 'var(--text-dim)',
                  marginBottom: heroMessage ? '8px' : 0,
                }}>
                  In{' '}
                  <span style={{ color: 'var(--gold)' }}>
                    {modeDisplay(heroFilm.current_mode)}
                  </span>
                </p>
                {heroMessage && (
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '13px',
                    fontStyle: 'italic',
                    color: 'var(--text-dim)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}>
                    {heroMessage}
                  </p>
                )}
              </div>

              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                flexShrink: 0,
                paddingTop: '4px',
              }}>
                {formatDate(heroFilm.created_at)}
              </p>
            </div>
          )}

          {/* Standard rows */}
          {restFilms.map(film => {
            const isUntitled = !film.title || film.title === 'Untitled Film'
            const isHovered = hoveredId === film.id
            return (
              <div
                key={film.id}
                onClick={() => router.push(`/studio/${film.id}`)}
                onMouseEnter={() => setHoveredId(film.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border)',
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                {/* Gold hover border */}
                <div style={{
                  position: 'absolute',
                  left: '-32px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'var(--gold)',
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 200ms ease',
                }} />

                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  <p style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: isUntitled ? '17px' : '19px',
                    fontWeight: 400,
                    fontStyle: isUntitled ? 'italic' : 'normal',
                    color: isUntitled ? 'var(--text-dim)' : 'var(--text)',
                    marginBottom: '4px',
                    lineHeight: 1.2,
                  }}>
                    {film.title}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                  }}>
                    In{' '}
                    <span style={{ color: 'var(--gold)' }}>
                      {modeDisplay(film.current_mode)}
                    </span>
                  </p>
                </div>

                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  paddingTop: '2px',
                }}>
                  {formatDate(film.created_at)}
                </p>
              </div>
            )
          })}

          {films.length === 0 && (
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '17px',
              fontStyle: 'italic',
              color: 'var(--text-dim)',
              padding: '24px 0',
            }}>
              No films yet.
            </p>
          )}
        </div>

        {/* Begin a new film */}
        <div
          onClick={openModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            cursor: 'pointer',
            paddingBottom: '32px',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            color: 'var(--gold)',
            lineHeight: 1,
          }}>+</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
          }}>
            BEGIN A NEW FILM
          </span>
        </div>

      </div>

      {/* NEW FILM MODAL */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '32px',
              width: '480px',
            }}
          >
            <input
              autoFocus
              type="text"
              placeholder="Name your film, or leave it untitled"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createFilm()
                if (e.key === 'Escape') closeModal()
              }}
              style={{
                width: '100%',
                fontFamily: 'var(--font-serif)',
                fontSize: '19px',
                color: 'var(--text)',
                background: 'transparent',
                borderBottom: '1px solid var(--border)',
                padding: '0 0 12px',
                marginBottom: '24px',
                display: 'block',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={createFilm}
                disabled={creating}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--gold-dim)',
                  color: 'var(--gold)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  padding: '10px 20px',
                  cursor: creating ? 'default' : 'pointer',
                }}
              >
                {creating ? 'One moment...' : 'BEGIN'}
              </button>
              <span
                onClick={closeModal}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                }}
              >
                Cancel
              </span>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
