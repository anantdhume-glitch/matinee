'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = {
  id: string
  role: string
  content: string
}

type FilmMemory = {
  id?: string
  film_id?: string
  emotional_core?: string
  characters?: any
  decisions_made?: string
  filmmakers_words?: string
  unresolved_threads?: string
  raw_memory?: string
  updated_at?: string
}

type DirectEditState = {
  field: string | null
  value: string
  saving: boolean
}

type EntryMode = 'choice' | 'uploading' | 'soul' | 'conversation'

const EMPTY_PHRASES = ['none yet', 'none', 'not yet', 'n/a', 'tbd', 'unknown', 'nothing yet']

const FIELDS: Array<{
  key: keyof FilmMemory
  label: string
  question: string
  prompt: string
}> = [
  {
    key: 'emotional_core',
    label: 'What the film is becoming',
    question: 'What is the film trying to leave behind in the people who see it? Not the story — the feeling.',
    prompt: "I want to think about what my film is really trying to say — the feeling it wants to leave behind."
  },
  {
    key: 'characters',
    label: 'Who the characters are becoming',
    question: 'Who is this film about? Not the subject — the person we follow.',
    prompt: "I want to find who the characters of my film really are — not their descriptions, but who they actually are."
  },
  {
    key: 'decisions_made',
    label: 'The decisions made',
    question: 'What has this film chosen to be — and what did it set aside to get there?',
    prompt: "Let's talk about the decisions I've made for this film — what I've chosen and what I've left behind."
  },
  {
    key: 'filmmakers_words',
    label: "The filmmaker's own words",
    question: "What phrase have you used that felt exactly right — words you couldn't improve?",
    prompt: "I want to find the words that feel exactly right for my film — the phrases only I could say."
  },
  {
    key: 'unresolved_threads',
    label: 'What is still unresolved',
    question: "What part of the film keeps you up at night — the thing you haven't found yet?",
    prompt: "I want to talk about what's still unresolved in my film — the thread I haven't pulled yet."
  }
]

function isFieldEmpty(value: any): boolean {
  if (!value) return true
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length < 5) return true
    if (EMPTY_PHRASES.includes(trimmed.toLowerCase())) return true
  }
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function renderFieldValue(key: string, value: any): string {
  if (!value) return ''
  if (key === 'characters') {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return value
        .map((c: any) => {
          if (typeof c === 'string') return c
          return [c.name, c.description].filter(Boolean).join(' — ')
        })
        .join('\n\n')
    }
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function formatDate(ts: string): string {
  const date = new Date(ts)
  return (
    date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) +
    ' · ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  )
}

const btnBase: React.CSSProperties = {
  background: 'none',
  fontFamily: 'Georgia, serif',
  fontSize: '0.62rem',
  letterSpacing: '0.1em',
  padding: '5px 12px',
  cursor: 'pointer',
  borderRadius: '2px',
  transition: 'all 0.2s'
}

export default function FilmStudio() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [film, setFilm] = useState<{ title: string } | null>(null)

  // Entry flow
  const [entryMode, setEntryMode] = useState<EntryMode>('conversation')
  const [scriptSoul, setScriptSoul] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Portrait state
  const [portraitOpen, setPortraitOpen] = useState(false)
  const [filmMemory, setFilmMemory] = useState<FilmMemory | null>(null)
  const [portraitRefreshedAt, setPortraitRefreshedAt] = useState<string | null>(null)
  const [portraitLoading, setPortraitLoading] = useState(false)
  const [directEdit, setDirectEdit] = useState<DirectEditState>({
    field: null,
    value: '',
    saving: false
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams()
  const filmId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: filmData } = await supabase
        .from('films').select('*').eq('id', filmId).single()
      if (!filmData) { router.push('/studio'); return }
      setFilm(filmData)

      const { data: msgData } = await supabase
        .from('messages').select('*').eq('film_id', filmId).order('created_at')

      if (msgData && msgData.length > 0) {
        setMessages(msgData)
        setEntryMode('conversation')
      } else {
        // First session — show entry choice
        setEntryMode('choice')
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openingMessage = async (title: string) => {
    const { data: memoryData } = await supabase
      .from('film_memory').select('*').eq('film_id', filmId).single()

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filmId,
        messages: [],
        filmMemory: memoryData,
        sessionType: 'FIRST',
        filmTitle: title
      })
    })

    const data = await response.json()
    const matineeMessage = { role: 'assistant', content: data.content, film_id: filmId }
    await supabase.from('messages').insert(matineeMessage)
    setMessages([{ id: 'opening', role: 'assistant', content: data.content }])
  }

  const beginFromConversation = async () => {
    setEntryMode('conversation')
    await openingMessage(film?.title || 'Untitled Film')
  }

  const handleScriptUpload = async (file: File) => {
    setUploadError(null)
    // If already in conversation, stay there but show a thinking state
    const wasInConversation = entryMode === 'conversation'
    if (!wasInConversation) setEntryMode('uploading')
    else setThinking(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('filmId', filmId)

    try {
      const response = await fetch('/api/parse-script', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        setUploadError(data.error || 'Something went wrong reading your script.')
        if (!wasInConversation) setEntryMode('choice')
        else setThinking(false)
        return
      }

      const openingText = `I've spent time with your script.\n\nThe Film Memory is built. I know your story, your characters, the decisions already made, and what still needs to be found.\n\nBefore we go anywhere — what made you say yes to this one?`
      const matineeMessage = { role: 'assistant', content: openingText, film_id: filmId }
      await supabase.from('messages').insert(matineeMessage)

      if (wasInConversation) {
        // Stay in conversation, append Matinee's message
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: openingText }])
        setThinking(false)
      } else {
        // Show soul screen first, then enter conversation
        setScriptSoul(data.emotional_core)
        setEntryMode('soul')
        setTimeout(async () => {
          setMessages([{ id: 'opening', role: 'assistant', content: openingText }])
          setEntryMode('conversation')
        }, 3000)
      }

    } catch {
      setUploadError("The script couldn't be read. Try again — it's worth it.")
      if (!wasInConversation) setEntryMode('choice')
      else setThinking(false)
    }
  }

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || thinking) return

    setInput('')
    setThinking(true)

    const userMessage = { role: 'user', content: text, film_id: filmId }
    await supabase.from('messages').insert(userMessage)
    const updatedMessages = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: text }
    ]
    setMessages(updatedMessages)

    const { data: memoryData } = await supabase
      .from('film_memory').select('*').eq('film_id', filmId).single()

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filmId,
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        filmMemory: memoryData,
        sessionType: 'RETURNING',
        filmTitle: film?.title
      })
    })

    const data = await response.json()
    const matineeMessage = { role: 'assistant', content: data.content, film_id: filmId }
    await supabase.from('messages').insert(matineeMessage)
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'assistant', content: data.content }
    ])

    if (data.memory) {
      const { data: existing } = await supabase
        .from('film_memory').select('id').eq('film_id', filmId).single()
      if (existing) {
        await supabase
          .from('film_memory')
          .update({ ...data.memory, updated_at: new Date().toISOString() })
          .eq('film_id', filmId)
      } else {
        await supabase
          .from('film_memory')
          .insert({ ...data.memory, film_id: filmId })
      }
    }

    setThinking(false)
  }

  const refreshPortrait = async () => {
    setPortraitLoading(true)
    const { data: memoryData } = await supabase
      .from('film_memory').select('*').eq('film_id', filmId).single()
    setFilmMemory(memoryData)
    setPortraitRefreshedAt(new Date().toISOString())
    setPortraitLoading(false)
  }

  const togglePortrait = async () => {
    if (!portraitOpen && !portraitRefreshedAt) {
      await refreshPortrait()
    }
    setPortraitOpen(p => !p)
  }

  const exploreWithMatinee = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const openDirectEdit = (field: string) => {
    const current = filmMemory ? renderFieldValue(field, (filmMemory as any)[field]) : ''
    setDirectEdit({ field, value: current, saving: false })
  }

  const saveDirectEdit = async () => {
    if (!directEdit.field || directEdit.saving) return
    setDirectEdit(prev => ({ ...prev, saving: true }))

    const { data: existing } = await supabase
      .from('film_memory').select('*').eq('film_id', filmId).single()

    let rawMemory: any = {}
    if (existing?.raw_memory) {
      try { rawMemory = JSON.parse(existing.raw_memory) } catch {}
    }
    const directEdits: any[] = rawMemory.direct_edits || []
    directEdits.push({
      field: directEdit.field,
      edited_at: new Date().toISOString(),
      note: 'Added directly by the filmmaker. Not discovered through conversation.'
    })
    rawMemory.direct_edits = directEdits

    const updatePayload: any = {
      [directEdit.field]: directEdit.value,
      raw_memory: JSON.stringify(rawMemory),
      updated_at: new Date().toISOString()
    }

    if (existing) {
      await supabase.from('film_memory').update(updatePayload).eq('film_id', filmId)
    } else {
      await supabase.from('film_memory').insert({ ...updatePayload, film_id: filmId })
    }

    setFilmMemory(prev =>
      prev ? { ...prev, [directEdit.field!]: directEdit.value } : null
    )
    setDirectEdit({ field: null, value: '', saving: false })
  }

  if (loading) return (
    <main style={{
      backgroundColor: '#0a0a0a', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#c9a96e', fontFamily: 'Georgia, serif', letterSpacing: '0.2em'
    }}>
      Setting the scene...
    </main>
  )

  // ── ENTRY SCREENS ─────────────────────────────────────────────────────────
  if (entryMode !== 'conversation') {
    return (
      <main style={{
        backgroundColor: '#0a0a0a', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Georgia, serif', color: '#e8e0d0'
      }}>
        <nav style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 2rem', borderBottom: '1px solid #1a1a1a'
        }}>
          <span style={{ color: '#c9a96e', letterSpacing: '0.3em', fontSize: '0.8rem' }}>MATINEE</span>
          <span style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>{film?.title}</span>
        </nav>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '3rem 2rem', maxWidth: '560px', margin: '0 auto', width: '100%'
        }}>

          {/* CHOICE */}
          {entryMode === 'choice' && (
            <>
              <p style={{
                fontSize: '1.4rem', lineHeight: 1.75, color: '#e8e0d0',
                textAlign: 'center', marginBottom: '3.5rem', fontWeight: 300
              }}>
                Where are you in this film's journey?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                <button
                  onClick={beginFromConversation}
                  style={{
                    ...btnBase,
                    border: '1px solid #2a2a2a', color: '#888',
                    padding: '1.1rem 2rem', fontSize: '0.8rem',
                    textAlign: 'left', letterSpacing: '0.05em', width: '100%'
                  }}
                >
                  I have an idea. Let's find the film together.
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...btnBase,
                    border: '1px solid #6B5A38', color: '#c9a96e',
                    padding: '1.1rem 2rem', fontSize: '0.8rem',
                    textAlign: 'left', letterSpacing: '0.05em', width: '100%'
                  }}
                >
                  I have a script. Let Matinee read it first.
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleScriptUpload(file)
                  }}
                />
              </div>

              {uploadError && (
                <p style={{
                  marginTop: '1.5rem', fontSize: '0.8rem',
                  color: '#6B3333', fontStyle: 'italic', textAlign: 'center'
                }}>
                  {uploadError}
                </p>
              )}

              <p style={{
                marginTop: '2rem', fontSize: '0.72rem',
                color: '#2e2e2e', letterSpacing: '0.04em', textAlign: 'center'
              }}>
                PDF or Word document · Your script is never stored
              </p>
            </>
          )}

          {/* UPLOADING */}
          {entryMode === 'uploading' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '1.1rem', color: '#555',
                fontStyle: 'italic', lineHeight: 1.7, marginBottom: '0.75rem'
              }}>
                Reading your script...
              </p>
              <p style={{ fontSize: '0.75rem', color: '#2e2e2e', letterSpacing: '0.06em' }}>
                Building the Film Memory. This takes a moment.
              </p>
            </div>
          )}

          {/* SOUL DISPLAY */}
          {entryMode === 'soul' && scriptSoul && (
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontSize: '0.62rem', letterSpacing: '0.2em',
                color: '#6B5A38', textTransform: 'uppercase', marginBottom: '1.5rem'
              }}>
                What the film is becoming
              </p>
              <p style={{
                fontSize: '1.5rem', lineHeight: 1.75,
                color: '#e8e0d0', fontWeight: 300, marginBottom: '2.5rem'
              }}>
                {scriptSoul}
              </p>
              <p style={{
                fontSize: '0.75rem', color: '#2e2e2e',
                letterSpacing: '0.06em', fontStyle: 'italic'
              }}>
                The Film Memory is built. Stepping into the Studio...
              </p>
            </div>
          )}

        </div>
      </main>
    )
  }

  // ── MAIN STUDIO ───────────────────────────────────────────────────────────
  return (
    <main style={{
      backgroundColor: '#0a0a0a', height: '100vh',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Georgia, serif', color: '#e8e0d0', overflow: 'hidden'
    }}>

      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.5rem 2rem', borderBottom: '1px solid #1a1a1a', flexShrink: 0
      }}>
        <span style={{ color: '#c9a96e', letterSpacing: '0.3em', fontSize: '0.8rem' }}>MATINEE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>{film?.title}</span>
          <span
            onClick={() => router.push('/studio')}
            style={{ color: '#444', fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.1em' }}
          >
            THE STUDIO
          </span>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...btnBase,
              border: '1px solid #2a2a2a',
              color: '#444',
              fontSize: '0.7rem'
            }}
          >
            UPLOAD SCRIPT
          </button>
          <button
            onClick={togglePortrait}
            style={{
              ...btnBase,
              border: `1px solid ${portraitOpen ? '#6B5A38' : '#2a2a2a'}`,
              color: portraitOpen ? '#c9a96e' : '#555',
              fontSize: '0.7rem'
            }}
          >
            FILM PORTRAIT
          </button>
        </div>
      </nav>

      {/* Hidden file input for nav script upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) {
            e.target.value = ''
            handleScriptUpload(file)
          }
        }}
      />

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* CONVERSATION */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
            <div style={{
              maxWidth: '640px', margin: '0 auto',
              display: 'flex', flexDirection: 'column', gap: '2.5rem'
            }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'assistant' ? (
                    <p style={{ fontSize: '1.15rem', lineHeight: '1.85', color: '#e8e0d0', fontWeight: 300 }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid #1a1a1a' }}>
                      <p style={{ fontSize: '0.9rem', lineHeight: '1.7', color: '#666' }}>
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {thinking && (
                <p style={{ color: '#333', fontSize: '0.9rem', fontStyle: 'italic' }}>...</p>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* INPUT */}
          <div style={{ borderTop: '1px solid #1a1a1a', padding: '1.25rem 3rem 1.5rem', flexShrink: 0 }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Speak..."
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: '#e8e0d0', fontSize: '0.95rem', outline: 'none',
                  fontFamily: 'Georgia, serif'
                }}
              />
              <span onClick={() => sendMessage()} style={{ color: '#444', cursor: 'pointer', fontSize: '1.1rem' }}>→</span>
            </div>
          </div>
        </div>

        {/* FILM PORTRAIT PANEL */}
        <div style={{
          width: portraitOpen ? '380px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.35s ease',
          borderLeft: portraitOpen ? '1px solid #1a1a1a' : 'none',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {portraitOpen && (
            <div style={{ width: '380px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* PORTRAIT HEADER */}
              <div style={{ padding: '1.25rem 1.75rem 1rem', borderBottom: '1px solid #141414', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: '#3a3a3a', textTransform: 'uppercase' }}>
                    Film Portrait
                  </span>
                  <button
                    onClick={refreshPortrait}
                    disabled={portraitLoading}
                    style={{
                      ...btnBase,
                      border: '1px solid #2a2a2a',
                      color: portraitLoading ? '#333' : '#555',
                      cursor: portraitLoading ? 'default' : 'pointer'
                    }}
                  >
                    {portraitLoading ? 'Updating...' : 'Update Portrait'}
                  </button>
                </div>
                {portraitRefreshedAt && (
                  <p style={{ fontSize: '0.62rem', color: '#2e2e2e', letterSpacing: '0.04em' }}>
                    Last updated {formatDate(portraitRefreshedAt)}
                  </p>
                )}
              </div>

              {/* PORTRAIT FIELDS */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem 2rem 1.75rem' }}>
                {!filmMemory ? (
                  <p style={{ color: '#2e2e2e', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.7 }}>
                    The portrait is still taking shape. Keep the conversation going — then update the portrait to see what has been found.
                  </p>
                ) : (
                  FIELDS.map((field, idx) => {
                    const value = filmMemory[field.key]
                    const isEmpty = isFieldEmpty(value)
                    const isEditing = directEdit.field === field.key

                    return (
                      <div key={field.key}>
                        <div style={{ marginBottom: '1.75rem' }}>
                          <p style={{
                            fontSize: '0.6rem', letterSpacing: '0.18em',
                            color: '#6B5A38', textTransform: 'uppercase', marginBottom: '0.65rem'
                          }}>
                            {field.label}
                          </p>

                          {isEmpty ? (
                            <div style={{ border: '1px solid #161616', borderRadius: '2px', padding: '0.9rem 1rem' }}>
                              <p style={{
                                fontSize: '0.875rem', lineHeight: 1.7,
                                color: '#383838', fontStyle: 'italic', marginBottom: '0.85rem'
                              }}>
                                {field.question}
                              </p>

                              {isEditing ? (
                                <div>
                                  <textarea
                                    value={directEdit.value}
                                    onChange={e => setDirectEdit(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="Write here..."
                                    style={{
                                      width: '100%', background: '#0d0d0d',
                                      border: '1px solid #2a2a2a', color: '#e8e0d0',
                                      fontFamily: 'Georgia, serif', fontSize: '0.85rem',
                                      lineHeight: 1.6, padding: '0.6rem 0.75rem',
                                      resize: 'vertical', minHeight: '80px',
                                      outline: 'none', borderRadius: '2px',
                                      marginBottom: '0.6rem', boxSizing: 'border-box'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      onClick={saveDirectEdit}
                                      disabled={directEdit.saving}
                                      style={{ ...btnBase, border: '1px solid #6B5A38', color: '#c9a96e' }}
                                    >
                                      {directEdit.saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setDirectEdit({ field: null, value: '', saving: false })}
                                      style={{ ...btnBase, border: '1px solid #2a2a2a', color: '#555' }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => exploreWithMatinee(field.prompt)}
                                    style={{ ...btnBase, border: '1px solid #6B5A38', color: '#c9a96e' }}
                                  >
                                    Explore with Matinee
                                  </button>
                                  <button
                                    onClick={() => openDirectEdit(field.key)}
                                    style={{ ...btnBase, border: '1px solid #2a2a2a', color: '#555' }}
                                  >
                                    Write directly
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#b8af9f', whiteSpace: 'pre-wrap' }}>
                              {renderFieldValue(field.key, value)}
                            </p>
                          )}
                        </div>

                        {idx < FIELDS.length - 1 && (
                          <div style={{ height: '1px', background: '#111', marginBottom: '1.75rem' }} />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}