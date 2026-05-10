'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = { id: string; role: string; content: string }
type GateClosed = {
  gate: GateId
  closed_at?: string
  status?: 'reopened'
  last_closed_at?: string
  ripple?: GateId[]
  ripple_dismissed?: GateId[]
}
type GateId = 'film_brief' | 'treatment' | 'department_briefs' | 'mode_selection_brief' | 'hook_draft' | 'script_lock' | 'audio_direction' | 'consistency_lock' | 'shot_list' | 'camera_light_plan' | 'visual_prompt_package' | 'edit_plan' | 'music_cue_sheet'
type PortraitField = {
  value: string
  created_by: string
  created_in_mode: string
  updated_at: string
}

type UnresolvedQuestion = {
  question: string
  category: 'Historical' | 'Narrative' | 'Strategic'
  added_at: string
  resolved?: boolean
  resolved_at?: string
}

type PortraitUnresolvedField = {
  value: UnresolvedQuestion[]
  created_by: string
  created_in_mode: string
  updated_at: string
  history?: Array<{
    questions_added?: UnresolvedQuestion[]
    question_resolved?: UnresolvedQuestion
    changed_by: string
    changed_at: string
  }>
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
  portrait_logline?:              PortraitField | null
  portrait_emotional_core?:       PortraitField | null
  portrait_story?:                PortraitField | null
  portrait_world?:                PortraitField | null
  portrait_subjects?:             PortraitField | null
  portrait_themes?:               PortraitField | null
  portrait_approach?:             PortraitField | null
  portrait_tone?:                 PortraitField | null
  portrait_visual_world?:         PortraitField | null
  portrait_audience?:             PortraitField | null
  portrait_directors_intent?:     PortraitField | null
  portrait_unresolved_questions?: PortraitUnresolvedField | null
  portrait_comparable_films?:     PortraitField | null
  portrait_target_length?:        PortraitField | null
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


const PORTRAIT_FIELDS: Array<{
  key: keyof FilmMemory;
  label: string;
  question: string;
  special?: 'directors_intent' | 'unresolved_questions';
}> = [
  { key: 'portrait_logline', label: 'The Logline', question: 'What is this film, in one sentence?' },
  { key: 'portrait_emotional_core', label: 'The Emotional Core', question: "What does this film do to an audience — not what it's about, but what it makes them feel?" },
  { key: 'portrait_story', label: 'The Story', question: 'Where does it begin, where does it turn, and where does it end?' },
  { key: 'portrait_world', label: 'The World', question: 'Where does this film live — physically, atmospherically, historically?' },
  { key: 'portrait_subjects', label: 'The Subjects', question: 'Who are the people at the centre of this film, and why do they matter?' },
  { key: 'portrait_themes', label: 'The Themes', question: 'What does this film argue — beneath the story, beneath the subject?' },
  { key: 'portrait_approach', label: 'The Approach', question: 'How are you telling this — observation, testimony, reconstruction, something else?' },
  { key: 'portrait_tone', label: 'The Tone', question: 'What is the emotional temperature of this film?' },
  { key: 'portrait_visual_world', label: 'The Visual World', question: 'What does this film look like — light, palette, camera relationship?' },
  { key: 'portrait_audience', label: 'The Audience', question: 'Who is this for, and where will they watch it?' },
  { key: 'portrait_directors_intent', label: "The Director's Intent", question: 'In your own words — what are you trying to make, and why does it matter to you?', special: 'directors_intent' },
  { key: 'portrait_unresolved_questions', label: 'Unresolved Questions', question: 'No open questions yet. They will surface as the film develops.', special: 'unresolved_questions' },
  { key: 'portrait_comparable_films', label: 'Comparable Films', question: 'Which films — in tone, approach, or visual world — does this feel closest to?' },
  { key: 'portrait_target_length', label: 'Target Length', question: 'How long should this film be?' },
]

const ARCHIVE_DOCUMENTS = [
  { mode: 'producer', label: 'Film Brief', gateId: 'film_brief' as GateId },
  { mode: 'director', label: 'Treatment', gateId: 'treatment' as GateId },
  { mode: 'director', label: 'Department Briefs', gateId: 'department_briefs' as GateId },
  { mode: 'narrator', label: 'Mode Selection Brief', gateId: 'mode_selection_brief' as GateId },
  { mode: 'narrator', label: 'Hook Draft', gateId: 'hook_draft' as GateId },
  { mode: 'narrator', label: 'Script Lock', gateId: 'script_lock' as GateId },
  { mode: 'narrator', label: 'Audio Direction', gateId: 'audio_direction' as GateId },
  { mode: 'cinematographer', label: 'Consistency Lock', gateId: 'consistency_lock' as GateId },
  { mode: 'cinematographer', label: 'Shot List', gateId: 'shot_list' as GateId },
  { mode: 'cinematographer', label: 'Camera & Light Plan', gateId: 'camera_light_plan' as GateId },
  { mode: 'ai_specialist', label: 'Visual Prompt Package', gateId: 'visual_prompt_package' as GateId },
  { mode: 'editor', label: 'Edit Plan', gateId: 'edit_plan' as GateId },
  { mode: 'editor', label: 'Music Cue Sheet', gateId: 'music_cue_sheet' as GateId },
] as const

const GATE_LABELS: Record<GateId, string> = {
  film_brief:          'Film Brief',
  treatment:           'Treatment',
  department_briefs:   'Department Briefs',
  mode_selection_brief:'Mode Selection Brief',
  hook_draft:          'Hook Draft',
  script_lock:         'Script Lock',
  audio_direction:     'Audio Direction',
  consistency_lock:    'Consistency Lock',
  shot_list:           'Shot List',
  camera_light_plan:   'Camera & Light Plan',
  visual_prompt_package:'Visual Prompt Package',
  edit_plan:           'Edit Plan',
  music_cue_sheet:     'Music Cue Sheet',
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function isFieldEmpty(value: unknown): boolean {
  if (!value) return true
  // JSONB portrait field objects
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value: unknown }).value
    if (!inner) return true
    if (typeof inner === 'string' && inner.trim() === '') return true
    if (Array.isArray(inner) && inner.length === 0) return true
    return false
  }
  // Legacy string handling
  if (typeof value === 'string') {
    const t = value.trim()
    if (t.length < 5) return true
    if (EMPTY_PHRASES.includes(t.toLowerCase())) return true
  }
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function getPortraitValue(raw: unknown): string | Array<{ question: string; category: string; added_at: string }> | null {
  if (!raw || typeof raw !== 'object') return null
  const field = raw as { value?: unknown }
  if (!field.value) return null
  return field.value as string | Array<{ question: string; category: string; added_at: string }>
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

function mergeFilmakersWords(nw?: string, ew?: string): string {
  if (!ew) return nw ?? ''
  if (!nw) return ew
  const existingPhrases = ew.split('|').map(p => p.trim()).filter(Boolean)
  const newPhrases = nw.split('|').map(p => p.trim()).filter(Boolean)
  for (const phrase of newPhrases) {
    if (!existingPhrases.some(p => p.toLowerCase().includes(phrase.toLowerCase()) || phrase.toLowerCase().includes(p.toLowerCase()))) {
      existingPhrases.push(phrase)
    }
  }
  return existingPhrases.join(' | ')
}

function appendHistory(
  existingField: { value?: string; created_by?: string; updated_at?: string; history?: Array<{ previous_value: string; changed_by: string; changed_at: string }> } | null | undefined
): Array<{ previous_value: string; changed_by: string; changed_at: string }> {
  const existingHistory = existingField?.history ?? [];
  if (!existingField?.value) return existingHistory;
  return [
    ...existingHistory,
    {
      previous_value: existingField.value,
      changed_by: existingField.created_by ?? 'unknown',
      changed_at: existingField.updated_at ?? new Date().toISOString(),
    },
  ];
}

async function mergeMemory(
  extracted: any,
  portrait: any,
  existing: FilmMemory,
  filmId: string,
  supabase: any
) {
  const longer = (a?: string, b?: string) =>
    (a?.length ?? 0) >= (b?.length ?? 0) ? a : b

  const mergedMemory = {
    emotional_core:     longer(extracted?.emotional_core,     existing?.emotional_core),
    decisions_made:     longer(extracted?.decisions_made,     existing?.decisions_made),
    unresolved_threads: longer(extracted?.unresolved_threads, existing?.unresolved_threads),
    characters: (JSON.stringify(extracted?.characters)?.length ?? 0) >=
                (JSON.stringify(existing?.characters)?.length ?? 0)
                ? extracted?.characters : existing?.characters,
    filmmakers_words: mergeFilmakersWords(extracted?.filmmakers_words, existing?.filmmakers_words),
    updated_at: new Date().toISOString(),
  }

  const portraitUpdates: Record<string, any> = {}
  const now = new Date().toISOString()

  const PORTRAIT_TEXT_FIELDS = [
    'portrait_logline',
    'portrait_emotional_core',
    'portrait_story',
    'portrait_world',
    'portrait_subjects',
    'portrait_themes',
    'portrait_approach',
    'portrait_tone',
    'portrait_visual_world',
    'portrait_audience',
    'portrait_comparable_films',
    'portrait_target_length',
  ]

  for (const field of PORTRAIT_TEXT_FIELDS) {
    const extracted_value = portrait?.[field]
    if (!extracted_value) continue

    const existing_field = (existing as any)?.[field]

    if (!existing_field) {
      portraitUpdates[field] = {
        value: extracted_value,
        created_by: 'studio',
        created_in_mode: 'discovery',
        updated_at: now,
      }
    } else {
      const existing_value = existing_field?.value ?? ''
      if (extracted_value.length > existing_value.length) {
        portraitUpdates[field] = {
          value: extracted_value,
          created_by: 'studio',
          created_in_mode: 'discovery',
          updated_at: now,
          history: appendHistory(existing_field),
        }
      }
    }
  }

  const extracted_questions = portrait?.portrait_unresolved_questions
  if (extracted_questions && Array.isArray(extracted_questions) && extracted_questions.length > 0) {
    const existingQField = (existing as any)?.portrait_unresolved_questions
    const existingQuestions: Array<{ question: string; category: string; added_at: string }> =
      existingQField?.value ?? []
    const toAdd = extracted_questions.filter(
      (nq: { question: string }) => !existingQuestions.some(eq => eq.question === nq.question)
    )
    if (toAdd.length > 0 || !existingQField) {
      const updatedHistory = toAdd.length > 0
        ? [...(existingQField?.history ?? []), {
            questions_added: toAdd,
            changed_by: 'studio',
            changed_at: new Date().toISOString(),
          }]
        : (existingQField?.history ?? [])
      portraitUpdates['portrait_unresolved_questions'] = {
        value: [...existingQuestions, ...toAdd],
        created_by: 'studio',
        created_in_mode: 'discovery',
        updated_at: now,
        history: updatedHistory,
      }
    }
  }

  await supabase
    .from('film_memory')
    .update({ ...mergedMemory, ...portraitUpdates })
    .eq('film_id', filmId)
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function FilmStudio() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [film, setFilm] = useState<{
    title: string
    current_mode: string | null
    gates_closed: GateClosed[]
    documents_generated: { document: GateId; generated_at: string }[]
    documents_content: Partial<Record<GateId, string>>
  } | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>('conversation')
  const [scriptSoul, setScriptSoul] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [portraitOpen, setPortraitOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [openDocument, setOpenDocument] = useState<GateId | null>(null)
  const [generating, setGenerating] = useState<GateId | null>(null)
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
    setPortraitOpen(prev => !prev)
    setArchiveOpen(false)
  }

  const openingMessage = async (title: string) => {
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, messages: [], filmMemory: memoryData, sessionType: 'FIRST', filmTitle: title, currentMode: film?.current_mode ?? null })
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
        body: JSON.stringify({ filmId, messages: [], filmMemory: freshMemory, sessionType: 'RETURNING', filmTitle: film?.title, currentMode: film?.current_mode ?? null })
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
      body: JSON.stringify({ filmId, messages: updated.map(m => ({ role: m.role, content: m.content })), filmMemory: memoryData, sessionType: 'RETURNING', filmTitle: film?.title, currentMode: film?.current_mode ?? null })
    })
    const data = await response.json()

    await supabase.from('messages').insert({ role: 'assistant', content: data.content, film_id: filmId })
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content }])

    if (data.memory) {
      if (memoryData) {
        const portraitToMerge = film?.current_mode ? {} : (data.portrait ?? {})
        await mergeMemory(data.memory, portraitToMerge, memoryData, filmId, supabase)
      } else {
        await supabase.from('film_memory').insert({ ...data.memory, film_id: filmId, updated_at: new Date().toISOString() })
      }
      if (portraitOpen) await refreshPortrait()
    }

    setThinking(false)
  }

  const exploreWithMatinee = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const isPortraitField = (field: string) => field.startsWith('portrait_')

  const openDirectEdit = (field: string) => {
    const raw = filmMemory ? (filmMemory as any)[field] : null
    let current = ''
    if (isPortraitField(field)) {
      const v = getPortraitValue(raw)
      current = typeof v === 'string' ? v : ''
    } else {
      current = filmMemory ? renderFieldValue(field, raw) : ''
    }
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

    const now = new Date().toISOString()
    let fieldValue: any
    let optimisticValue: any

    if (isPortraitField(directEdit.field)) {
      fieldValue = {
        value: directEdit.value,
        created_by: 'filmmaker',
        created_in_mode: 'direct',
        updated_at: now,
        history: appendHistory(existing?.[directEdit.field]),
      }
      optimisticValue = fieldValue
    } else {
      fieldValue = directEdit.value
      optimisticValue = directEdit.value
    }

    const payload: any = { [directEdit.field]: fieldValue, raw_memory: JSON.stringify(rawMemory), updated_at: now }
    if (existing) await supabase.from('film_memory').update(payload).eq('film_id', filmId)
    else await supabase.from('film_memory').insert({ ...payload, film_id: filmId })
    setFilmMemory(prev => prev ? { ...prev, [directEdit.field!]: optimisticValue } : null)
    setDirectEdit({ field: null, value: '', saving: false })
  }

  const resolveQuestion = async (targetAddedAt: string) => {
    const { data: existingRow, error: fetchError } = await supabase
      .from('film_memory')
      .select('*')
      .eq('film_id', filmId)
      .single()

    if (fetchError || !existingRow) {
      console.error('resolveQuestion: failed to fetch existing row', fetchError)
      return
    }

    const existingField: PortraitUnresolvedField | null =
      existingRow.portrait_unresolved_questions ?? null

    if (!existingField) return

    const updatedQuestions = existingField.value.map((q: UnresolvedQuestion) =>
      q.added_at === targetAddedAt
        ? { ...q, resolved: true, resolved_at: new Date().toISOString() }
        : q
    )

    const resolvedQuestion = existingField.value.find(
      (q: UnresolvedQuestion) => q.added_at === targetAddedAt
    )

    const updatedHistory = [
      ...(existingField.history ?? []),
      {
        question_resolved: resolvedQuestion,
        changed_by: 'filmmaker',
        changed_at: new Date().toISOString(),
      },
    ]

    const updatedField: PortraitUnresolvedField = {
      ...existingField,
      value: updatedQuestions,
      updated_at: new Date().toISOString(),
      history: updatedHistory,
    }

    const { error: writeError } = await supabase
      .from('film_memory')
      .update({ portrait_unresolved_questions: updatedField })
      .eq('film_id', filmId)

    if (writeError) {
      console.error('resolveQuestion: failed to write', writeError)
      return
    }

    await refreshPortrait()
  }

  const approveGate = async (gateId: GateId) => {
    const newGate: GateClosed = { gate: gateId, closed_at: new Date().toISOString() }
    const existing = film?.gates_closed ?? []
    const updated = existing.some(g => g.gate === gateId)
      ? existing.map(g => g.gate === gateId ? newGate : g)
      : [...existing, newGate]
    await supabase.from('films').update({ gates_closed: updated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, gates_closed: updated } : null)
  }

  const reopenGate = async (gateId: GateId) => {
    const currentGate = film?.gates_closed?.find(g => g.gate === gateId)
    if (!currentGate?.closed_at) return

    const lastClosedAt = currentGate.closed_at

    const affected = (film?.documents_generated ?? [])
      .filter(d => d.generated_at > lastClosedAt && d.document !== gateId)
      .map(d => d.document as GateId)

    const enrichedEntry: GateClosed = {
      gate: gateId,
      status: 'reopened',
      last_closed_at: lastClosedAt,
      ripple: affected,
      ripple_dismissed: [],
    }

    const updated = (film?.gates_closed ?? []).map(g =>
      g.gate === gateId ? enrichedEntry : g
    )

    await supabase.from('films').update({ gates_closed: updated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, gates_closed: updated } : null)
  }

  const dismissRippleFlag = async (gateId: GateId, documentId: GateId) => {
    const updated = (film?.gates_closed ?? []).map(g => {
      if (g.gate !== gateId || g.status !== 'reopened') return g
      return {
        ...g,
        ripple_dismissed: [...(g.ripple_dismissed ?? []), documentId],
      }
    })
    await supabase.from('films').update({ gates_closed: updated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, gates_closed: updated } : null)
  }

  const getActiveRippleFlag = (documentId: GateId): GateId | null => {
    for (const gate of film?.gates_closed ?? []) {
      if (
        gate.status === 'reopened' &&
        gate.ripple?.includes(documentId) &&
        !gate.ripple_dismissed?.includes(documentId)
      ) {
        return gate.gate
      }
    }
    return null
  }

  const generateDocument = async (gateId: GateId, owningMode: string) => {
    setGenerating(gateId)
    try {
      const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      const docLabel = ARCHIVE_DOCUMENTS.find(d => d.gateId === gateId)?.label ?? gateId

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filmId,
          messages: [{ role: 'user', content: `Produce the ${docLabel}.` }],
          filmMemory: memoryData,
          sessionType: 'RETURNING',
          filmTitle: film?.title,
          currentMode: owningMode,
          gatesClosed: film?.gates_closed ?? [],
        })
      })

      const data = await response.json()

      const updatedContent = { ...(film?.documents_content ?? {}), [gateId]: data.content }
      const newGenerated = { document: gateId, generated_at: new Date().toISOString() }
      const updatedGenerated = [...(film?.documents_generated ?? []), newGenerated]

      await supabase.from('films').update({
        documents_content: updatedContent,
        documents_generated: updatedGenerated,
      }).eq('id', filmId)

      setFilm(prev => prev ? {
        ...prev,
        documents_content: updatedContent,
        documents_generated: updatedGenerated,
      } : null)

      setOpenDocument(gateId)
    } finally {
      setGenerating(null)
    }
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

                  {!film?.current_mode && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ ...btnPrimary, padding: '1.25rem 1.75rem', textAlign: 'left', width: '100%', lineHeight: 1.6 }}
                      >
                        <div style={{ fontSize: '0.9rem', marginBottom: '0.3rem' }}>I have a script.</div>
                        <div style={{ fontSize: '0.72rem', color: goldDim, letterSpacing: '0.04em' }}>Let Matinee read it first. PDF or Word document.</div>
                      </button>
                      <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleScriptUpload(f) }} />
                    </>
                  )}
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
          {!film?.current_mode && (
            <label style={{ ...btnSecondary, fontSize: '0.68rem', cursor: 'pointer', display: 'inline-block' }}>
              UPLOAD SCRIPT
              <input type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value = ''; handleScriptUpload(f) } }} />
            </label>
          )}
          <button
            onClick={togglePortrait}
            style={{ ...portraitOpen ? btnPrimary : btnSecondary, fontSize: '0.68rem' }}
          >
            FILM PORTRAIT
          </button>
          <button
            onClick={() => { setArchiveOpen(prev => !prev); setPortraitOpen(false) }}
            style={{ ...archiveOpen ? btnPrimary : btnSecondary, fontSize: '0.68rem' }}
          >
            ARCHIVE
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
                  PORTRAIT_FIELDS.map((field, idx) => {
                    const raw = filmMemory[field.key]
                    const isEmpty = isFieldEmpty(raw)
                    const value = getPortraitValue(raw)
                    const isEditing = directEdit.field === field.key

                    return (
                      <div key={field.key}>
                        <div style={{ marginBottom: '1.75rem' }}>
                          <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: goldDim, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                            {field.label}
                          </p>

                          {isEmpty ? (
                            <div style={{ borderLeft: `1px solid ${border}`, paddingLeft: '0.75rem' }}>
                              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: textFaint, fontStyle: 'italic', marginBottom: field.special === 'directors_intent' ? '0.75rem' : 0 }}>
                                {field.question}
                              </p>
                              {field.special === 'directors_intent' && (
                                isEditing ? (
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
                                  <button onClick={() => openDirectEdit(field.key)} style={{ ...btnSmall, borderColor: goldDim, color: gold }}>
                                    Write your intent
                                  </button>
                                )
                              )}
                            </div>
                          ) : (
                            <>
                              {field.special === 'unresolved_questions' && Array.isArray(value) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {(value as Array<{ question: string; category: string; added_at: string }>).map(item => (
                                    <div key={item.added_at} style={{ borderLeft: `1px solid ${border}`, paddingLeft: '0.75rem' }}>
                                      <p style={{ fontSize: '0.875rem', lineHeight: 1.75, color: '#a8a098', margin: 0 }}>{item.question}</p>
                                      <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: goldDim, textTransform: 'uppercase' }}>{item.category}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : field.special === 'directors_intent' ? (
                                <>
                                  <p style={{ fontSize: '0.875rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap', marginBottom: '0.6rem' }}>
                                    {typeof value === 'string' ? value : ''}
                                  </p>
                                  {isEditing ? (
                                    <div>
                                      <textarea
                                        value={directEdit.value}
                                        onChange={e => setDirectEdit(prev => ({ ...prev, value: e.target.value }))}
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
                                    <button onClick={() => openDirectEdit(field.key)} style={btnSmall}>Edit</button>
                                  )}
                                </>
                              ) : (
                                <p style={{ fontSize: '0.875rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap' }}>
                                  {typeof value === 'string' ? value : ''}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {idx < PORTRAIT_FIELDS.length - 1 && (
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

        {/* ARCHIVE PANEL */}
        <div style={{
          width: archiveOpen ? '360px' : '0px',
          flexShrink: 0,
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          borderLeft: archiveOpen ? '1px solid rgba(212, 175, 55, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}>
          {archiveOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* ARCHIVE HEADER */}
              <div style={{ flexShrink: 0, padding: '1.5rem', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(212, 175, 55, 0.5)' }}>
                  The Archive
                </div>
              </div>

              {/* ARCHIVE CONTENT */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>

                {/* Discovery state */}
                {!film?.current_mode && (
                  <div style={{ padding: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.73rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                    Production documents are generated in production modes. Enter a mode to begin.
                  </div>
                )}

                {/* Production state */}
                {film?.current_mode && (
                  <>
                    <div style={{ padding: '0 1.5rem 0.75rem', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      Generate opens a conversation with this mode. The document arrives when the film is ready.
                    </div>
                    {(['producer', 'director', 'narrator', 'cinematographer', 'ai_specialist', 'editor'] as const).map(mode => (
                      <div key={mode} style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.35)', padding: '0.5rem 1.5rem' }}>
                          {mode.replace('_', ' ')}
                        </div>
                        {ARCHIVE_DOCUMENTS.filter(d => d.mode === mode).map(doc => {
                          const isGenerated = film.documents_generated?.some(d => d.document === doc.gateId)
                          const isApproved = film.gates_closed?.some(g => g.gate === doc.gateId && g.status !== 'reopened')
                          const activeFlag = getActiveRippleFlag(doc.gateId)

                          return (
                            <div key={doc.gateId} style={{ padding: '0.55rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                                {/* Document name */}
                                {isGenerated ? (
                                  <span
                                    onClick={() => setOpenDocument(doc.gateId)}
                                    style={{ fontSize: '0.76rem', color: isApproved ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.72)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(212,175,55,0.25)' }}
                                  >
                                    {doc.label}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.18)', fontStyle: 'italic' }}>
                                    {doc.label}
                                  </span>
                                )}

                                {/* Action button */}
                                {!isGenerated && (
                                  <button
                                    onClick={() => generateDocument(doc.gateId, doc.mode)}
                                    disabled={generating === doc.gateId}
                                    style={{ fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.55)', background: 'none', border: '1px solid rgba(212,175,55,0.2)', padding: '0.28rem 0.6rem', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    {generating === doc.gateId ? '...' : 'Generate'}
                                  </button>
                                )}
                                {isGenerated && !isApproved && (
                                  <button
                                    onClick={() => approveGate(doc.gateId)}
                                    style={{ fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0a0a0a', background: 'rgba(212,175,55,0.85)', border: 'none', padding: '0.28rem 0.6rem', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    Approve
                                  </button>
                                )}
                                {isApproved && (
                                  <button
                                    onClick={() => reopenGate(doc.gateId)}
                                    style={{ fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.45)', background: 'none', border: '1px solid rgba(212,175,55,0.18)', padding: '0.28rem 0.6rem', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    Reopen
                                  </button>
                                )}
                              </div>

                              {/* Ripple flag */}
                              {activeFlag && (
                                <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.68rem', color: 'rgba(251,191,36,0.7)' }}>
                                  <span>Built before the {GATE_LABELS[activeFlag]} was revised. Worth a look.</span>
                                  <button
                                    onClick={() => dismissRippleFlag(activeFlag, doc.gateId)}
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(251,191,36,0.5)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.68rem', fontFamily: serif }}
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </>
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

      {/* DOCUMENT OVERLAY */}
      {openDocument && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: '#0f0f0f', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '2.5rem 3rem', position: 'relative', border: '1px solid rgba(212,175,55,0.12)' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.45)', marginBottom: '2rem' }}>
              {ARCHIVE_DOCUMENTS.find(d => d.gateId === openDocument)?.label}
            </div>
            <div style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'rgba(255,255,255,0.72)', whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
              {film?.documents_content?.[openDocument] ?? ''}
            </div>
            <button
              onClick={() => setOpenDocument(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: '1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}