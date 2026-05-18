'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type GateClosed = { gate: string; closed_at: string }

type Film = {
  id: string
  title: string
  updated_at: string
  gates_closed: GateClosed[] | null
}

const GATE_LABELS: Record<string, string> = {
  film_brief:           'Film Brief',
  treatment:            'Treatment',
  department_briefs:    'Department Briefs',
  mode_selection_brief: 'Mode Selection Brief',
  hook_draft:           'Hook Draft',
  script_lock:          'Script Lock',
  audio_direction:      'Audio Direction',
  consistency_lock:     'Consistency Lock',
  shot_list:            'Shot List',
  camera_light_plan:    'Camera & Light Plan',
  visual_prompt_package:'Visual Prompt Package',
  edit_plan:            'Edit Plan',
  music_cue_sheet:      'Music Cue Sheet',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function lastClosedGateLabel(gates: GateClosed[] | null): string | null {
  if (!gates || gates.length === 0) return null
  const sorted = [...gates].sort((a, b) => new Date(b.closed_at).getTime() - new Date(a.closed_at).getTime())
  const gate = sorted[0].gate
  return GATE_LABELS[gate] ?? gate
}

export default function Studio() {
  const [films, setFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showNewFilmForm, setShowNewFilmForm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('films')
        .select('id, title, updated_at, gates_closed')
        .order('updated_at', { ascending: false })
      setFilms(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const createFilm = async () => {
    if (creating) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('films').insert({
      title: newTitle.trim() || 'Untitled Film',
      user_id: user!.id
    }).select().single()
    if (data) {
      setShowNewFilmForm(false)
      setNewTitle('')
      router.push(`/studio/${data.id}`)
    } else {
      setCreating(false)
    }
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

  // Page 1: 8 films. Page 2+: 9 films per page.
  const totalPages = films.length <= 8 ? 1 : Math.ceil((films.length - 8) / 9) + 1
  const pageFilms = currentPage === 1
    ? films.slice(0, 8)
    : films.slice(8 + (currentPage - 2) * 9, 8 + (currentPage - 1) * 9)

  const metaStyle: React.CSSProperties = {
    fontFamily: "'Courier New', monospace",
    fontSize: '9px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  }

  const titleStyle: React.CSSProperties = {
    fontFamily: 'Georgia, serif',
    fontSize: '16px',
    fontWeight: 400,
    letterSpacing: '0.01em',
    lineHeight: 1.3,
    marginBottom: '0.9rem',
    margin: 0,
  }

  const cardBase: React.CSSProperties = {
    padding: '1.4rem 1.4rem 1.2rem',
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  }

  const paginationBtn = (disabled: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: 'none',
    fontFamily: "'Courier New', monospace",
    fontSize: '9px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: disabled ? 'rgba(255, 255, 255, 0.12)' : 'rgba(201, 168, 76, 0.55)',
    cursor: disabled ? 'default' : 'pointer',
    padding: 0,
  })

  return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 3rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ color: '#c9a96e', letterSpacing: '0.3em', fontSize: '0.9rem' }}>MATINEE</span>
        <span onClick={signOut} style={{ color: '#555', fontSize: '0.8rem', cursor: 'pointer', letterSpacing: '0.1em' }}>LEAVE</span>
      </nav>

      <div style={{ padding: '4rem 3rem' }}>
        <h2 style={{ fontSize: '0.8rem', letterSpacing: '0.2em', color: '#555', marginBottom: '3rem' }}>THE STUDIO</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '1px',
          background: 'rgba(255, 255, 255, 0.07)',
        }}>
          {pageFilms.map(film => {
            const gateLabel = lastClosedGateLabel(film.gates_closed)
            const isHovered = hoveredId === film.id
            return (
              <div
                key={film.id}
                onClick={() => router.push(`/studio/${film.id}`)}
                onMouseEnter={() => setHoveredId(film.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ ...cardBase, background: isHovered ? '#1a1508' : '#131008' }}
              >
                <p style={{ ...titleStyle, color: 'rgba(201, 168, 76, 0.9)' }}>
                  {film.title}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ ...metaStyle, color: 'rgba(255, 255, 255, 0.22)' }}>
                    {formatDate(film.updated_at)}
                  </div>
                  {gateLabel && (
                    <div style={{ ...metaStyle, color: 'rgba(201, 168, 76, 0.45)' }}>
                      {gateLabel} — closed
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Begin a New Film card — page 1 only, Option B */}
          {currentPage === 1 && (
            <div
              onClick={() => setShowNewFilmForm(true)}
              onMouseEnter={() => setHoveredId('__new__')}
              onMouseLeave={() => setHoveredId(null)}
              style={{ ...cardBase, background: hoveredId === '__new__' ? '#1a1508' : '#131008', cursor: 'pointer' }}
            >
              <p style={{ ...titleStyle, color: 'rgba(255, 255, 255, 0.28)' }}>Begin a new film</p>
              <div style={{ marginTop: 'auto' }}>
                <span style={{ ...metaStyle, color: 'rgba(255, 255, 255, 0.18)' }}>NEW</span>
              </div>
            </div>
          )}
        </div>

        {/* Inline new film form — Option B */}
        {showNewFilmForm && (
          <div style={{
            marginTop: '1px',
            background: '#131008',
            padding: '1.25rem 1.4rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}>
            <input
              autoFocus
              placeholder="Name your film, or leave it untitled"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createFilm()
                if (e.key === 'Escape') setShowNewFilmForm(false)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '0.4rem 0',
                fontSize: '13px',
                fontFamily: "'Courier New', monospace",
                letterSpacing: '0.08em',
                outline: 'none',
                flex: 1,
              }}
            />
            <button
              onClick={createFilm}
              style={{
                background: 'transparent',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: 'rgba(201, 168, 76, 0.7)',
                fontFamily: "'Courier New', monospace",
                fontSize: '9px',
                letterSpacing: '0.16em',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              Begin
            </button>
            <button
              onClick={() => setShowNewFilmForm(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.2)',
                fontFamily: "'Courier New', monospace",
                fontSize: '9px',
                letterSpacing: '0.12em',
                cursor: 'pointer',
                padding: '0.5rem 0',
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              style={paginationBtn(currentPage === 1)}
              onMouseEnter={e => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.color = 'rgba(201, 168, 76, 0.9)' }}
              onMouseLeave={e => { if (currentPage > 1) (e.currentTarget as HTMLElement).style.color = 'rgba(201, 168, 76, 0.55)' }}
            >
              ← Previous
            </button>
            <span style={{
              fontFamily: "'Courier New', monospace",
              fontSize: '9px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.22)',
            }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              style={paginationBtn(currentPage === totalPages)}
              onMouseEnter={e => { if (currentPage < totalPages) (e.currentTarget as HTMLElement).style.color = 'rgba(201, 168, 76, 0.9)' }}
              onMouseLeave={e => { if (currentPage < totalPages) (e.currentTarget as HTMLElement).style.color = 'rgba(201, 168, 76, 0.55)' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
