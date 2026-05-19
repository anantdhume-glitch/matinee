'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
  FileText, Clapperboard, LayoutList, Radio, Anchor,
  ScrollText, Mic, Lock, List, LayoutTemplate,
  Aperture, Sparkles, Scissors, Music
} from 'lucide-react'

type Message = { id: string; role: string; content: string }
type GateClosed = {
  gate: GateId
  closed_at?: string
  status?: 'reopened'
  last_closed_at?: string
  ripple?: GateId[]
  ripple_dismissed?: GateId[]
  cleared_by?: 'matinee_work' | 'import'
  imported_document?: string
  confirmed_by_filmmaker_at?: string
}
type DocumentGenerated = {
  document: GateId
  generated_at: string
  source?: 'import'
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

// ── BUTTON STYLES ─────────────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--gold)', color: 'var(--gold)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.12em',
  cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s'
}
const btnSecondary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s'
}
const btnSmall: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)',
  padding: '4px 10px', fontSize: '0.62rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s'
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

const GATE_PREREQUISITES: Partial<Record<GateId, GateId>> = {
  treatment:            'film_brief',
  department_briefs:    'treatment',
  mode_selection_brief: 'department_briefs',
  hook_draft:           'mode_selection_brief',
  script_lock:          'hook_draft',
  audio_direction:      'script_lock',
}

const GATE_ICON_MAP: Record<GateId, React.ReactNode> = {
  film_brief:            <FileText size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  treatment:             <Clapperboard size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  department_briefs:     <LayoutList size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  mode_selection_brief:  <Radio size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  hook_draft:            <Anchor size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  script_lock:           <ScrollText size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  audio_direction:       <Mic size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  consistency_lock:      <Lock size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  shot_list:             <List size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  camera_light_plan:     <Aperture size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  visual_prompt_package: <Sparkles size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  edit_plan:             <Scissors size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
  music_cue_sheet:       <Music size={10} color="var(--text-dim)" style={{ flexShrink: 0 }} />,
}

const ARCHIVE_ICON_MAP: Record<GateId, (color: string) => React.ReactNode> = {
  film_brief:            (c) => <FileText size={12} color={c} style={{ flexShrink: 0 }} />,
  treatment:             (c) => <Clapperboard size={12} color={c} style={{ flexShrink: 0 }} />,
  department_briefs:     (c) => <LayoutList size={12} color={c} style={{ flexShrink: 0 }} />,
  mode_selection_brief:  (c) => <Radio size={12} color={c} style={{ flexShrink: 0 }} />,
  hook_draft:            (c) => <Anchor size={12} color={c} style={{ flexShrink: 0 }} />,
  script_lock:           (c) => <ScrollText size={12} color={c} style={{ flexShrink: 0 }} />,
  audio_direction:       (c) => <Mic size={12} color={c} style={{ flexShrink: 0 }} />,
  consistency_lock:      (c) => <Lock size={12} color={c} style={{ flexShrink: 0 }} />,
  shot_list:             (c) => <List size={12} color={c} style={{ flexShrink: 0 }} />,
  camera_light_plan:     (c) => <Aperture size={12} color={c} style={{ flexShrink: 0 }} />,
  visual_prompt_package: (c) => <Sparkles size={12} color={c} style={{ flexShrink: 0 }} />,
  edit_plan:             (c) => <Scissors size={12} color={c} style={{ flexShrink: 0 }} />,
  music_cue_sheet:       (c) => <Music size={12} color={c} style={{ flexShrink: 0 }} />,
}

const MODES: Array<{ label: string; value: string | null }> = [
  { label: 'DISCOVERY',      value: null },
  { label: 'PRODUCER',       value: 'producer' },
  { label: 'DIRECTOR',       value: 'director' },
  { label: 'NARRATOR',       value: 'narrator' },
  { label: 'CINEMATOGRAPHER',value: 'cinematographer' },
  { label: 'AI SPECIALIST',  value: 'ai_specialist' },
  { label: 'EDITOR',         value: 'editor' },
]

// Tab map: mode value → ordered tab keys (first is default)
const MODE_TABS: Record<string, string[]> = {
  '':              ['portrait'],
  'producer':      ['brief', 'archive', 'portrait'],
  'director':      ['treatment', 'archive', 'portrait'],
  'narrator':      ['segments', 'archive', 'portrait'],
  'cinematographer': ['shot_list_tab', 'archive', 'portrait'],
  'ai_specialist': ['images', 'archive', 'portrait'],
  'editor':        ['edit_plan_tab', 'archive', 'portrait'],
}

const TAB_LABELS: Record<string, string> = {
  portrait:       'PORTRAIT',
  archive:        'ARCHIVE',
  brief:          'BRIEF',
  treatment:      'TREATMENT',
  segments:       'SEGMENTS',
  shot_list_tab:  'SHOT LIST',
  images:         'IMAGES',
  edit_plan_tab:  'EDIT PLAN',
}

function getDefaultTab(mode: string | null): string {
  const key = mode ?? ''
  const tabs = MODE_TABS[key] ?? ['portrait']
  return tabs[0]
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function isFieldEmpty(value: unknown): boolean {
  if (!value) return true
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value: unknown }).value
    if (!inner) return true
    if (typeof inner === 'string' && inner.trim() === '') return true
    if (Array.isArray(inner) && inner.length === 0) return true
    return false
  }
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
  supabase: any,
  createdBy: string = 'studio'
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
        created_by: createdBy,
        created_in_mode: createdBy === 'import' ? 'import' : 'discovery',
        updated_at: now,
      }
    } else {
      const existing_value = existing_field?.value ?? ''
      if (extracted_value.length > existing_value.length) {
        portraitUpdates[field] = {
          value: extracted_value,
          created_by: createdBy,
          created_in_mode: createdBy === 'import' ? 'import' : 'discovery',
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
    documents_generated: DocumentGenerated[]
    documents_content: Partial<Record<GateId, string>>
  } | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>('conversation')
  const [scriptSoul, setScriptSoul] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [contextTab, setContextTab] = useState<string>('portrait')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [openDocument, setOpenDocument] = useState<GateId | null>(null)
  const [generating, setGenerating] = useState<GateId | null>(null)
  const [importPending, setImportPending] = useState<{
    gateId: GateId
    filename: string
    summary: string
    fieldsUpdated: string[]
    fieldsAbsent: string[]
    extractedPortrait: any
  } | null>(null)
  const [importDiscussing, setImportDiscussing] = useState(false)
  const [importLoading, setImportLoading] = useState<GateId | null>(null)
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

  // Reset context tab to mode default when mode changes
  useEffect(() => {
    setContextTab(getDefaultTab(film?.current_mode ?? null))
  }, [film?.current_mode])

  const refreshPortrait = async () => {
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    setFilmMemory(memoryData)
    setPortraitRefreshedAt(new Date().toISOString())
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
        setContextPanelOpen(true)
        setContextTab('portrait')
      } else {
        setScriptSoul(data.emotional_core)
        setEntryMode('soul')
        setTimeout(async () => {
          setMessages([{ id: 'opening', role: 'assistant', content: openingText }])
          setEntryMode('conversation')
          await refreshPortrait()
          setContextPanelOpen(true)
          setContextTab('portrait')
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
      body: JSON.stringify({ filmId, messages: updated.map(m => ({ role: m.role, content: m.content })), filmMemory: memoryData, sessionType: 'RETURNING', filmTitle: film?.title, currentMode: film?.current_mode ?? null, gatesClosed: film?.gates_closed ?? [] })
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
      if (contextPanelOpen && contextTab === 'portrait') await refreshPortrait()
    }

    setThinking(false)
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

  const approveGate = async (gateId: GateId, clearedBy?: 'matinee_work' | 'import') => {
    const newGate: GateClosed = {
      gate: gateId,
      closed_at: new Date().toISOString(),
      ...(clearedBy ? { cleared_by: clearedBy } : {}),
    }
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

  const importDocument = async (gateId: GateId, file: File) => {
    setImportLoading(gateId)
    setImportDiscussing(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filmId', filmId)
      formData.append('gateId', gateId)

      const response = await fetch('/api/import-document', { method: 'POST', body: formData })
      const data = await response.json()

      if (data.summary) {
        await supabase.from('messages').insert({ role: 'assistant', content: data.summary, film_id: filmId })
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.summary }])
        setImportPending({
          gateId,
          filename: file.name,
          summary: data.summary,
          fieldsUpdated: data.fieldsUpdated ?? [],
          fieldsAbsent: data.fieldsAbsent ?? [],
          extractedPortrait: data.extractedPortrait ?? {},
        })
      }
    } finally {
      setImportLoading(null)
    }
  }

  const approveGateFromImport = async (gateId: GateId, filename: string) => {
    const now = new Date().toISOString()
    const newGate: GateClosed = {
      gate: gateId,
      closed_at: now,
      cleared_by: 'import',
      imported_document: filename,
      confirmed_by_filmmaker_at: now,
    }
    const existing = film?.gates_closed ?? []
    const updated = existing.some(g => g.gate === gateId)
      ? existing.map(g => g.gate === gateId ? newGate : g)
      : [...existing, newGate]
    await supabase.from('films').update({ gates_closed: updated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, gates_closed: updated } : null)
  }

  const confirmImport = async () => {
    if (!importPending) return
    const { gateId, filename, summary, extractedPortrait } = importPending

    const { data: existingMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    if (existingMemory) {
      await mergeMemory({}, extractedPortrait, existingMemory, filmId, supabase, 'import')
    }

    const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    const docLabel = ARCHIVE_DOCUMENTS.find(d => d.gateId === gateId)?.label ?? gateId
    const owningMode = gateId === 'film_brief' ? 'producer' : gateId === 'treatment' ? 'director' : gateId === 'department_briefs' ? 'director' : 'producer'
    let documentContent = summary
    try {
      const genResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filmId,
          messages: [{ role: 'user', content: `Produce the ${docLabel}.` }],
          filmMemory: freshMemory,
          sessionType: 'RETURNING',
          filmTitle: film?.title,
          currentMode: owningMode,
          gatesClosed: film?.gates_closed ?? [],
        })
      })
      const genData = await genResponse.json()
      documentContent = genData.content ?? summary
    } catch {}

    const updatedContent = { ...(film?.documents_content ?? {}), [gateId]: documentContent }
    const newGenerated: DocumentGenerated = { document: gateId, generated_at: new Date().toISOString(), source: 'import' }
    const updatedGenerated = [...(film?.documents_generated ?? []), newGenerated]
    await supabase.from('films').update({ documents_content: updatedContent, documents_generated: updatedGenerated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, documents_content: updatedContent, documents_generated: updatedGenerated } : null)

    await approveGateFromImport(gateId, filename)

    if (contextPanelOpen && contextTab === 'portrait') await refreshPortrait()
    setImportPending(null)
    setImportDiscussing(false)
  }

  const discardImport = () => {
    setImportPending(null)
    setImportDiscussing(false)
    if (importFileInputRef.current) importFileInputRef.current.value = ''
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', fontSize: '0.85rem' }}>
      Setting the scene...
    </main>
  )

  // ── ENTRY SCREENS ──────────────────────────────────────────────────────────
  if (entryMode !== 'conversation') {
    return (
      <main style={{
        backgroundColor: 'var(--bg)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-serif)',
        color: 'var(--text)',
        position: 'relative',
      }}>

        {/* Film title — pinned top-centre */}
        <span style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-serif)',
          fontSize: '13px',
          fontStyle: 'italic',
          color: 'var(--text-dim)',
          whiteSpace: 'nowrap',
        }}>
          {film?.title || 'Untitled Film'}
        </span>

        {/* CHOICE */}
        {entryMode === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '27px',
              fontWeight: 400,
              color: 'var(--text)',
              textAlign: 'center',
              marginBottom: '8px',
            }}>
              Where are you in this film&apos;s journey?
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.12em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              textAlign: 'center',
              marginBottom: '36px',
            }}>
              HOW YOU ARRIVE SHAPES HOW WE BEGIN
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '380px' }}>

              {/* Card 1 — I have an idea */}
              <button
                onClick={beginFromConversation}
                onMouseEnter={() => setHoveredCard('idea')}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  background: hoveredCard === 'idea' ? '#1A1A1F' : 'var(--surface)',
                  border: `1px solid ${hoveredCard === 'idea' ? 'var(--gold-dim)' : 'var(--border)'}`,
                  padding: '20px 26px',
                  textAlign: 'left',
                  width: '100%',
                  cursor: 'pointer',
                  transition: 'background 200ms ease, border-color 200ms ease',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '19px',
                  color: 'var(--gold)',
                  marginBottom: '6px',
                }}>
                  I have an idea.
                </p>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                  lineHeight: 1.5,
                }}>
                  LET&apos;S FIND THE FILM TOGETHER THROUGH CONVERSATION
                </p>
              </button>

              {/* Card 2 — I have a script (only in discovery) */}
              {!film?.current_mode && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={() => setHoveredCard('script')}
                    onMouseLeave={() => setHoveredCard(null)}
                    style={{
                      background: hoveredCard === 'script' ? '#1A1A1F' : 'var(--surface)',
                      border: `1px solid ${hoveredCard === 'script' ? 'var(--gold-dim)' : 'var(--border)'}`,
                      padding: '20px 26px',
                      textAlign: 'left',
                      width: '100%',
                      cursor: 'pointer',
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    <p style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '19px',
                      color: 'var(--gold)',
                      marginBottom: '6px',
                    }}>
                      I have a script.
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.08em',
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      lineHeight: 1.5,
                    }}>
                      LET MATINEE READ IT FIRST · PDF OR WORD DOCUMENT
                    </p>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleScriptUpload(f) }}
                  />
                </>
              )}
            </div>

            {uploadError && (
              <p style={{
                marginTop: '16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-dim)',
                textAlign: 'center',
              }}>
                {uploadError}
              </p>
            )}

            {/* Cancel link */}
            <span
              onClick={async () => {
                await supabase.from('messages').delete().eq('film_id', filmId)
                await supabase.from('film_memory').delete().eq('film_id', filmId)
                await supabase.from('films').delete().eq('id', filmId)
                router.push('/studio')
              }}
              style={{
                marginTop: '24px',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              CANCEL — RETURN TO THE STUDIO
            </span>
          </div>
        )}

        {/* UPLOADING */}
        {entryMode === 'uploading' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '19px',
              fontStyle: 'italic',
              color: 'var(--text-dim)',
              lineHeight: 1.7,
              marginBottom: '8px',
            }}>
              Reading your script...
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
            }}>
              BUILDING THE FILM MEMORY. THIS TAKES A MOMENT.
            </p>
          </div>
        )}

        {/* SOUL */}
        {entryMode === 'soul' && scriptSoul && (
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.2em',
              color: 'var(--gold-dim)',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}>
              WHAT THE FILM IS BECOMING
            </p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              lineHeight: 1.8,
              color: 'var(--text)',
              fontWeight: 400,
              marginBottom: '40px',
            }}>
              {scriptSoul}
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
            }}>
              THE FILM MEMORY IS BUILT. STEPPING INTO THE STUDIO...
            </p>
          </div>
        )}

      </main>
    )
  }

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const currentModeKey = film?.current_mode ?? ''
  const contextTabs = MODE_TABS[currentModeKey] ?? ['portrait']

  // ── MAIN STUDIO ────────────────────────────────────────────────────────────
  return (
    <main style={{ backgroundColor: 'var(--bg)', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-serif)', color: 'var(--text)', overflow: 'hidden' }}>

      {/* ── HEADER STRIP ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 2rem', height: '44px', flexShrink: 0,
        borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-subtle)',
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 500,
          letterSpacing: '0.3em', color: 'var(--gold)', textTransform: 'uppercase',
        }}>
          MATINEE
        </span>

        {/* Current mode label */}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
          color: 'var(--text-dim)', textTransform: 'uppercase',
        }}>
          {MODES.find(m => m.value === (film?.current_mode ?? null))?.label ?? 'DISCOVERY'}
        </span>

        {/* Leave */}
        <span
          onClick={() => router.push('/studio')}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
            color: 'var(--text-dim)', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          LEAVE
        </span>
      </nav>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT RAIL — Production Compass ── */}
        <div style={{
          width: '176px', flexShrink: 0, height: '100%',
          backgroundColor: 'var(--bg-subtle)', borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          {/* Film title */}
          <div style={{ padding: '16px 14px 12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
              style={{
                fontFamily: 'var(--font-serif)', fontSize: '13px', fontStyle: 'italic',
                color: 'var(--text-dim)', outline: 'none', cursor: 'text',
                display: 'block', lineHeight: 1.5,
              }}
            >
              {film?.title}
            </span>
          </div>

          {/* Mode list */}
          <div style={{ flex: 1 }}>
            {MODES.map(mode => {
              const isActive = (film?.current_mode ?? null) === mode.value
              const modeDocs = ARCHIVE_DOCUMENTS.filter(d => d.mode === mode.value)

              // Determine gated: mode has docs and its first doc's prereq is unmet
              let isGated = false
              if (mode.value && modeDocs.length > 0) {
                const firstDoc = modeDocs[0]
                const prereqId = GATE_PREREQUISITES[firstDoc.gateId]
                if (prereqId) {
                  const prereqMet = film?.gates_closed?.some(g => g.gate === prereqId && !!g.closed_at) ?? false
                  isGated = !prereqMet
                }
              }

              const nameColor = isActive ? 'var(--gold)' : isGated ? 'var(--text-dim)' : 'var(--text)'
              const modeBg = isActive ? 'rgba(200,169,110,0.07)' : 'transparent'

              return (
                <div key={String(mode.value)}>
                  {/* Mode row */}
                  <div
                    onClick={async () => {
                      const { error } = await supabase.from('films').update({ current_mode: mode.value }).eq('id', filmId)
                      if (!error) setFilm(prev => prev ? { ...prev, current_mode: mode.value } : null)
                    }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      backgroundColor: modeBg,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
                      textTransform: 'uppercase', color: nameColor,
                    }}>
                      {mode.label}
                    </span>
                  </div>

                  {/* Gate document sub-items */}
                  {modeDocs.map(doc => {
                    const gateEntry = film?.gates_closed?.find(g => g.gate === doc.gateId)
                    const isReopened = gateEntry?.status === 'reopened'
                    const isLocked = !!gateEntry && !isReopened && !!gateEntry.closed_at
                    const hasContent = !!film?.documents_content?.[doc.gateId]
                    const isInReview = hasContent && !isLocked

                    const badgeLabel = isLocked ? 'LOCKED' : isInReview ? 'IN REVIEW' : 'OPEN'
                    const badgeColor = isLocked ? 'var(--gold)' : isInReview ? 'var(--amber)' : 'var(--text-dim)'
                    const badgeBorder = isLocked ? 'var(--gold)' : isInReview ? 'var(--amber)' : 'var(--border)'

                    return (
                      <div
                        key={doc.gateId}
                        style={{
                          padding: '5px 14px 5px 24px',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}
                      >
                        {GATE_ICON_MAP[doc.gateId]}
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)',
                          textTransform: 'uppercase', flex: 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {doc.label}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: badgeColor,
                          border: `1px solid ${badgeBorder}`, padding: '1px 4px',
                          flexShrink: 0, lineHeight: 1.4,
                        }}>
                          {badgeLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Upload Script — pinned to bottom, only in discovery */}
          {!film?.current_mode && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <label style={{
                display: 'block', padding: '14px',
                fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
                color: 'var(--text-dim)', textTransform: 'uppercase', cursor: 'pointer',
              }}>
                UPLOAD SCRIPT
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { e.target.value = ''; handleScriptUpload(f) } }}
                />
              </label>
            </div>
          )}
        </div>

        {/* ── CONVERSATION ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, backgroundColor: 'var(--bg)' }}>

          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'assistant' ? (
                    <p style={{ fontSize: '1.15rem', lineHeight: '1.9', color: 'var(--text)', fontWeight: 300 }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid var(--border)' }}>
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
                      backgroundColor: 'var(--gold-dim)', display: 'inline-block',
                      animation: 'matineePulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`
                    }} />
                  ))}
                </div>
              )}

              {/* Import approve / discuss */}
              {importPending && !importDiscussing && (
                <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
                  <button
                    onClick={() => { setImportDiscussing(true); setContextPanelOpen(true); setContextTab('archive') }}
                    style={{ ...btnSecondary, fontSize: '0.72rem', padding: '0.6rem 1.25rem' }}
                  >
                    Review in Archive
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* INPUT */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '1.25rem 3rem 1.75rem', flexShrink: 0 }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Speak..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-serif)' }}
              />
              <span
                onClick={() => sendMessage()}
                style={{ color: input.trim() ? 'var(--gold)' : 'var(--border)', cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.2s' }}
              >
                →
              </span>
            </div>
          </div>
        </div>

        {/* ── CONTEXT PANEL ── */}
        <div style={{
          position: 'relative',
          width: contextPanelOpen ? '220px' : '0px',
          transition: 'width 280ms ease',
          flexShrink: 0, overflow: 'hidden',
          backgroundColor: 'var(--bg-subtle)', borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* Pull tab */}
          <div
            onClick={() => setContextPanelOpen(prev => !prev)}
            style={{
              position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)',
              width: '12px', height: '40px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border)', borderLeft: 'none',
              cursor: 'pointer', zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', lineHeight: 1 }}>
              {contextPanelOpen ? '›' : '‹'}
            </span>
          </div>

          {/* Panel inner — only renders content when open to avoid layout bleed */}
          <div style={{ width: '220px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {contextTabs.map(tab => {
                const isActive = contextTab === tab
                return (
                  <div
                    key={tab}
                    onClick={() => setContextTab(tab)}
                    style={{
                      padding: '10px 10px 8px',
                      fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      color: isActive ? 'var(--gold)' : 'var(--text-dim)',
                      borderBottom: isActive ? '1px solid var(--gold)' : 'none',
                      marginBottom: isActive ? '-1px' : 0,
                    }}
                  >
                    {TAB_LABELS[tab] ?? tab.toUpperCase()}
                  </div>
                )
              })}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* PORTRAIT TAB */}
              {contextTab === 'portrait' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* Portrait header */}
                  <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
                      Film Portrait
                    </span>
                    {portraitRefreshedAt && (
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.03em', marginTop: '0.2rem' }}>
                        {formatDate(portraitRefreshedAt)}
                      </p>
                    )}
                  </div>

                  {/* Portrait fields */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 2rem' }}>
                    {!filmMemory ? (
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.7 }}>
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
                            <div style={{ marginBottom: '1.5rem' }}>
                              <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                {field.label}
                              </p>

                              {isEmpty ? (
                                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                                  <p style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: field.special === 'directors_intent' ? '0.75rem' : 0 }}>
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
                                            border: 'none', borderBottom: '1px solid var(--border)',
                                            color: 'var(--text)', fontFamily: 'var(--font-serif)', fontSize: '0.78rem',
                                            lineHeight: 1.6, padding: '0.4rem 0',
                                            resize: 'vertical', minHeight: '70px',
                                            outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box'
                                          }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          <button onClick={saveDirectEdit} disabled={directEdit.saving} style={{ ...btnSmall, borderColor: 'var(--gold-dim)', color: 'var(--gold)' }}>
                                            {directEdit.saving ? 'Saving...' : 'Save'}
                                          </button>
                                          <button onClick={() => setDirectEdit({ field: null, value: '', saving: false })} style={btnSmall}>Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => openDirectEdit(field.key)} style={{ ...btnSmall, borderColor: 'var(--gold-dim)', color: 'var(--gold)' }}>
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
                                        <div key={item.added_at} style={{ borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                                          <p style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#a8a098', margin: 0 }}>{item.question}</p>
                                          <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>{item.category}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : field.special === 'directors_intent' ? (
                                    <>
                                      <p style={{ fontSize: '0.82rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap', marginBottom: '0.6rem' }}>
                                        {typeof value === 'string' ? value : ''}
                                      </p>
                                      {isEditing ? (
                                        <div>
                                          <textarea
                                            value={directEdit.value}
                                            onChange={e => setDirectEdit(prev => ({ ...prev, value: e.target.value }))}
                                            style={{
                                              width: '100%', background: 'transparent',
                                              border: 'none', borderBottom: '1px solid var(--border)',
                                              color: 'var(--text)', fontFamily: 'var(--font-serif)', fontSize: '0.78rem',
                                              lineHeight: 1.6, padding: '0.4rem 0',
                                              resize: 'vertical', minHeight: '70px',
                                              outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box'
                                            }}
                                          />
                                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={saveDirectEdit} disabled={directEdit.saving} style={{ ...btnSmall, borderColor: 'var(--gold-dim)', color: 'var(--gold)' }}>
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
                                    <p style={{ fontSize: '0.82rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap' }}>
                                      {typeof value === 'string' ? value : ''}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>

                            {idx < PORTRAIT_FIELDS.length - 1 && (
                              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ARCHIVE TAB */}
              {contextTab === 'archive' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>

                    {!film?.current_mode && (
                      <div style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.73rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                        Production documents are generated in production modes. Enter a mode to begin.
                      </div>
                    )}

                    {film?.current_mode && (
                      <>
                        <div style={{ padding: '0 1rem 0.5rem', fontSize: '0.62rem', color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
                          Generate opens a conversation with the mode. The document follows when you&apos;re ready.
                        </div>
                        {(['producer', 'director', 'narrator', 'cinematographer', 'ai_specialist', 'editor'] as const).map(mode => (
                          <div key={mode} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-dim)', padding: '0.4rem 1rem' }}>
                              {mode.replace('_', ' ')}
                            </div>
                            {ARCHIVE_DOCUMENTS.filter(d => d.mode === mode).map(doc => {
                              const isGenerated = film.documents_generated?.some(d => d.document === doc.gateId)
                              const gateEntry = film.gates_closed?.find(g => g.gate === doc.gateId)
                              const isReopened = gateEntry?.status === 'reopened'
                              const isApproved = !!gateEntry && !isReopened
                              const hasPendingImport = importPending?.gateId === doc.gateId
                              const prereqGateId = GATE_PREREQUISITES[doc.gateId]
                              const prereqMet = prereqGateId
                                ? film.gates_closed?.some(g => g.gate === prereqGateId && !!g.closed_at) ?? false
                                : true
                              const isOwningMode = film.current_mode === doc.mode
                              const canGenerate = prereqMet && isOwningMode
                              const gateState: 'OPEN' | 'IN REVIEW' | 'LOCKED' | 'REOPENED' =
                                isReopened ? 'REOPENED' :
                                isApproved ? 'LOCKED' :
                                (isGenerated || hasPendingImport) ? 'IN REVIEW' : 'OPEN'
                              const stateColor =
                                gateState === 'LOCKED'    ? 'var(--gold)' :
                                gateState === 'REOPENED'  ? 'var(--amber)' :
                                gateState === 'IN REVIEW' ? 'var(--text)' :
                                                            'var(--text-dim)'
                              const iconColor =
                                gateState === 'LOCKED'    ? 'var(--gold)' :
                                gateState === 'REOPENED'  ? 'var(--amber)' :
                                gateState === 'IN REVIEW' ? 'var(--text-dim)' :
                                                            'var(--text-dim)'
                              const activeFlag = getActiveRippleFlag(doc.gateId)

                              return (
                                <div key={doc.gateId} style={{ padding: '0.45rem 1rem', borderBottom: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.25rem' }}>
                                    {ARCHIVE_ICON_MAP[doc.gateId](iconColor)}

                                    {/* Document name */}
                                    {isGenerated ? (
                                      <span
                                        onClick={() => setOpenDocument(doc.gateId)}
                                        style={{ fontSize: '0.72rem', color: isApproved ? 'var(--gold)' : 'var(--text)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)', flex: 1 }}
                                      >
                                        {doc.label}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', flex: 1 }}>
                                        {doc.label}
                                      </span>
                                    )}

                                    {/* State label */}
                                    <span style={{
                                      fontSize: '0.56rem', letterSpacing: '0.10em',
                                      textTransform: 'uppercase', color: stateColor, flexShrink: 0,
                                    }}>
                                      {gateState}
                                    </span>
                                  </div>

                                  {/* Action buttons */}
                                  {!isGenerated && !hasPendingImport && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: '18px' }}>
                                      <button
                                        onClick={() => canGenerate ? generateDocument(doc.gateId, doc.mode) : undefined}
                                        disabled={generating === doc.gateId || !canGenerate}
                                        style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: canGenerate ? 'var(--gold)' : 'var(--gold-dim)', background: 'none', border: `1px solid ${canGenerate ? 'var(--gold-dim)' : 'var(--border)'}`, padding: '0.25rem 0.5rem', cursor: canGenerate ? 'pointer' : 'not-allowed' }}
                                      >
                                        {generating === doc.gateId ? '...' : 'Generate'}
                                      </button>
                                      <label style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: importLoading === doc.gateId ? 'var(--text-dim)' : 'var(--text-dim)', cursor: importLoading === doc.gateId ? 'default' : 'pointer', padding: '0.25rem 0.5rem' }}>
                                        {importLoading === doc.gateId ? 'Reading...' : 'Import'}
                                        <input
                                          ref={importFileInputRef}
                                          type="file"
                                          accept=".pdf,.doc,.docx"
                                          style={{ display: 'none' }}
                                          onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (file) importDocument(doc.gateId, file)
                                            e.target.value = ''
                                          }}
                                        />
                                      </label>
                                    </div>
                                  )}
                                  {isGenerated && !isApproved && (
                                    <div style={{ paddingLeft: '18px', marginTop: '0.2rem' }}>
                                      <button
                                        onClick={() => approveGate(doc.gateId)}
                                        style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bg)', background: 'var(--gold)', border: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                                      >
                                        Approve
                                      </button>
                                    </div>
                                  )}
                                  {isApproved && (
                                    <div style={{ paddingLeft: '18px', marginTop: '0.2rem' }}>
                                      <button
                                        onClick={() => reopenGate(doc.gateId)}
                                        style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-dim)', background: 'none', border: '1px solid var(--border)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                                      >
                                        Reopen
                                      </button>
                                    </div>
                                  )}

                                  {/* Prerequisite note */}
                                  {!isGenerated && !hasPendingImport && !prereqMet && prereqGateId && (
                                    <div style={{ marginTop: '0.2rem', paddingLeft: '18px', fontSize: '0.6rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                      Needs {GATE_LABELS[prereqGateId]} approved first.
                                    </div>
                                  )}
                                  {/* Wrong-mode note */}
                                  {!isGenerated && !hasPendingImport && prereqMet && !isOwningMode && (
                                    <div style={{ marginTop: '0.2rem', paddingLeft: '18px', fontSize: '0.6rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                      Switch to {doc.mode.replace('_', ' ')} mode to generate.
                                    </div>
                                  )}

                                  {/* Ripple flag */}
                                  {activeFlag && (
                                    <div style={{ marginTop: '0.3rem', paddingLeft: '18px', display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.64rem', color: 'var(--amber)', lineHeight: 1.5 }}>
                                      <span>{doc.label} was generated after {GATE_LABELS[activeFlag]} was approved. It may reflect the previous version.</span>
                                      <button
                                        onClick={() => dismissRippleFlag(activeFlag, doc.gateId)}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--amber)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', fontSize: '0.64rem', fontFamily: 'var(--font-serif)', flexShrink: 0 }}
                                      >
                                        Dismiss
                                      </button>
                                    </div>
                                  )}

                                  {/* Import pending — close/discard */}
                                  {hasPendingImport && importDiscussing && (
                                    <div style={{ marginTop: '0.3rem', paddingLeft: '18px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.64rem' }}>
                                      <button
                                        onClick={confirmImport}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gold)', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontSize: '0.64rem', letterSpacing: '0.06em' }}
                                      >
                                        Close gate
                                      </button>
                                      <button
                                        onClick={discardImport}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontSize: '0.64rem' }}
                                      >
                                        Discard
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

              {/* PLACEHOLDER TABS */}
              {contextTab !== 'portrait' && contextTab !== 'archive' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', fontStyle: 'italic', color: 'var(--text-dim)', textAlign: 'center' }}>
                    Coming in the next story.
                  </p>
                </div>
              )}

            </div>
          </div>
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
          <div style={{ background: 'var(--bg-subtle)', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '2.5rem 3rem', position: 'relative', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-dim)', marginBottom: '2rem' }}>
              {ARCHIVE_DOCUMENTS.find(d => d.gateId === openDocument)?.label}
            </div>
            <div style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif)' }}>
              {film?.documents_content?.[openDocument] ?? ''}
            </div>
            <button
              onClick={() => setOpenDocument(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1rem', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
