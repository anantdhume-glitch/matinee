'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = { id: string; role: string; content: string }
type FilmMemory = {
  id?: string; film_id?: string; emotional_core?: string; characters?: any
  decisions_made?: string; filmmakers_words?: string; unresolved_threads?: string
  raw_memory?: string; updated_at?: string
}
type DirectEditState = { field: string | null; value: string; saving: boolean }
type EntryMode = 'choice' | 'uploading' | 'soul' | 'conversation'

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const gold = '#c9a96e'
const goldDim = '#6B5A38'
const text = '#e8e0d0'
const textDim = '#555'
const textFaint = '#333'
const border = '#1e1e1e'
const borderMid = '#2a2a2a'
const bg = '#0a0a0a'
const serif = 'Georgia, serif'

const btnPrimary: React.CSSProperties = {
  background: 'transparent', border: `1px solid ${gold}`, color: gold,
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.12em',
  cursor: 'pointer', fontFamily: serif, transition: 'all 0.2s'
}
const btnSecondary: React.CSSProperties = {
  background: 'transparent', border: `1px solid ${borderMid}`, color: textDim,
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: serif, transition: 'all 0.2s'
}
const btnSmall: React.CSSProperties = {
  background: 'transparent', border: `1px solid ${borderMid}`, color: textDim,
  padding: '4px 10px', fontSize: '0.62rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: serif, transition: 'all 0.2s'
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const EMPTY_PHRASES = ['none yet', 'none', 'not yet', 'n/a', 'tbd', 'unknown', 'nothing yet']

const FIELDS: Array<{ key: keyof FilmMemory; label: string; question: string; prompt: string }> = [
  { key: 'emotional_core', label: 'What the film is becoming', question: 'What is the film trying to leave behind in the people who see it? Not the story — the feeling.', prompt: "I want to think about what my film is really trying to say — the feeling it wants to leave behind." },
  { key: 'characters', label: 'Who the characters are becoming', question: 'Who is this film about? Not the subject — the person we follow.', prompt: "I want to find who the characters of my film really are — not their descriptions, but who they actually are." },
  { key: 'decisions_made', label: 'The decisions made', question: 'What has this film chosen to be — and what did it set aside to get there?', prompt: "Let's talk about the decisions I've made for this film — what I've chosen and what I've left behind." },
  { key: 'filmmakers_words', label: "The filmmaker's own words", question: "What phrase have you used that felt exactly right — words you couldn't improve?", prompt: "I want to find the words that feel exactly right for my film — the phrases only I could say." },
  { key: 'unresolved_threads', label: 'What is still unresolved', question: "What part of the film keeps you up at night — the thing you haven't found yet?", prompt: "I want to talk about what's still unresolved in my film — the thread I haven't pulled yet." }
]

// ── HELPERS ───────────────────────────────────────────────────────────────────
function isFieldEmpty(value: any): boolean {
  if (!value) return true
  if (typeof value === 'string') {
    const t = value.trim()
    if (t.length < 5) return true
    if (EMPTY_PHRASES.includes(t.toLowerCase())) return true
  }
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function renderFieldValue(key: string, value: any): string {
  if (!value) return ''
  if (key === 'characters') {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map((c: any) => typeof c === 'string' ? c : [c.name, c.description].filter(Boolean).join(' — ')).join('\n\n')
    return JSON.stringify(value, null, 2)
  }
  if (key === 'filmmakers_words') {
    let phrases: string[] = []
    if (Array.isArray(value)) phrases = value
    else if (typeof value === 'string') {
      try { const p = JSON.parse(value); phrases = Array.isArray(p) ? p : [value] } catch { phrases = [value] }
    }
    return phrases.map(p => `"${p}"`).join('\n\n')
  }
  return String(value)
}

function formatDate(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function mergeMemory(existing: any, extracted: any): any {
  const merged: any = {}

  for (const field of ['emotional_core', 'decisions_made', 'unresolved_threads']) {
    const e = (existing?.[field] || '') as string
    const n = (extracted?.[field] || '') as string
    merged[field] = n.length > e.length ? n : (e || n)
  }

  const ec = existing?.characters || []
  const nc = extracted?.characters || []
  merged.characters = JSON.stringify(nc).length > JSON.stringify(ec).length ? nc : ec

  const ew = (existing?.filmmakers_words || '') as string
  const nw = (extracted?.filmmakers_words || '') as string
  if (!ew) merged.filmmakers_words = nw
  else if (!nw || nw === ew) merged.filmmakers_words = ew
  else merged.filmmakers_words = ew + '\n\n' + nw

  return merged
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function FilmStudio() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [film, setFilm] = useState<{ title: string } | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>('conversation')
  const [scriptSoul, setScriptSoul] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [portraitOpen, setPortraitOpen] = useState(false)
  const [filmMemory, setFilmMemory] = useState<FilmMemory | null>(null)
  const [portraitRefreshedAt, setPortraitRefreshedAt] = useState<string | null>(null)
  const [directEdit, setDirectEdit] = useState<DirectEditState>({ field: null, value: '', saving: false })

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
      const { data: filmData } = await supabase.from('films').select('*').eq('id', filmId).single()
      if (!filmData) { router.push('/studio'); return }
      setFilm(filmData)
      const { data: msgData } = await supabase.from('messages').select('*').eq('film_id', filmId).order('created_at')
      if (msgData && msgData.length > 0) { setMessages(msgData); setEntryMode('conversation') }
      else setEntryMode('choice')
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const refreshPortrait = async () => {
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    setFilmMemory(memoryData)
    setPortraitRefreshedAt(new Date().toISOString())
  }

  const togglePortrait = async () => {
    if (!portraitOpen && !portraitRefreshedAt) await refreshPortrait()
    setPortraitOpen(p => !p)
  }

  const openingMessage = async (title: string) => {
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, messages: [], filmMemory: memoryData, sessionType: 'FIRST', filmTitle: title })
    })
    const data = await response.json()
    await supabase.from('messages').insert({ role: 'assistant', content: data.content, film_id: filmId })
    setMessages([{ id: 'opening', role: 'assistant', content: data.content }])
  }

  const beginFromConversation = async () => {
    setEntryMode('conversation')
    await openingMessage(film?.title || 'Untitled Film')
  }

  const handleScriptUpload = async (file: File) => {
    setUploadError(null)
    const wasInConversation = entryMode === 'conversation'
    if (!wasInConversation) setEntryMode('uploading')
    else setThinking(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('filmId', filmId)

    try {
      const response = await fetch('/api/parse-script', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok || data.error) {
        setUploadError(data.error || 'Something went wrong reading your script.')
        if (!wasInConversation) setEntryMode('choice')
        else setThinking(false)
        return
      }

      const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      const openingResponse = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmId, messages: [], filmMemory: freshMemory, sessionType: 'RETURNING', filmTitle: film?.title })
      })
      const openingData = await openingResponse.json()
      const openingText = openingData.content

      await supabase.from('messages').insert({ role: 'assistant', content: openingText, film_id: filmId })

      if (wasInConversation) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: openingText }])
        setThinking(false)
        await refreshPortrait()
        setPortraitOpen(true)
      } else {
        setScriptSoul(data.emotional_core)
        setEntryMode('soul')
        setTimeout(async () => {
          setMessages([{ id: 'opening', role: 'assistant', content: openingText }])
          setEntryMode('conversation')
          await refreshPortrait()
          setPortraitOpen(true)
        }, 3000)
      }
    } catch {
      setUploadError("The script couldn't be read. Try again — it's worth it.")
      if (!wasInConversation) setEntryMode('choice')
      else setThinking(false)
    }
  }

  const sendMessage = async (overrideText?: string) => {
    const t = (overrideText ?? input).trim()
    if (!t || thinking) return
    setInput('')
    setThinking(true)

    const userMessage = { role: 'user', content: t, film_id: filmId }
    await supabase.from('messages').insert(userMessage)
    const updated = [...messages, { id: Date.now().toString(), role: 'user', content: t }]
    setMessages(updated)

    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, messages: updated.map(m => ({ role: m.role, content: m.content })), filmMemory: memoryData, sessionType: 'RETURNING', filmTitle: film?.title })
    })
    const data = await response.json()

    await supabase.from('messages').insert({ role: 'assistant', content: data.content, film_id: filmId })
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }])

    if (data.memory) {
      const merged = mergeMemory(memoryData, data.memory)
      if (memoryData) await supabase.from('film_memory').update({ ...merged, updated_at: new Date().toISOString() }).eq('film_id', filmId)
      else await supabase.from('film_memory').insert({ ...merged, film_id: filmId })
      if (portraitOpen) await refreshPortrait()
    }

    setThinking(false)
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
    const { data: existing } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    let rawMemory: any = {}
    if (existing?.raw_memory) { try { rawMemory = JSON.parse(existing.raw_memory) } catch {} }
    const directEdits: any[] = rawMemory.direct_edits || []
    directEdits.push({ field: directEdit.field, edited_at: new Date().toISOString(), note: 'Added directly by the filmmaker.' })
    rawMemory.direct_edits = directEdits
    const payload: any = { [directEdit.field]: directEdit.value, raw_memory: JSON.stringify(rawMemory), updated_at: new Date().toISOString() }
    if (existing) await supabase.from('film_memory').update(payload).eq('film_id', filmId)
    else await supabase.from('film_memory').insert({ ...payload, film_id: filmId })
    setFilmMemory(prev => prev ? { ...prev, [directEdit.field!]: directEdit.value } : null)
    setDirectEdit({ field: null, value: '', saving: false })
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <main style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontFamily: serif, letterSpacing: '0.2em', fontSize: '0.85rem' }}>
      Setting the scene...
    </main>
  )

  // ── ENTRY SCREENS ──────────────────────────────────────────────────────────
  if (entryMode !== 'conversation') {
    return (
      <main style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: serif, color: text }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.75rem 2.5rem', borderBottom: `1px solid ${border}` }}>
          <span style={{ color: gold, letterSpacing: '0.3em', fontSize: '0.85rem' }}>MATINEE</span>
          <span style={{ color: textDim, fontSize: '0.8rem', fontStyle: 'italic' }}>{film?.title}</span>
        </nav>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {/* CHOICE */}
            {entryMode === 'choice' && (
              <>
                <p style={{ fontSize: '1.3rem', lineHeight: 1.8, color: text, textAlign: 'center', marginBottom: '0.6rem', fontWeight: 300 }}>
                  Where are you in this film's journey?
                </p>
                <p style={{ fontSize: '0.78rem', color: textFaint, textAlign: 'center', marginBottom: '3rem', letterSpacing: '0.03em', lineHeight: 1.6 }}>
                  How you arrive shapes how we begin.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <button
                    onClick={beginFromConversation}
                    style={{ ...btnSecondary, padding: '1.25rem 1.75rem', textAlign: 'left', width: '100%', lineHeight: 1.6 }}
                  >
                    <div style={{ fontSize: '0.9rem', color: text, marginBottom: '0.3rem' }}>I have an idea.</div>
                    <div style={{ fontSize: '0.72rem', color: textDim, letterSpacing: '0.04em' }}>Let's find the film together through conversation.</div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{ ...btnPrimary, padding: '1.25rem 1.75rem', textAlign: 'left', width: '100%', lineHeight: 1.6 }}
                  >
                    <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>I have a script.</div>
                    <div style={{ fontSize: '0.72rem', color: goldDim, letterSpacing: '0.04em' }}>Let Matinee read it first. PDF or Word document.</div>
                  </button>

                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScriptUpload(f) }} />
                </div>

                {uploadError && (
                  <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#7a3333', fontStyle: 'italic', textAlign: 'center' }}>{uploadError}</p>
                )}

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                  <span
                    onClick={async () => {
                      await supabase.from('messages').delete().eq('film_id', filmId)
                      await supabase.from('film_memory').delete().eq('film_id', filmId)
                      await supabase.from('films').delete().eq('id', filmId)
                      router.push('/studio')
                    }}
                    style={{ fontSize: '0.7rem', color: textFaint, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' }}
                  >
                    Cancel — return to the Studio
                  </span>
                </div>
              </>
            )}

            {/* UPLOADING */}
            {entryMode === 'uploading' && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.1rem', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  Reading your script...
                </p>
                <p style={{ fontSize: '0.75rem', color: textFaint, letterSpacing: '0.06em' }}>
                  Building the Film Memory. This takes a moment.
                </p>
              </div>
            )}

            {/* SOUL */}
            {entryMode === 'soul' && scriptSoul && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', color: goldDim, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                  What the film is becoming
                </p>
                <p style={{ fontSize: '1.4rem', lineHeight: 1.8, color: text, fontWeight: 300, marginBottom: '2.5rem' }}>
                  {scriptSoul}
                </p>
                <p style={{ fontSize: '0.72rem', color: textFaint, letterSpacing: '0.06em', fontStyle: 'italic' }}>
                  The Film Memory is built. Stepping into the Studio...
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    )
  }

  // ── MAIN STUDIO ────────────────────────────────────────────────────────────
  return (
    <main style={{ backgroundColor: bg, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: serif, color: text, overflow: 'hidden' }}>

      {/* NAV — simplified */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2.5rem', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
        <span onClick={() => router.push('/studio')} style={{ color: gold, letterSpacing: '0.3em', fontSize: '0.85rem', cursor: 'pointer' }}>
          MATINEE
        </span>

        {/* Film title — center, editable */}
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={async (e) => {
            const newTitle = e.currentTarget.textContent?.trim()
            if (!newTitle || newTitle === film?.title) return
            setFilm(prev => prev ? { ...prev, title: newTitle } : null)
            await supabase.from('films').update({ title: newTitle }).eq('id', filmId)
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
          style={{ color: textDim, fontSize: '0.82rem', fontStyle: 'italic', outline: 'none', cursor: 'text', borderBottom: '1px solid transparent', transition: 'border-color 0.2s', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}
          onFocus={e => (e.currentTarget.style.borderBottomColor = borderMid)}
          onBlurCapture={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
        >
          {film?.title}
        </span>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ ...btnSecondary, fontSize: '0.68rem', cursor: 'pointer', display: 'inline-block' }}>
            UPLOAD SCRIPT
            <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value = ''; handleScriptUpload(f) } }} />
          </label>
          <button
            onClick={togglePortrait}
            style={{ ...portraitOpen ? btnPrimary : btnSecondary, fontSize: '0.68rem' }}
          >
            FILM PORTRAIT
          </button>
        </div>
      </nav>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* CONVERSATION */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'assistant' ? (
                    <p style={{ fontSize: '1.15rem', lineHeight: '1.9', color: text, fontWeight: 300 }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: `1px solid ${border}` }}>
                      <p style={{ fontSize: '0.9rem', lineHeight: '1.75', color: '#5a5a5a' }}>
                        {msg.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* THINKING — animated dots */}
              {thinking && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', paddingTop: '0.25rem' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      backgroundColor: goldDim, display: 'inline-block',
                      animation: 'matineePulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`
                    }} />
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* INPUT */}
          <div style={{ borderTop: `1px solid ${border}`, padding: '1.25rem 3rem 1.75rem', flexShrink: 0 }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Speak..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: text, fontSize: '0.95rem', outline: 'none', fontFamily: serif }}
              />
              <span
                onClick={() => sendMessage()}
                style={{ color: input.trim() ? gold : textFaint, cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.2s' }}
              >
                →
              </span>
            </div>
          </div>
        </div>

        {/* FILM PORTRAIT PANEL */}
        <div style={{
          width: portraitOpen ? '360px' : '0px', overflow: 'hidden',
          transition: 'width 0.3s ease', borderLeft: portraitOpen ? `1px solid ${border}` : 'none',
          flexShrink: 0, display: 'flex', flexDirection: 'column'
        }}>
          {portraitOpen && (
            <div style={{ width: '360px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* PORTRAIT HEADER */}
              <div style={{ padding: '1.25rem 1.75rem 1rem', borderBottom: `1px solid ${border}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: goldDim, textTransform: 'uppercase' }}>
                    Film Portrait
                  </span>
                </div>
                {portraitRefreshedAt && (
                  <p style={{ fontSize: '0.6rem', color: textFaint, letterSpacing: '0.03em' }}>
                    Last updated {formatDate(portraitRefreshedAt)}
                  </p>
                )}
              </div>

              {/* PORTRAIT FIELDS */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.5rem 2rem 1.75rem' }}>
                {!filmMemory ? (
                  <p style={{ color: textFaint, fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.7 }}>
                    The portrait is still taking shape. Keep the conversation going and it will fill in.
                  </p>
                ) : (
                  FIELDS.map((field, idx) => {
                    const value = filmMemory[field.key]
                    const isEmpty = isFieldEmpty(value)
                    const isEditing = directEdit.field === field.key

                    return (
                      <div key={field.key}>
                        <div style={{ marginBottom: '1.75rem' }}>
                          <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: goldDim, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                            {field.label}
                          </p>

                          {isEmpty ? (
                            <div style={{ borderLeft: `1px solid ${border}`, paddingLeft: '0.75rem' }}>
                              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: textFaint, fontStyle: 'italic', marginBottom: '0.75rem' }}>
                                {field.question}
                              </p>
                              {isEditing ? (
                                <div>
                                  <textarea
                                    value={directEdit.value}
                                    onChange={e => setDirectEdit(prev => ({ ...prev, value: e.target.value }))}
                                    placeholder="Write here..."
                                    style={{
                                      width: '100%', background: 'transparent',
                                      border: 'none', borderBottom: `1px solid ${borderMid}`,
                                      color: text, fontFamily: serif, fontSize: '0.82rem',
                                      lineHeight: 1.6, padding: '0.4rem 0',
                                      resize: 'vertical', minHeight: '70px',
                                      outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box'
                                    }}
                                  />
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={saveDirectEdit} disabled={directEdit.saving} style={{ ...btnSmall, borderColor: goldDim, color: gold }}>
                                      {directEdit.saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button onClick={() => setDirectEdit({ field: null, value: '', saving: false })} style={btnSmall}>Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button onClick={() => exploreWithMatinee(field.prompt)} style={{ ...btnSmall, borderColor: goldDim, color: gold }}>
                                    Explore with Matinee
                                  </button>
                                  <button onClick={() => openDirectEdit(field.key)} style={btnSmall}>
                                    Write directly
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.875rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap' }}>
                              {renderFieldValue(field.key, value)}
                            </p>
                          )}
                        </div>

                        {idx < FIELDS.length - 1 && (
                          <div style={{ height: '1px', background: border, marginBottom: '1.75rem' }} />
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

      {/* PULSE ANIMATION */}
      <style>{`
        @keyframes matineePulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </main>
  )
}