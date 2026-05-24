'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
  FileText, Clapperboard, LayoutList, Radio, Anchor,
  ScrollText, Mic, Lock, List, LayoutTemplate,
  Aperture, Sparkles, Scissors, Music, Pin
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
type EntryMode = 'uploading' | 'soul' | 'conversation'

// ── BUTTON STYLES ─────────────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.12em',
  cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s'
}
const btnSecondary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--line)', color: 'var(--fg-dim)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s'
}
const btnSmall: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--line)', color: 'var(--fg-dim)',
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
  consistency_lock:      'department_briefs',
  shot_list:             'consistency_lock',
  camera_light_plan:     'shot_list',
  visual_prompt_package: 'camera_light_plan',
  edit_plan:             'audio_direction',
  music_cue_sheet:       'edit_plan',
}

const GATE_ICON_MAP: Record<GateId, React.ReactNode> = {
  film_brief:            <FileText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  treatment:             <Clapperboard size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  department_briefs:     <LayoutList size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  mode_selection_brief:  <Radio size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  hook_draft:            <Anchor size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  script_lock:           <ScrollText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  audio_direction:       <Mic size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  consistency_lock:      <Lock size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  shot_list:             <List size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  camera_light_plan:     <Aperture size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  visual_prompt_package: <Sparkles size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  edit_plan:             <Scissors size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  music_cue_sheet:       <Music size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
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

const PHASE_GROUPS: Array<{ label: string; initial: string; modes: string[] }> = [
  { label: 'PRE-PRODUCTION', initial: 'P', modes: ['producer'] },
  { label: 'PRODUCTION',     initial: 'P', modes: ['director', 'narrator', 'cinematographer', 'ai_specialist'] },
  { label: 'POST',           initial: 'P', modes: ['editor'] },
]

const MODE_PORTRAIT_FIELDS: Record<string, string[]> = {
  producer: [
    'portrait_logline', 'portrait_emotional_core', 'portrait_story',
    'portrait_subjects', 'portrait_themes', 'portrait_approach',
    'portrait_comparable_films', 'portrait_audience', 'portrait_target_length',
    'portrait_unresolved_questions',
  ],
  director: [
    'portrait_emotional_core', 'portrait_story', 'portrait_world',
    'portrait_subjects', 'portrait_tone', 'portrait_visual_world',
    'portrait_approach', 'portrait_target_length', 'portrait_comparable_films',
    'portrait_unresolved_questions',
  ],
  narrator: [
    'portrait_logline', 'portrait_emotional_core', 'portrait_story',
    'portrait_subjects', 'portrait_themes', 'portrait_tone',
    'portrait_approach', 'portrait_target_length', 'portrait_unresolved_questions',
  ],
  cinematographer: [
    'portrait_tone', 'portrait_visual_world', 'portrait_world',
    'portrait_subjects', 'portrait_approach', 'portrait_comparable_films',
    'portrait_target_length',
  ],
  ai_specialist: [
    'portrait_tone', 'portrait_visual_world', 'portrait_comparable_films',
  ],
  editor: [
    'portrait_emotional_core', 'portrait_tone', 'portrait_approach',
    'portrait_audience', 'portrait_target_length', 'portrait_unresolved_questions',
  ],
}

const FALLBACK_PORTRAIT_FIELD_KEYS = [
  'portrait_logline', 'portrait_emotional_core', 'portrait_tone', 'portrait_unresolved_questions',
]

// Tab map: mode value → ordered tab keys (first is default)
const MODE_TABS: Record<string, string[]> = {
  '':              ['archive', 'portrait'],
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
    source_documents?: {
      script?: {
        current?: { filename: string; extracted_text: string; uploaded_at: string }
        history?: Array<{ filename: string; extracted_text: string; uploaded_at: string }>
      }
      research?: Array<{ id: string; filename: string; extracted_text: string; uploaded_at: string }>
    }
  } | null>(null)
  const [filmBlocked, setFilmBlocked] = useState(false)
  const [entryMode, setEntryMode] = useState<EntryMode>('conversation')
  const [scriptSoul, setScriptSoul] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingResearch, setUploadingResearch] = useState(false)
  const [uploadingScript, setUploadingScript] = useState(false)
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(false)
  const [contextTab, setContextTab] = useState<string>('portrait')
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [openDocument, setOpenDocument] = useState<GateId | null>(null)
  const [openSourceDocument, setOpenSourceDocument] = useState<{
    type: 'script'
    data: { current?: { filename: string; extracted_text: string; uploaded_at: string }; history?: Array<{ filename: string; extracted_text: string; uploaded_at: string }> }
  } | {
    type: 'research'
    data: { id: string; filename: string; extracted_text: string; uploaded_at: string }
  } | null>(null)
  const [showScriptHistory, setShowScriptHistory] = useState(false)
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
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [panelDocked, setPanelDocked] = useState(false)
  const [hoveredMode, setHoveredMode] = useState<string | null>(null)
  const [stripHovered, setStripHovered] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1440)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const archiveRowRefs = useRef<Partial<Record<GateId, HTMLDivElement>>>({})
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
      if (filmData.film_status && filmData.film_status !== 'active') {
        setFilmBlocked(true)
        setLoading(false)
        return
      }
      await refreshPortrait()
      const { data: msgData } = await supabase.from('messages').select('*').eq('film_id', filmId).order('created_at')
      if (msgData && msgData.length > 0) {
        setMessages(msgData)
        setEntryMode('conversation')
      } else {
        setEntryMode('conversation')
        await openingMessage(filmData.title || 'Untitled Film')
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Reset context tab to mode default when mode changes
  useEffect(() => {
    setContextTab(getDefaultTab(film?.current_mode ?? null))
  }, [film?.current_mode])

  // railCollapsed syncs with panelDocked
  useEffect(() => {
    if (panelDocked) setRailCollapsed(true)
    else setRailCollapsed(false)
  }, [panelDocked])

  // Track viewport width for pin affordance check
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const refreshPortrait = async () => {
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    setFilmMemory(memoryData)
    setPortraitRefreshedAt(memoryData?.updated_at ?? new Date().toISOString())
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
        if (!wasInConversation) setEntryMode('conversation')
        else setThinking(false)
        return
      }

      const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      const openingResponse = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmId, messages: [], filmMemory: freshMemory, sessionType: 'SCRIPT_UPLOAD', filmTitle: film?.title, currentMode: film?.current_mode ?? null })
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
      if (!wasInConversation) setEntryMode('conversation')
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
      await refreshPortrait()
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
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-serif)', letterSpacing: '0.2em', fontSize: '0.85rem' }}>
      Setting the scene...
    </main>
  )

  // ── BLOCKED SCREEN ─────────────────────────────────────────────────────────
  if (filmBlocked && film) {
    return (
      <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', color: 'var(--fg)', position: 'relative' }}>
        <span style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-serif)', fontSize: '13px', fontStyle: 'italic', color: 'var(--fg-dim)', whiteSpace: 'nowrap' }}>
          {film.title}
        </span>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            {film.film_status?.toUpperCase()}
          </p>
          <p style={{ fontSize: '1.3rem', color: 'var(--fg)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            This film is not active.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--fg-dim)', fontStyle: 'italic', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Return to the Studio to reopen it before continuing work.
          </p>
          <span
            onClick={() => router.push('/studio')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            RETURN TO THE STUDIO
          </span>
        </div>
      </main>
    )
  }

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
        color: 'var(--fg)',
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
          color: 'var(--fg-dim)',
          whiteSpace: 'nowrap',
        }}>
          {film?.title || 'Untitled Film'}
        </span>

        {/* UPLOADING */}
        {entryMode === 'uploading' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '19px',
              fontStyle: 'italic',
              color: 'var(--fg-dim)',
              lineHeight: 1.7,
              marginBottom: '8px',
            }}>
              Reading your script...
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--fg-dim)',
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
              color: 'var(--accent-dim)',
              textTransform: 'uppercase',
              marginBottom: '24px',
            }}>
              WHAT THE FILM IS BECOMING
            </p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '22px',
              lineHeight: 1.8,
              color: 'var(--fg)',
              fontWeight: 400,
              marginBottom: '40px',
            }}>
              {scriptSoul}
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--fg-dim)',
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
  const canPin = viewportWidth - 176 - 360 >= 600

  // ── MAIN STUDIO ────────────────────────────────────────────────────────────
  return (
    <main style={{ backgroundColor: 'var(--bg)', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-serif)', color: 'var(--fg)', overflow: 'hidden' }}>

      {/* ── HEADER STRIP ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 2rem', height: '44px', flexShrink: 0,
        borderBottom: '1px solid var(--line)', backgroundColor: 'var(--bg-elev)',
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: '15px', fontWeight: 500,
          letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase',
        }}>
          MATINEE
        </span>

        {/* Current mode label */}
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
          color: 'var(--fg-dim)', textTransform: 'uppercase',
        }}>
          {MODES.find(m => m.value === (film?.current_mode ?? null))?.label ?? 'DISCOVERY'}
        </span>

        {/* Leave */}
        <span
          onClick={() => router.push('/studio')}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em',
            color: 'var(--fg-dim)', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          LEAVE
        </span>
      </nav>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT RAIL ── */}
        <div style={{
          width: railCollapsed ? '40px' : '176px',
          flexShrink: 0,
          height: '100%',
          backgroundColor: 'var(--bg-elev)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: `width var(--dur-slow) var(--ease-curtain)`,
        }}>
          {/* Film title — hidden when collapsed */}
          {!railCollapsed && (
            <div style={{ padding: '16px 14px 12px 14px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
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
                  color: 'var(--fg-dim)', outline: 'none', cursor: 'text',
                  display: 'block', lineHeight: 1.5,
                }}
              >
                {film?.title}
              </span>
            </div>
          )}

          {/* Collapse toggle */}
          <div
            onClick={() => setRailCollapsed(prev => !prev)}
            style={{
              height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid var(--line)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--fg-dim)', lineHeight: 1 }}>
              {railCollapsed ? '›' : '‹'}
            </span>
          </div>

          {/* Scrollable mode list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* Discovery row */}
            {(() => {
              const isActive = (film?.current_mode ?? null) === null
              const isHov = hoveredMode === '__discovery__'
              const nameColor = isActive ? 'var(--accent)' : 'var(--fg)'
              const modeBg = isActive ? 'rgba(200,169,110,0.07)' : isHov ? 'var(--bg-elev-2)' : 'transparent'
              return (
                <div
                  onClick={async () => {
                    const { error } = await supabase.from('films').update({ current_mode: null }).eq('id', filmId)
                    if (!error) setFilm(prev => prev ? { ...prev, current_mode: null } : null)
                  }}
                  onMouseEnter={() => setHoveredMode('__discovery__')}
                  onMouseLeave={() => setHoveredMode(null)}
                  style={{ padding: '10px 14px', cursor: 'pointer', backgroundColor: modeBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
                >
                  {!railCollapsed && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: nameColor, whiteSpace: 'nowrap' }}>
                      DISCOVERY
                    </span>
                  )}
                  {railCollapsed && isActive && (
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'block', margin: '0 auto', flexShrink: 0 }} />
                  )}
                </div>
              )
            })()}

            {/* Phase groups */}
            {PHASE_GROUPS.map(group => {
              const isGroupActive = group.modes.includes(film?.current_mode ?? '')
              const groupHasAttention = group.modes.some(mv => {
                const docs = ARCHIVE_DOCUMENTS.filter(d => d.mode === mv)
                return docs.some(doc => {
                  const gen = film?.documents_generated?.some(d => d.document === doc.gateId)
                  const gate = film?.gates_closed?.find(g => g.gate === doc.gateId)
                  const locked = !!gate && gate.status !== 'reopened' && !!gate.closed_at
                  return gen && !locked
                })
              })

              return (
                <div key={group.label}>
                  {/* Phase group header */}
                  {!railCollapsed ? (
                    <div style={{ padding: '8px 14px 3px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-dim)', whiteSpace: 'nowrap' }}>
                      {group.label}
                    </div>
                  ) : (
                    <div style={{ padding: '6px 0 3px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: isGroupActive ? 'var(--accent)' : 'var(--fg-dim)', lineHeight: 1 }}>
                        {group.initial}
                      </span>
                      {groupHasAttention && (
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'block', marginTop: '3px' }} />
                      )}
                    </div>
                  )}

                  {/* Mode rows */}
                  {group.modes.map(modeValue => {
                    const modeConfig = MODES.find(m => m.value === modeValue)
                    if (!modeConfig) return null
                    const isActive = film?.current_mode === modeValue
                    const modeDocs = ARCHIVE_DOCUMENTS.filter(d => d.mode === modeValue)
                    const isHov = hoveredMode === modeValue

                    let isGated = false
                    if (modeDocs.length > 0) {
                      const firstDoc = modeDocs[0]
                      const prereqId = GATE_PREREQUISITES[firstDoc.gateId]
                      if (prereqId) {
                        const prereqMet = film?.gates_closed?.some(g => g.gate === prereqId && !!g.closed_at) ?? false
                        isGated = !prereqMet
                      }
                    }

                    const hasReviewDoc = modeDocs.some(doc => {
                      const gen = film?.documents_generated?.some(d => d.document === doc.gateId)
                      const gate = film?.gates_closed?.find(g => g.gate === doc.gateId)
                      const locked = !!gate && gate.status !== 'reopened' && !!gate.closed_at
                      return gen && !locked
                    })
                    const hasAnyDoc = film?.documents_generated?.some(d => modeDocs.some(doc => doc.gateId === d.document))
                    const dotColor = hasReviewDoc ? 'var(--accent)' : hasAnyDoc ? 'var(--fg-dim)' : null

                    const nameColor = isActive ? 'var(--accent)' : isGated ? 'var(--fg-dim)' : 'var(--fg)'
                    const modeBg = isActive ? 'rgba(200,169,110,0.07)' : (!isGated && isHov) ? 'var(--bg-elev-2)' : 'transparent'

                    return (
                      <div
                        key={modeValue}
                        onClick={async () => {
                          const { error } = await supabase.from('films').update({ current_mode: modeValue }).eq('id', filmId)
                          if (!error) setFilm(prev => prev ? { ...prev, current_mode: modeValue } : null)
                        }}
                        onMouseEnter={() => { if (!isGated) setHoveredMode(modeValue) }}
                        onMouseLeave={() => setHoveredMode(null)}
                        style={{ padding: '10px 14px', cursor: isGated ? 'default' : 'pointer', backgroundColor: modeBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
                      >
                        {!railCollapsed && (
                          <>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: nameColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {modeConfig.label}
                            </span>
                            {dotColor && (
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0, marginLeft: '6px' }} />
                            )}
                          </>
                        )}
                        {railCollapsed && isActive && (
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'block', margin: '0 auto', flexShrink: 0 }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

        </div>

        {/* ── CONVERSATION ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '600px', backgroundColor: 'var(--bg)', position: 'relative' }}>
          {/* Overlay — closes floating panel on outside click */}
          {contextPanelOpen && !panelDocked && (
            <div
              onClick={() => setContextPanelOpen(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default' }}
            />
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
            <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'assistant' ? (
                    <p style={{ fontSize: '1.15rem', lineHeight: '1.9', color: 'var(--fg)', fontWeight: 300 }}>
                      {msg.content}
                    </p>
                  ) : (
                    <div style={{ paddingLeft: '1.5rem', borderLeft: '1px solid var(--line)' }}>
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
                      backgroundColor: 'var(--accent-dim)', display: 'inline-block',
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
          <div style={{ borderTop: '1px solid var(--line)', padding: '1.25rem 3rem 1.75rem', flexShrink: 0 }}>
  <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <input
      ref={inputRef}
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && sendMessage()}
      placeholder="Speak..."
      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '0.95rem', outline: 'none', fontFamily: 'var(--font-serif)' }}
    />
    <span
      onClick={() => sendMessage()}
      style={{ color: input.trim() ? 'var(--accent)' : 'var(--line)', cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.2s' }}
    >
      →
    </span>
  </div>
</div>
        </div>

        {/* ── CONTEXT PANEL ── */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          width: contextPanelOpen && panelDocked ? '360px' : '32px',
          transition: `width var(--dur-slow) var(--ease-curtain)`,
          height: '100%',
        }}>

          {/* Strip — always in DOM, closes when panel opens */}
          <div
            onClick={!contextPanelOpen ? () => setContextPanelOpen(true) : undefined}
            onMouseEnter={() => setStripHovered(true)}
            onMouseLeave={() => setStripHovered(false)}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '32px',
              backgroundColor: !contextPanelOpen && stripHovered ? 'var(--bg-elev-2)' : 'var(--bg-elev)',
              borderLeft: '1px solid var(--line)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: !contextPanelOpen ? 'pointer' : 'default',
              transition: `background var(--dur-fast) var(--ease-stage)`,
              zIndex: 1,
              overflow: 'hidden',
            }}
          >
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em',
              color: !contextPanelOpen && stripHovered ? 'var(--fg)' : 'var(--fg-dim)',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              marginBottom: '8px',
              transition: `color var(--dur-fast) var(--ease-stage)`,
              overflow: 'hidden', maxHeight: '160px', whiteSpace: 'nowrap',
            }}>
              {film?.title || 'UNTITLED FILM'}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1,
              color: !contextPanelOpen && stripHovered ? 'var(--fg)' : 'var(--fg-dim)',
              transition: `color var(--dur-fast) var(--ease-stage)`,
            }}>
              ‹
            </span>
          </div>

          {/* Open panel — floating (position:absolute, z-index:10) or docked (z-index:2) */}
          {contextPanelOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '360px',
              backgroundColor: 'var(--bg-elev)', borderLeft: '1px solid var(--line)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              zIndex: panelDocked ? 2 : 10,
            }}>

            {/* Panel header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
              <div
                onClick={() => setContextPanelOpen(false)}
                style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--fg-dim)', letterSpacing: '0.1em', lineHeight: 1 }}
              >
                ✕
              </div>
              <div
                onClick={() => {
                  if (!canPin) return
                  if (panelDocked) {
                    setPanelDocked(false)
                  } else {
                    setPanelDocked(true)
                  }
                }}
                style={{
                  cursor: canPin ? 'pointer' : 'not-allowed',
                  opacity: canPin ? 1 : 0.3,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <Pin size={14} color={panelDocked ? 'var(--accent)' : 'var(--fg-dim)'} />
              </div>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
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
                      color: isActive ? 'var(--accent)' : 'var(--fg-dim)',
                      borderBottom: isActive ? '1px solid var(--accent)' : 'none',
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
                  <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--accent-dim)', textTransform: 'uppercase' }}>
                      Film Portrait
                    </span>
                    {portraitRefreshedAt && (
                      <p style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', letterSpacing: '0.03em', marginTop: '0.2rem' }}>
                        {formatDate(portraitRefreshedAt)}
                      </p>
                    )}
                  </div>

                  {/* Portrait fields */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem 2rem' }}>
                    {!filmMemory ? (
                      <p style={{ color: 'var(--fg-dim)', fontSize: '0.82rem', fontStyle: 'italic', lineHeight: 1.7 }}>
                        The portrait is still taking shape. Keep the conversation going and it will fill in.
                      </p>
                    ) : (
                      (() => {
                        const modeKey = film?.current_mode ?? null
                        const modeFieldKeys = modeKey ? (MODE_PORTRAIT_FIELDS[modeKey] ?? null) : null
                        const fieldsToRender = panelDocked
                          ? PORTRAIT_FIELDS
                          : modeFieldKeys
                            ? PORTRAIT_FIELDS.filter(f => modeFieldKeys.includes(f.key as string))
                            : PORTRAIT_FIELDS.filter(f => FALLBACK_PORTRAIT_FIELD_KEYS.includes(f.key as string))
                        return fieldsToRender.map((field, idx) => {
                        const raw = filmMemory[field.key]
                        const isEmpty = isFieldEmpty(raw)
                        const value = getPortraitValue(raw)
                        const isEditing = directEdit.field === field.key

                        return (
                          <div key={field.key}>
                            <div style={{ marginBottom: '1.5rem' }}>
                              <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                {field.label}
                              </p>

                              {isEmpty ? (
                                <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '0.75rem' }}>
                                  <p style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--fg-dim)', fontStyle: 'italic', marginBottom: field.special === 'directors_intent' ? '0.75rem' : 0 }}>
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
                                            border: 'none', borderBottom: '1px solid var(--line)',
                                            color: 'var(--fg)', fontFamily: 'var(--font-serif)', fontSize: '0.78rem',
                                            lineHeight: 1.6, padding: '0.4rem 0',
                                            resize: 'vertical', minHeight: '70px',
                                            outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box'
                                          }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                          <button onClick={saveDirectEdit} disabled={directEdit.saving} style={{ ...btnSmall, borderColor: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                            {directEdit.saving ? 'Saving...' : 'Save'}
                                          </button>
                                          <button onClick={() => setDirectEdit({ field: null, value: '', saving: false })} style={btnSmall}>Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={() => openDirectEdit(field.key)} style={{ ...btnSmall, borderColor: 'var(--accent-dim)', color: 'var(--accent)' }}>
                                        Write your intent
                                      </button>
                                    )
                                  )}
                                </div>
                              ) : (
                                <>
                                  {field.special === 'unresolved_questions' && Array.isArray(value) ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      {(value as Array<{ question: string; category: string; added_at: string }>).map((item, idx) => (
                                        <div key={`unresolved-${idx}`} style={{ borderLeft: '1px solid var(--line)', paddingLeft: '0.75rem' }}>
                                          <p style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#a8a098', margin: 0 }}>{item.question}</p>
                                          <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--accent-dim)', textTransform: 'uppercase' }}>{item.category}</span>
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
                                              border: 'none', borderBottom: '1px solid var(--line)',
                                              color: 'var(--fg)', fontFamily: 'var(--font-serif)', fontSize: '0.78rem',
                                              lineHeight: 1.6, padding: '0.4rem 0',
                                              resize: 'vertical', minHeight: '70px',
                                              outline: 'none', marginBottom: '0.75rem', boxSizing: 'border-box'
                                            }}
                                          />
                                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={saveDirectEdit} disabled={directEdit.saving} style={{ ...btnSmall, borderColor: 'var(--accent-dim)', color: 'var(--accent)' }}>
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

                            {idx < fieldsToRender.length - 1 && (
                              <div style={{ height: '1px', background: 'var(--line)', marginBottom: '1.5rem' }} />
                            )}
                          </div>
                        )
                        })
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* ARCHIVE TAB */}
              {contextTab === 'archive' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>

                    {/* SOURCE DOCUMENTS */}
                    <div style={{ borderBottom: '1px solid var(--line)', marginBottom: '0.75rem' }}>
                      <div style={{ padding: '0.4rem 1rem', fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                        Source Documents
                      </div>

                      {/* Script row */}
                      <div style={{ padding: '0.45rem 1rem', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ScrollText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />
                            {film?.source_documents?.script?.current ? (
                              <span
                                onClick={() => setOpenSourceDocument({ type: 'script', data: film.source_documents!.script! })}
                                style={{ fontSize: '0.72rem', color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
                              >
                                {film.source_documents.script.current.filename}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                                No script uploaded.
                              </span>
                            )}
                          </div>
                          {!film?.current_mode && (
                            <label style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: uploadingScript ? 'default' : 'pointer', opacity: uploadingScript ? 0.5 : 1 }}>
                              {uploadingScript ? 'Reading...' : (film?.source_documents?.script?.current ? 'Replace' : 'Upload')}
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                style={{ display: 'none' }}
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (!f) return
                                  if (f.size > 10 * 1024 * 1024) { setUploadError('File too large. Please upload a document under 10MB.'); return }
                                  e.target.value = ''
                                  setUploadingScript(true)
                                  handleScriptUpload(f).finally(() => setUploadingScript(false))
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Research rows */}
                      {(film?.source_documents?.research ?? []).map(doc => (
                        <div key={doc.id} style={{ padding: '0.45rem 1rem', borderBottom: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />
                              <span
                                onClick={() => setOpenSourceDocument({ type: 'research', data: doc })}
                                style={{ fontSize: '0.72rem', color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
                              >
                                {doc.filename}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.56rem', color: 'var(--fg-dim)' }}>
                              {formatDate(doc.uploaded_at)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Upload research */}
                      {!film?.current_mode && (
                        <div style={{ padding: '0.45rem 1rem' }}>
                          <label style={{ fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: uploadingResearch ? 'default' : 'pointer', opacity: uploadingResearch ? 0.5 : 1 }}>
                            {uploadingResearch ? 'Reading...' : '+ Upload Research'}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              style={{ display: 'none' }}
                              onChange={async e => {
                                const f = e.target.files?.[0]
                                if (!f) return
                                if (f.size > 10 * 1024 * 1024) { setUploadError('File too large. Please upload a document under 10MB.'); return }
                                e.target.value = ''
                                setUploadingResearch(true)
                                try {
                                  const formData = new FormData()
                                  formData.append('file', f)
                                  formData.append('filmId', filmId)
                                  const res = await fetch('/api/upload-research', { method: 'POST', body: formData })
                                  const data = await res.json()
                                  if (data.success) {
                                    const { data: freshFilm } = await supabase.from('films').select('*').eq('id', filmId).single()
                                    if (freshFilm) setFilm(freshFilm)
                                  } else {
                                    setUploadError(data.error || 'Something went wrong uploading your research. Try again.')
                                  }
                                } catch {
                                  setUploadError('Something went wrong uploading your research. Try again.')
                                } finally {
                                  setUploadingResearch(false)
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {!film?.current_mode && (
                      <div style={{ padding: '1rem', color: 'var(--fg-dim)', fontSize: '0.73rem', lineHeight: 1.7, fontStyle: 'italic' }}>
                        Production documents are generated in production modes. Enter a mode to begin.
                      </div>
                    )}

                    {film?.current_mode && (
                      <>
                        {(['producer', 'director', 'narrator', 'cinematographer', 'ai_specialist', 'editor'] as const).map(mode => (
                          <div key={mode} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-dim)', padding: '0.4rem 1rem' }}>
                              {mode.replace('_', ' ')}
                            </div>
                            {ARCHIVE_DOCUMENTS.filter(d => d.mode === mode).map(doc => {
                              const isGenerated = film.documents_generated?.some(d => d.document === doc.gateId)
                              const gateEntry = film.gates_closed?.find(g => g.gate === doc.gateId)
                              const isReopened = gateEntry?.status === 'reopened'
                              const isApproved = !!gateEntry && !isReopened
                              const hasPendingImport = importPending?.gateId === doc.gateId
                              const gateState: 'OPEN' | 'IN REVIEW' | 'LOCKED' | 'REOPENED' =
                                isReopened ? 'REOPENED' :
                                isApproved ? 'LOCKED' :
                                (isGenerated || hasPendingImport) ? 'IN REVIEW' : 'OPEN'
                              const stateColor =
                                gateState === 'LOCKED'    ? 'var(--accent)' :
                                gateState === 'REOPENED'  ? 'var(--gate-review)' :
                                gateState === 'IN REVIEW' ? 'var(--fg)' :
                                                            'var(--fg-dim)'
                              const iconColor =
                                gateState === 'LOCKED'    ? 'var(--accent)' :
                                gateState === 'REOPENED'  ? 'var(--gate-review)' :
                                gateState === 'IN REVIEW' ? 'var(--fg-dim)' :
                                                            'var(--fg-dim)'

                              return (
                                <div key={doc.gateId} ref={el => { archiveRowRefs.current[doc.gateId] = el ?? undefined }} style={{ padding: '0.45rem 1rem', borderBottom: '1px solid var(--line)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {ARCHIVE_ICON_MAP[doc.gateId](iconColor)}

                                    {/* Document name */}
                                    {(() => {
                                      const prereqGateId = GATE_PREREQUISITES[doc.gateId]
                                      const prereqMet = prereqGateId
                                        ? film.gates_closed?.some(g => g.gate === prereqGateId && !!g.closed_at) ?? false
                                        : true
                                      const isClickable = isGenerated || prereqMet
                                      return isClickable ? (
                                        <span
                                          onClick={() => setOpenDocument(doc.gateId)}
                                          style={{ fontSize: '0.72rem', color: isApproved ? 'var(--accent)' : isGenerated ? 'var(--fg)' : 'var(--fg-dim)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)', flex: 1, fontStyle: isGenerated ? 'normal' : 'italic' }}
                                        >
                                          {doc.label}
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.72rem', color: 'var(--fg-dim)', fontStyle: 'italic', flex: 1 }}>
                                          {doc.label}
                                        </span>
                                      )
                                    })()}

                                    {/* State label */}
                                    <span style={{
                                      fontSize: '0.56rem', letterSpacing: '0.10em',
                                      textTransform: 'uppercase', color: stateColor, flexShrink: 0,
                                    }}>
                                      {gateState}
                                    </span>
                                  </div>
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
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', fontStyle: 'italic', color: 'var(--fg-dim)', textAlign: 'center' }}>
                    Coming in the next story.
                  </p>
                </div>
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
      {openDocument && (() => {
        const doc = ARCHIVE_DOCUMENTS.find(d => d.gateId === openDocument)
        if (!doc) return null
        const isGenerated = film?.documents_generated?.some(d => d.document === openDocument)
        const gateEntry = film?.gates_closed?.find(g => g.gate === openDocument)
        const isReopened = gateEntry?.status === 'reopened'
        const isApproved = !!gateEntry && !isReopened
        const hasPendingImport = importPending?.gateId === openDocument
        const prereqGateId = GATE_PREREQUISITES[openDocument]
        const prereqMet = prereqGateId
          ? film?.gates_closed?.some(g => g.gate === prereqGateId && !!g.closed_at) ?? false
          : true
        const isOwningMode = film?.current_mode === doc.mode
        const canGenerate = prereqMet && isOwningMode
        const activeFlag = getActiveRippleFlag(openDocument)

        const gateState: 'OPEN' | 'IN REVIEW' | 'LOCKED' =
          isApproved ? 'LOCKED' :
          (isGenerated || hasPendingImport) ? 'IN REVIEW' : 'OPEN'

        const stateColor =
          gateState === 'LOCKED'    ? 'var(--accent)' :
          gateState === 'IN REVIEW' ? 'var(--fg)' :
                                      'var(--fg-dim)'

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: 'var(--bg-elev)', maxWidth: '700px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', position: 'relative' }}>

              {/* Header */}
              <div style={{ padding: '1.5rem 3rem 1rem', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                  {doc.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.56rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: stateColor }}>
                    {gateState}
                  </span>
                  <button
                    onClick={() => setOpenDocument(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', fontSize: '1rem', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content — scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                {isGenerated ? (
                  <div style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif)' }}>
                    {film?.documents_content?.[openDocument] ?? ''}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg-dim)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    This document hasn&apos;t been generated yet.
                  </p>
                )}
              </div>

              {/* Footer — fixed */}
              <div style={{ borderTop: '1px solid var(--line)', padding: '1rem 3rem', flexShrink: 0 }}>
                {activeFlag && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--gate-review)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>{doc.label} was generated after {GATE_LABELS[activeFlag]} was approved. It may reflect the previous version.</span>
                    <button onClick={() => dismissRippleFlag(activeFlag, openDocument)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gate-review)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.64rem', fontFamily: 'var(--font-serif)', flexShrink: 0 }}>
                      Dismiss
                    </button>
                  </div>
                )}
                {!prereqMet && prereqGateId && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                    Needs {GATE_LABELS[prereqGateId]} approved first.
                  </p>
                )}
                {prereqMet && !isOwningMode && !isGenerated && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                    Switch to {doc.mode.replace('_', ' ')} mode to generate.
                  </p>
                )}
                {hasPendingImport && importDiscussing && (
                  <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                    <button onClick={confirmImport} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontSize: '0.64rem', letterSpacing: '0.06em' }}>
                      Close gate
                    </button>
                    <button onClick={discardImport} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--fg-dim)', cursor: 'pointer', fontFamily: 'var(--font-serif)', fontSize: '0.64rem' }}>
                      Discard
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {gateState === 'OPEN' && (
                    <>
                      <button
                        onClick={() => canGenerate ? generateDocument(openDocument, doc.mode) : undefined}
                        disabled={generating === openDocument || !canGenerate}
                        style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: canGenerate ? 'var(--bg)' : 'var(--fg-dim)', background: canGenerate ? 'var(--accent)' : 'transparent', border: `1px solid ${canGenerate ? 'var(--accent)' : 'var(--line)'}`, padding: '0.5rem 1.25rem', cursor: canGenerate ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-serif)' }}
                      >
                        {generating === openDocument ? 'Generating...' : 'Generate'}
                      </button>
                      <label style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', padding: '0.5rem 1.25rem', border: '1px solid var(--line)', fontFamily: 'var(--font-serif)' }}>
                        {importLoading === openDocument ? 'Reading...' : 'Import'}
                        <input
                          ref={importFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          style={{ display: 'none' }}
                          onChange={e => { const file = e.target.files?.[0]; if (file) { importDocument(openDocument, file); e.target.value = '' } }}
                        />
                      </label>
                    </>
                  )}
                  {gateState === 'IN REVIEW' && !hasPendingImport && (
                    <button
                      onClick={() => approveGate(openDocument)}
                      style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bg)', background: 'var(--accent)', border: 'none', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                    >
                      Approve
                    </button>
                  )}
                  {gateState === 'LOCKED' && (
                    <button
                      onClick={() => reopenGate(openDocument)}
                      style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-dim)', background: 'none', border: '1px solid var(--line)', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* SOURCE DOCUMENT OVERLAY */}
      {openSourceDocument && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--bg-elev)', maxWidth: '700px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', position: 'relative' }}>

            {/* Header */}
            <div style={{ padding: '1.5rem 3rem 1rem', borderBottom: '1px solid var(--line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                {openSourceDocument.type === 'script' ? 'Uploaded Script' : 'Research Document'}
              </span>
              <button
                onClick={() => { setOpenSourceDocument(null); setShowScriptHistory(false) }}
                style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', fontSize: '1rem', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif)' }}>
                {openSourceDocument.type === 'script'
                  ? (openSourceDocument.data.current?.extracted_text ?? '')
                  : openSourceDocument.data.extracted_text}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--line)', padding: '1rem 3rem', flexShrink: 0 }}>
              <p style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', marginBottom: '0.75rem' }}>
                {openSourceDocument.type === 'script'
                  ? `Uploaded ${formatDate(openSourceDocument.data.current?.uploaded_at ?? '')}`
                  : `Uploaded ${formatDate(openSourceDocument.data.uploaded_at)}`}
              </p>

              {openSourceDocument.type === 'script' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!film?.current_mode && (
                    <label style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', padding: '0.5rem 1.25rem', border: '1px solid var(--line)', display: 'inline-block', fontFamily: 'var(--font-serif)' }}>
                      Replace Script
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          if (f.size > 10 * 1024 * 1024) { setUploadError('File too large. Please upload a document under 10MB.'); return }
                          e.target.value = ''
                          setOpenSourceDocument(null)
                          handleScriptUpload(f)
                        }}
                      />
                    </label>
                  )}
                  {(openSourceDocument.data.history ?? []).length > 0 && (
                    <div>
                      <span
                        onClick={() => setShowScriptHistory(prev => !prev)}
                        style={{ fontSize: '0.6rem', color: 'var(--fg-dim)', cursor: 'pointer', textDecoration: 'underline', letterSpacing: '0.08em' }}
                      >
                        {showScriptHistory ? 'Hide' : 'View'} previous versions ({openSourceDocument.data.history!.length})
                      </span>
                      {showScriptHistory && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {openSourceDocument.data.history!.map((v, i) => (
                            <div key={i} style={{ fontSize: '0.6rem', color: 'var(--fg-dim)' }}>
                              {v.filename} · {formatDate(v.uploaded_at)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
