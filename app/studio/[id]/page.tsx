'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = {
  id: string
  role: string
  content: string
}

export default function FilmStudio() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [film, setFilm] = useState<{ title: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
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
      } else {
        await openingMessage(filmData.title)
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

  const sendMessage = async () => {
    if (!input.trim() || thinking) return
    const userText = input.trim()
    setInput('')
    setThinking(true)

    const userMessage = { role: 'user', content: userText, film_id: filmId }
    await supabase.from('messages').insert(userMessage)
    const updatedMessages = [...messages, { id: Date.now().toString(), role: 'user', content: userText }]
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
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }])

    if (data.memory) {
      const { data: existing } = await supabase
        .from('film_memory').select('id').eq('film_id', filmId).single()
      if (existing) {
        await supabase.from('film_memory').update({ ...data.memory, updated_at: new Date().toISOString() }).eq('film_id', filmId)
      } else {
        await supabase.from('film_memory').insert({ ...data.memory, film_id: filmId })
      }
    }

    setThinking(false)
  }

  if (loading) return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontFamily: 'Georgia, serif', letterSpacing: '0.2em' }}>
      Setting the scene...
    </main>
  )

  return (
    <main style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Georgia, serif', color: '#e8e0d0' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 3rem', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <span style={{ color: '#c9a96e', letterSpacing: '0.3em', fontSize: '0.85rem' }}>MATINEE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>{film?.title}</span>
          <span onClick={() => router.push('/studio')} style={{ color: '#555', fontSize: '0.75rem', cursor: 'pointer', letterSpacing: '0.1em' }}>THE STUDIO</span>
        </div>
      </nav>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4rem 3rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <p style={{
                fontSize: msg.role === 'assistant' ? '1.2rem' : '0.95rem',
                lineHeight: '1.8',
                color: msg.role === 'assistant' ? '#e8e0d0' : '#888',
                maxWidth: msg.role === 'user' ? '60%' : '100%',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}>
                {msg.content}
              </p>
            </div>
          ))}
          {thinking && (
            <p style={{ color: '#444', fontSize: '0.9rem', fontStyle: 'italic' }}>...</p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1a1a1a', padding: '1.5rem 3rem', flexShrink: 0 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Speak..."
            style={{ flex: 1, background: 'transparent', border: 'none', color: '#e8e0d0', fontSize: '1rem', outline: 'none', fontFamily: 'Georgia, serif' }}
          />
          <span onClick={sendMessage} style={{ color: '#555', cursor: 'pointer', fontSize: '1.2rem' }}>→</span>
        </div>
      </div>
    </main>
  )
}