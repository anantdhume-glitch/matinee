'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Film = {
  id: string
  title: string
  created_at: string
  updated_at: string
  current_mode: string | null
  film_status?: 'active' | 'paused' | 'closed' | 'archived'
  status_history?: Array<{
    status: string
    reason: string
    changed_at: string
  }>
}

function getFilmPhase(mode: string | null): 'PRE-PRODUCTION' | 'PRODUCTION' | 'POST-PRODUCTION' {
  if (!mode) return 'PRE-PRODUCTION'
  if (['producer'].includes(mode)) return 'PRE-PRODUCTION'
  if (['director', 'narrator', 'cinematographer', 'ai_specialist'].includes(mode)) return 'PRODUCTION'
  if (['editor'].includes(mode)) return 'POST-PRODUCTION'
  return 'PRE-PRODUCTION'
}

export default function Studio() {
  const [films, setFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusModal, setStatusModal] = useState<{
    filmId: string
    filmTitle: string
    action: 'pause' | 'close' | 'archive' | 'delete' | 'reopen' | 'unarchive'
  } | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [archiveExpanded, setArchiveExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [menuOpenFilmId, setMenuOpenFilmId] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data } = await supabase
        .from('films')
        .select('id, title, created_at, updated_at, current_mode, film_status, status_history')
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
    const { data } = await supabase.from('films').insert({
      title: newTitle.trim() || 'Untitled Film',
      user_id: user!.id
    }).select().single()
    if (data) {
      await supabase.from('film_memory').insert({ film_id: data.id })
      router.push(`/studio/${data.id}`)
    }
  }

  const openModal = () => { setNewTitle(''); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setNewTitle('') }

  const handleStatusAction = async () => {
    if (!statusModal) return
    const { filmId, action } = statusModal

    if ((action === 'pause' || action === 'close' || action === 'archive' || action === 'delete') && !statusReason.trim()) return

    setStatusSaving(true)

    try {
      if (action === 'delete') {
        await supabase.from('messages').delete().eq('film_id', filmId)
        await supabase.from('film_memory').delete().eq('film_id', filmId)
        await supabase.from('films').delete().eq('id', filmId)
        setFilms(prev => prev.filter(f => f.id !== filmId))
      } else {
        const newStatus =
          action === 'pause'     ? 'paused' :
          action === 'close'     ? 'closed' :
          action === 'archive'   ? 'archived' :
          action === 'reopen'    ? 'active' :
          action === 'unarchive' ? 'active' : 'active'

        const historyEntry = {
          status: newStatus,
          reason: statusReason.trim() || '',
          changed_at: new Date().toISOString(),
        }

        const film = films.find(f => f.id === filmId)
        const existingHistory = film?.status_history ?? []

        await supabase
          .from('films')
          .update({
            film_status: newStatus,
            status_history: [...existingHistory, historyEntry],
          })
          .eq('id', filmId)

        setFilms(prev => prev.map(f =>
          f.id === filmId
            ? { ...f, film_status: newStatus, status_history: [...(f.status_history ?? []), historyEntry] }
            : f
        ))
      }
    } finally {
      setStatusSaving(false)
      setStatusModal(null)
      setStatusReason('')
    }
  }

  if (loading) return (
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
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", color: 'var(--fg)' }}>

      {/* HEADER */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem', height: '44px', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--bg-elev)' }}>
        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '15px', fontWeight: 500, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          MATINEE
        </span>
        <span onClick={() => supabase.auth.signOut().then(() => router.push('/'))} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--fg-dim)', textTransform: 'uppercase', cursor: 'pointer' }}>
          LEAVE
        </span>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem 6rem' }}>

        {/* PAGE LABEL */}
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--fg-dim)', textTransform: 'uppercase', marginBottom: '2.5rem' }}>
          THE STUDIO
        </p>

        {/* BEGIN A NEW FILM */}
        <div
          onClick={openModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem', cursor: 'pointer' }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            + BEGIN A NEW FILM
          </span>
        </div>

        {(() => {
          const activeFilms = films.filter(f => !f.film_status || f.film_status === 'active' || f.film_status === 'paused')
          const closedFilms = films.filter(f => f.film_status === 'closed' || f.film_status === 'archived')

          const sortedActive = [...activeFilms].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          const heroFilm = sortedActive[0] ?? null
          const remainingFilms = sortedActive.slice(1)
          const visibleRemaining = showAll ? remainingFilms : remainingFilms.slice(0, 5)

          const phases: Array<'PRE-PRODUCTION' | 'PRODUCTION' | 'POST-PRODUCTION'> = ['PRE-PRODUCTION', 'PRODUCTION', 'POST-PRODUCTION']

          const filmCard = (film: Film, isHero: boolean) => {
            const phase = getFilmPhase(film.current_mode)
            const isMenuOpen = menuOpenFilmId === film.id

            return (
              <div
                key={film.id}
                style={{ position: 'relative' }}
              >
                <div
                  onClick={() => router.push(`/studio/${film.id}`)}
                  style={{
                    padding: isHero ? '2rem 2rem 2rem 2.5rem' : '1.25rem 2rem 1.25rem 2.5rem',
                    borderLeft: isHero ? '2px solid var(--accent)' : '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer',
                    opacity: film.film_status === 'paused' ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                    position: 'relative',
                  }}
                >
                  {/* Mode badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.07em', color: 'var(--accent)', textTransform: 'uppercase', margin: 0 }}>
                      {`IN ${film.current_mode ? film.current_mode.replace('_', ' ').toUpperCase() : 'DISCOVERY'}`}
                    </p>

                    {film.film_status && film.film_status !== 'active' && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
                        textTransform: 'uppercase', padding: '2px 6px',
                        border: '1px solid var(--line)',
                        color: film.film_status === 'paused' ? 'var(--fg-dim)' :
                               film.film_status === 'closed' ? 'var(--accent-dim)' :
                               film.film_status === 'archived' ? 'var(--fg-dim)' : 'var(--fg-dim)',
                      }}>
                        {film.film_status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p style={{ fontSize: isHero ? '1.5rem' : '1.1rem', fontWeight: 400, color: 'var(--fg)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {film.title}
                  </p>

                  {/* Date */}
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', color: 'var(--fg-dim)', textTransform: 'uppercase', opacity: 0.5 }}>
                    {new Date(film.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                {/* ••• menu trigger — appears on row hover */}
                <div
                  onClick={e => { e.stopPropagation(); setMenuOpenFilmId(isMenuOpen ? null : film.id) }}
                  style={{
                    position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--fg-dim)',
                    cursor: 'pointer', padding: '0.25rem 0.5rem',
                    opacity: 1,
                  }}
                >
                  •••
                </div>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', right: '1rem', top: 'calc(50% + 16px)',
                      backgroundColor: 'var(--bg-elev-2)', border: '1px solid var(--line)',
                      zIndex: 20, minWidth: '140px',
                    }}
                  >
                    {(film.film_status === 'active' || !film.film_status) && (
                      <div
                        onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'pause' }); setMenuOpenFilmId(null) }}
                        style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                      >
                        Pause
                      </div>
                    )}
                    {film.film_status === 'paused' && (
                      <div
                        onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'reopen' }); setMenuOpenFilmId(null) }}
                        style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                      >
                        Resume
                      </div>
                    )}
                    <div
                      onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'close' }); setMenuOpenFilmId(null) }}
                      style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                    >
                      Close
                    </div>
                    <div
                      onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'archive' }); setMenuOpenFilmId(null) }}
                      style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                    >
                      Archive
                    </div>
                    <div
                      onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'delete' }); setMenuOpenFilmId(null) }}
                      style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0392b', cursor: 'pointer' }}
                    >
                      Delete
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <>
              {/* HERO */}
              {heroFilm && filmCard(heroFilm, true)}

              {/* PHASE GROUPS */}
              {phases.map(phase => {
                const phaseFilms = visibleRemaining.filter(f => getFilmPhase(f.current_mode) === phase)
                if (phaseFilms.length === 0) return null
                return (
                  <div key={phase} style={{ marginTop: '2.5rem' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.2em', color: 'var(--fg-dim)', textTransform: 'uppercase', marginBottom: '1rem', paddingLeft: '2.5rem' }}>
                      {phase}
                    </p>
                    {phaseFilms.map(f => filmCard(f, false))}
                  </div>
                )
              })}

              {/* SHOW ALL / LESS */}
              {remainingFilms.length > 5 && (
                <div style={{ marginTop: '1.5rem', paddingLeft: '2.5rem' }}>
                  <span
                    onClick={() => setShowAll(prev => !prev)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--fg-dim)', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showAll ? 'SHOW LESS' : `SHOW ALL (${remainingFilms.length})`}
                  </span>
                </div>
              )}

              {/* ARCHIVE SECTION */}
              {closedFilms.length > 0 && (
                <div style={{ marginTop: '4rem', borderTop: '1px solid var(--line)', paddingTop: '2rem' }}>
                  <div
                    onClick={() => setArchiveExpanded(prev => !prev)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingLeft: '2.5rem', marginBottom: archiveExpanded ? '1.5rem' : 0 }}
                  >
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.2em', color: 'var(--fg-dim)', textTransform: 'uppercase' }}>
                      ARCHIVE ({closedFilms.length})
                    </p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-dim)' }}>
                      {archiveExpanded ? '↑' : '↓'}
                    </span>
                  </div>

                  {archiveExpanded && closedFilms.map(film => (
                    <div key={film.id} style={{ position: 'relative' }}>
                      <div
                        onClick={() => router.push(`/studio/${film.id}`)}
                        style={{ padding: '1rem 2rem 1rem 2.5rem', borderBottom: '1px solid var(--line)', cursor: 'pointer', opacity: 0.4 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.07em', color: 'var(--accent)', textTransform: 'uppercase', margin: 0 }}>
                            {`IN ${film.current_mode ? film.current_mode.replace('_', ' ').toUpperCase() : 'DISCOVERY'}`}
                          </p>
                          {film.film_status && film.film_status !== 'active' && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
                              textTransform: 'uppercase', padding: '2px 6px',
                              border: '1px solid var(--line)',
                              color: film.film_status === 'paused' ? 'var(--fg-dim)' :
                                     film.film_status === 'closed' ? 'var(--accent-dim)' :
                                     film.film_status === 'archived' ? 'var(--fg-dim)' : 'var(--fg-dim)',
                            }}>
                              {film.film_status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '1rem', color: 'var(--fg)', marginBottom: '0.3rem' }}>
                          {film.title}
                        </p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--fg-dim)', textTransform: 'uppercase', opacity: 0.5 }}>
                          {new Date(film.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>

                      {/* ••• menu for archived films */}
                      <div
                        onClick={e => { e.stopPropagation(); setMenuOpenFilmId(menuOpenFilmId === film.id ? null : film.id) }}
                        style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--fg-dim)', cursor: 'pointer', padding: '0.25rem 0.5rem', opacity: 1 }}
                      >
                        •••
                      </div>

                      {menuOpenFilmId === film.id && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{ position: 'absolute', right: '1rem', top: 'calc(50% + 16px)', backgroundColor: 'var(--bg-elev-2)', border: '1px solid var(--line)', zIndex: 20, minWidth: '140px' }}
                        >
                          <div
                            onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'reopen' }); setMenuOpenFilmId(null) }}
                            style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}
                          >
                            Reopen
                          </div>
                          <div
                            onClick={() => { setStatusModal({ filmId: film.id, filmTitle: film.title, action: 'delete' }); setMenuOpenFilmId(null) }}
                            style={{ padding: '0.6rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0392b', cursor: 'pointer' }}
                          >
                            Delete
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* STATUS MODAL */}
      {statusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--bg-elev)', maxWidth: '480px', width: '100%', border: '1px solid var(--line)', padding: '2rem 2.5rem' }}>

            {/* Title */}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-dim)', marginBottom: '1rem' }}>
              {statusModal.action === 'delete'    ? 'Delete Film' :
               statusModal.action === 'pause'     ? 'Pause Film' :
               statusModal.action === 'close'     ? 'Close Film' :
               statusModal.action === 'archive'   ? 'Archive Film' :
               statusModal.action === 'reopen'    ? 'Reopen Film' :
               statusModal.action === 'unarchive' ? 'Unarchive Film' : ''}
            </p>

            {/* Film name */}
            <p style={{ fontSize: '1.1rem', color: 'var(--fg)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
              {statusModal.filmTitle}
            </p>

            {/* Warning for delete */}
            {statusModal.action === 'delete' && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', color: '#c0392b', textTransform: 'uppercase', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                This will permanently delete this film and everything built from it. This cannot be undone.
              </p>
            )}

            {/* Reason input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: '0.5rem' }}>
                {statusModal.action === 'reopen' ? 'What\'s bringing you back? (optional)' : 'Reason'}
              </p>
              <textarea
                value={statusReason}
                onChange={e => setStatusReason(e.target.value)}
                placeholder={
                  statusModal.action === 'delete'  ? 'Why are you deleting this film?' :
                  statusModal.action === 'pause'   ? 'Why are you pausing?' :
                  statusModal.action === 'close'   ? 'Why are you closing this film?' :
                  statusModal.action === 'archive' ? 'Why are you archiving?' :
                  statusModal.action === 'reopen'  ? 'What\'s bringing you back...' : ''
                }
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  borderBottom: '1px solid var(--line)', color: 'var(--fg)',
                  fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.9rem', lineHeight: 1.6,
                  padding: '0.5rem 0', resize: 'none', minHeight: '60px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={handleStatusAction}
                disabled={statusSaving || (statusModal.action !== 'reopen' && !statusReason.trim())}
                style={{
                  fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.72rem', letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '0.5rem 1.25rem',
                  background: statusModal.action === 'delete' ? '#c0392b' : 'var(--accent)',
                  color: 'var(--bg)', border: 'none', cursor: statusSaving || (statusModal.action !== 'reopen' && !statusReason.trim()) ? 'not-allowed' : 'pointer',
                  opacity: statusSaving || (statusModal.action !== 'reopen' && !statusReason.trim()) ? 0.5 : 1,
                }}
              >
                {statusSaving ? 'Saving...' : (
                  statusModal.action === 'delete'    ? 'Delete permanently' :
                  statusModal.action === 'pause'     ? 'Pause film' :
                  statusModal.action === 'close'     ? 'Close film' :
                  statusModal.action === 'archive'   ? 'Archive film' :
                  statusModal.action === 'reopen'    ? 'Reopen film' :
                  statusModal.action === 'unarchive' ? 'Unarchive film' : 'Confirm'
                )}
              </button>
              <button
                onClick={() => { setStatusModal(null); setStatusReason('') }}
                style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.5rem 1.25rem', background: 'transparent', color: 'var(--fg-dim)', border: '1px solid var(--line)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


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
              background: 'var(--bg-elev-2)',
              border: '1px solid var(--line)',
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
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontStyle: 'italic',
                fontSize: '19px',
                color: 'var(--fg)',
                background: 'transparent',
                borderBottom: '1px solid var(--line)',
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
                  border: '1px solid var(--accent-dim)',
                  color: 'var(--accent)',
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
                  color: 'var(--fg-dim)',
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
