'use client'

import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import {
  FileText, Clapperboard, LayoutList, Radio, Anchor,
  ScrollText, Mic, Lock, List, LayoutTemplate,
  Aperture, Sparkles, Scissors, Music, Pin,
  Sun, Wand2, Film, ChevronLeft, ChevronRight, Info
} from 'lucide-react'

type Message = { id: string; role: string; content: string }

type FilmakersWordsEntry = {
  text: string
  session_id: string | null
  mode: string
  captured_at: string | null
}

type ContinuityFlag = {
  flag: string
  source_a: string
  source_b: string
  status: 'open' | 'resolved'
  flagged_at: string
  filmmaker_response: string | null
}

type ToneSignal = {
  signal: string
  observed_in: string
  mode: string
  session_id: string
  captured_at: string
}

type ConfidenceDimension = 'strong' | 'developing' | 'needs_attention'

type GateConfidence = {
  coverage: ConfidenceDimension
  clarity: ConfidenceDimension
  consistency: ConfidenceDimension
  last_evaluated: string | null
}

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
  approved_content?: string
  confidence?: GateConfidence
}
type DocumentGenerated = {
  document: GateId
  generated_at: string
  source?: 'import'
}
type GateId = 'film_brief' | 'treatment' | 'narration_brief' | 'cinematography_brief' | 'sound_brief' | 'ai_brief' | 'editorial_brief' | 'mode_selection_brief' | 'hook_draft' | 'script_lock' | 'audio_direction' | 'consistency_lock' | 'shot_list' | 'camera_light_plan' | 'visual_prompt_package' | 'edit_plan' | 'music_cue_sheet'
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
  filmmakers_words?: FilmakersWordsEntry[] | string
  unresolved_threads?: string
  continuity_flags?: ContinuityFlag[]
  tone_signals?: ToneSignal[]
  raw_memory?: string
  updated_at?: string
  portrait_logline?:                  PortraitField | null
  portrait_emotional_core?:           PortraitField | null
  portrait_story?:                    PortraitField | null
  portrait_world?:                    PortraitField | null
  portrait_subjects?:                 PortraitField | null
  portrait_themes?:                   PortraitField | null
  portrait_approach?:                 PortraitField | null
  portrait_tone?:                     PortraitField | null
  portrait_visual_world?:             PortraitField | null
  portrait_audience?:                 PortraitField | null
  portrait_directors_intent?:         PortraitField | null
  portrait_unresolved_questions?:     PortraitUnresolvedField | null
  portrait_comparable_films?:         PortraitField | null
  portrait_target_length?:            PortraitField | null
  portrait_film_brief?:               PortraitField | null
  portrait_treatment?:                PortraitField | null
  portrait_narration_brief?:          PortraitField | null
  portrait_cinematography_brief?:     PortraitField | null
  portrait_sound_brief?:              PortraitField | null
  portrait_ai_brief?:                 PortraitField | null
  portrait_editorial_brief?:          PortraitField | null
}
type DirectEditState = { field: string | null; value: string; saving: boolean }
type EntryMode = 'uploading' | 'soul' | 'conversation'

// ── BUTTON STYLES ─────────────────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.12em',
  cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.2s'
}
const btnSecondary: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--line)', color: 'var(--fg-dim)',
  padding: '0.7rem 1.5rem', fontSize: '0.75rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.2s'
}
const btnSmall: React.CSSProperties = {
  background: 'transparent', border: '1px solid var(--line)', color: 'var(--fg-dim)',
  padding: '4px 10px', fontSize: '0.62rem', letterSpacing: '0.1em',
  cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", transition: 'all 0.2s'
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

const PORTRAIT_GATE_FIELDS: Array<{ key: keyof FilmMemory; label: string }> = [
  { key: 'portrait_film_brief',           label: 'Film Brief' },
  { key: 'portrait_treatment',            label: 'Treatment' },
  { key: 'portrait_narration_brief',      label: 'Narration' },
  { key: 'portrait_cinematography_brief', label: 'Cinematography' },
  { key: 'portrait_sound_brief',          label: 'Sound' },
  { key: 'portrait_ai_brief',             label: 'AI Direction' },
  { key: 'portrait_editorial_brief',      label: 'Editorial' },
]

const ARCHIVE_DOCUMENTS = [
  { mode: 'producer', label: 'Film Brief', gateId: 'film_brief' as GateId },
  { mode: 'director', label: 'Treatment', gateId: 'treatment' as GateId },
  { mode: 'director', label: 'Narration Brief', gateId: 'narration_brief' as GateId },
  { mode: 'director', label: 'Cinematography Brief', gateId: 'cinematography_brief' as GateId },
  { mode: 'director', label: 'Sound Brief', gateId: 'sound_brief' as GateId },
  { mode: 'director', label: 'AI Brief', gateId: 'ai_brief' as GateId },
  { mode: 'director', label: 'Editorial Brief', gateId: 'editorial_brief' as GateId },
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
  film_brief:            'Film Brief',
  treatment:             'Treatment',
  narration_brief:       'Narration Brief',
  cinematography_brief:  'Cinematography Brief',
  sound_brief:           'Sound Brief',
  ai_brief:              'AI Brief',
  editorial_brief:       'Editorial Brief',
  mode_selection_brief:  'Mode Selection Brief',
  hook_draft:            'Hook Draft',
  script_lock:           'Script Lock',
  audio_direction:       'Audio Direction',
  consistency_lock:      'Consistency Lock',
  shot_list:             'Shot List',
  camera_light_plan:     'Camera & Light Plan',
  visual_prompt_package: 'Visual Prompt Package',
  edit_plan:             'Edit Plan',
  music_cue_sheet:       'Music Cue Sheet',
}

type GatePrereq = GateId | GateId[]

function isPrereqMet(
  prereq: GatePrereq | undefined,
  gatesClosed: { gate: string; closed_at?: string; status?: string }[] | undefined
): boolean {
  if (!prereq) return true
  const closed = gatesClosed ?? []
  if (Array.isArray(prereq)) {
    return prereq.every(p => closed.some(g => g.gate === p && !!g.closed_at && g.status !== 'reopened'))
  }
  return closed.some(g => g.gate === prereq && !!g.closed_at && g.status !== 'reopened')
}

const ALL_FIVE_BRIEFS: GateId[] = ['narration_brief', 'cinematography_brief', 'sound_brief', 'ai_brief', 'editorial_brief']

const GATE_GENERATION_PREREQUISITES: Partial<Record<GateId, GatePrereq>> = {
  treatment:             'film_brief',
  narration_brief:       'treatment',
  cinematography_brief:  'treatment',
  sound_brief:           'treatment',
  ai_brief:              'treatment',
  editorial_brief:       'treatment',
  mode_selection_brief:  ALL_FIVE_BRIEFS,
  hook_draft:            'mode_selection_brief',
  script_lock:           'hook_draft',
  audio_direction:       'script_lock',
  consistency_lock:      ALL_FIVE_BRIEFS,
  shot_list:             'consistency_lock',
  camera_light_plan:     'shot_list',
  visual_prompt_package: ALL_FIVE_BRIEFS,
  edit_plan:             ALL_FIVE_BRIEFS,
  music_cue_sheet:       'edit_plan',
}

const GATE_APPROVAL_PREREQUISITES: Partial<Record<GateId, GatePrereq>> = {
  hook_draft:        'mode_selection_brief',
  script_lock:       'hook_draft',
  audio_direction:   'script_lock',
  shot_list:         'consistency_lock',
  camera_light_plan: 'shot_list',
  music_cue_sheet:   'edit_plan',
}

const GATE_ICON_MAP: Record<GateId, React.ReactNode> = {
  film_brief:            <FileText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  treatment:             <Clapperboard size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  narration_brief:       <Mic size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  cinematography_brief:  <Aperture size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  sound_brief:           <Music size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  ai_brief:              <Wand2 size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
  editorial_brief:       <Scissors size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />,
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
  narration_brief:       (c) => <Mic size={12} color={c} style={{ flexShrink: 0 }} />,
  cinematography_brief:  (c) => <Aperture size={12} color={c} style={{ flexShrink: 0 }} />,
  sound_brief:           (c) => <Music size={12} color={c} style={{ flexShrink: 0 }} />,
  ai_brief:              (c) => <Wand2 size={12} color={c} style={{ flexShrink: 0 }} />,
  editorial_brief:       (c) => <Scissors size={12} color={c} style={{ flexShrink: 0 }} />,
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

const MODE_CONFIG = [
  { key: 'discovery',       label: 'Discovery',      Icon: Sparkles     },
  { key: 'producer',        label: 'Producer',        Icon: Clapperboard },
  { key: 'director',        label: 'Director',        Icon: Sun          },
  { key: 'narrator',        label: 'Narrator',        Icon: Mic          },
  { key: 'cinematographer', label: 'Cinematographer', Icon: Aperture     },
  { key: 'ai_specialist',   label: 'AI Specialist',   Icon: Wand2        },
  { key: 'editor',          label: 'Editor',          Icon: Film         },
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
  '':              ['archive', 'portrait', 'memory'],
  'producer':      ['brief', 'archive', 'portrait', 'memory'],
  'director':      ['treatment', 'archive', 'portrait', 'memory'],
  'narrator':      ['segments', 'archive', 'portrait', 'memory'],
  'cinematographer': ['shot_list_tab', 'archive', 'portrait', 'memory'],
  'ai_specialist': ['images', 'archive', 'portrait', 'memory'],
  'editor':        ['edit_plan_tab', 'archive', 'portrait', 'memory'],
}

const TAB_LABELS: Record<string, string> = {
  portrait:       'PORTRAIT',
  archive:        'ARCHIVE',
  memory:         'MEMORY',
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

function mergeFilmakersWords(
  newWords: string | string[] | undefined,
  existingWords: FilmakersWordsEntry[] | string | undefined
): FilmakersWordsEntry[] {
  // Normalise existing to FilmakersWordsEntry[]
  const existing: FilmakersWordsEntry[] = Array.isArray(existingWords)
    ? existingWords.map(item =>
        typeof item === 'string'
          ? { text: item, session_id: null, mode: 'pre-migration', captured_at: null }
          : item
      )
    : typeof existingWords === 'string' && existingWords
      ? existingWords.split('|').map(p => ({ text: p.trim(), session_id: null, mode: 'pre-migration', captured_at: null })).filter(e => e.text)
      : []

  // Normalise incoming to plain strings
  const incoming: string[] = Array.isArray(newWords)
    ? newWords
    : typeof newWords === 'string' && newWords
      ? newWords.split('|').map(p => p.trim()).filter(Boolean)
      : []

  const existingTexts = existing.map(e => e.text)
  const merged: FilmakersWordsEntry[] = [...existing]
  for (const phrase of incoming) {
    if (!existingTexts.some(t =>
      t.toLowerCase().includes(phrase.toLowerCase()) ||
      phrase.toLowerCase().includes(t.toLowerCase())
    )) {
      merged.push({ text: phrase, session_id: null, mode: 'discovery', captured_at: new Date().toISOString() })
      existingTexts.push(phrase)
    }
  }
  return merged
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
  createdBy: string = 'studio',
  corrections: string[] = [],
) {
  const longer = (a?: string, b?: string) =>
    (a?.length ?? 0) >= (b?.length ?? 0) ? a : b

  const mergedMemory: Record<string, any> = {
    emotional_core:     longer(extracted?.emotional_core,     existing?.emotional_core),
    decisions_made:     longer(extracted?.decisions_made,     existing?.decisions_made),
    unresolved_threads: longer(extracted?.unresolved_threads, existing?.unresolved_threads),
    characters: (JSON.stringify(extracted?.characters)?.length ?? 0) >=
                (JSON.stringify(existing?.characters)?.length ?? 0)
                ? extracted?.characters : existing?.characters,
    updated_at: new Date().toISOString(),
  }
  mergedMemory.filmmakers_words = mergeFilmakersWords(
    extracted?.filmmakers_words,
    existing?.filmmakers_words
  )

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
      const isCorrection = corrections.includes(field)
      if (isCorrection || extracted_value.length > existing_value.length) {
portraitUpdates[field] = {
          value: extracted_value,
          created_by: createdBy,
          created_in_mode: isCorrection ? 'correction' : (createdBy === 'import' ? 'import' : 'discovery'),
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
    documents_stale?: Partial<Record<GateId, boolean>>
    source_documents?: {
      script?: {
        current?: { filename: string; extracted_text: string; uploaded_at: string }
        history?: Array<{ filename: string; extracted_text: string; uploaded_at: string }>
      }
      research?: Array<{ id: string; filename: string; extracted_text: string; uploaded_at: string }>
    }
    film_status?: 'active' | 'paused' | 'closed' | 'archived'
    status_history?: Array<{
      status: string
      reason: string
      changed_at: string
    }>
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
  const [generateError, setGenerateError] = useState<GateId | null>(null)
  const [conversationWarningGate, setConversationWarningGate] = useState<GateId | null>(null)
  const [importPending, setImportPending] = useState<{
    gateId: GateId
    filename: string
    summary: string
    fieldsUpdated: string[]
    fieldsAbsent: string[]
    extractedPortrait: any
  } | null>(null)
  const [importDiscussing, setImportDiscussing] = useState(false)
  const [importConfirming, setImportConfirming] = useState(false)
  const [importLoading, setImportLoading] = useState<GateId | null>(null)
  const [filmMemory, setFilmMemory] = useState<FilmMemory | null>(null)
  const [portraitRefreshedAt, setPortraitRefreshedAt] = useState<string | null>(null)
  const [directEdit, setDirectEdit] = useState<DirectEditState>({ field: null, value: '', saving: false })
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Array<{ id: string; film_id: string; created_at: string; title: string | null; is_active: boolean; mode_at_creation: string | null }>>([])
  const [visibleSessionCount, setVisibleSessionCount] = useState(5)
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null)
  const [viewingMessages, setViewingMessages] = useState<Array<{ id: string; role: string; content: string }>>([])
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [panelDocked, setPanelDocked] = useState(false)
  const [hoveredMode, setHoveredMode] = useState<string | null>(null)
  const [stripHovered, setStripHovered] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1440)
  const [tooltipGate, setTooltipGate] = useState<GateId | null>(null)
  const [showAllWords, setShowAllWords] = useState(false)
  const [showAllArchive, setShowAllArchive] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const archiveRowRefs = useRef<Partial<Record<GateId, HTMLDivElement>>>({})
  const hasGreeted = useRef(false)
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

      // Find or create the active session for this film
      const { data: activeSessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('film_id', filmId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      let sessionId: string
      if (activeSessionData && activeSessionData.length > 0) {
        sessionId = activeSessionData[0].id
        setActiveSessionId(sessionId)
        const { data: msgData } = await supabase
          .from('messages')
          .select('*')
          .eq('film_id', filmId)
          .eq('session_id', sessionId)
          .order('created_at')
        if (msgData && msgData.length > 0) {
          setMessages(msgData)
          setEntryMode('conversation')
        } else {
          const { count: priorCount } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('film_id', filmId)
            .eq('is_active', false)
          setEntryMode('conversation')
          await openingMessage(filmData.title || 'Untitled Film', priorCount && priorCount > 0 ? 'RETURNING' : 'FIRST', sessionId)
        }
      } else {
        // No active session — check for prior sessions to determine greeting type
        const { count: priorCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('film_id', filmId)
        const { data: newSession } = await supabase
          .from('sessions')
          .insert({ film_id: filmId, is_active: true, mode_at_creation: filmData.current_mode ?? 'discovery' })
          .select()
          .single()
        sessionId = newSession.id
        setActiveSessionId(sessionId)
        setEntryMode('conversation')
        await openingMessage(filmData.title || 'Untitled Film', priorCount && priorCount > 0 ? 'RETURNING' : 'FIRST', sessionId)
      }
      await fetchSessions()
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Reset context tab and archive filter when mode changes
  useEffect(() => {
    setContextTab(getDefaultTab(film?.current_mode ?? null))
    setShowAllArchive(false)
  }, [film?.current_mode])


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

  const switchMode = async (modeValue: string | null, fromConversation: boolean = false) => {
    const { error } = await supabase.from('films').update({ current_mode: modeValue }).eq('id', filmId)
    if (!error) {
      setFilm(prev => prev ? { ...prev, current_mode: modeValue } : null)
      if (fromConversation) {
        const displayName = (
          MODE_CONFIG.find(m => m.key === (modeValue ?? 'discovery'))?.label ?? 'Discovery'
        ).toUpperCase()
        const divider = {
          id: crypto.randomUUID(),
          type: 'mode_divider' as const,
          mode: displayName,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, divider as any])
      }
    }
  }

  const openingMessage = async (title: string, sessionType: 'FIRST' | 'RETURNING' = 'FIRST', sessionId?: string) => {
    if (hasGreeted.current) return
    hasGreeted.current = true
    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, messages: [], filmMemory: memoryData, sessionType, filmTitle: title, currentMode: film?.current_mode ?? null })
    })
    const data = await response.json()
    await supabase.from('messages').insert({ role: 'assistant', content: data.content, film_id: filmId, session_id: sessionId ?? null })
    setMessages([{ id: 'opening', role: 'assistant', content: data.content }])
  }

  const beginFromConversation = async () => {
    if (hasGreeted.current) return
    setEntryMode('conversation')
    await openingMessage(film?.title || 'Untitled Film', 'FIRST', activeSessionId ?? undefined)
  }

  const startNewConversation = async () => {
    if (!film) return
    if (activeSessionId) {
      await supabase.from('sessions').update({ is_active: false }).eq('id', activeSessionId)
    }
    const { data: newSession } = await supabase
      .from('sessions')
      .insert({ film_id: filmId, is_active: true, mode_at_creation: film.current_mode ?? 'discovery' })
      .select()
      .single()
    if (!newSession) return
    setActiveSessionId(newSession.id)
    setMessages([])
    hasGreeted.current = false
    await openingMessage(film.title || 'Untitled Film', 'RETURNING', newSession.id)
    await fetchSessions()
  }

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('film_id', filmId)
      .order('created_at', { ascending: false })
    if (data) setSessions(data)
  }

  const viewSession = async (sessionId: string) => {
    setViewingSessionId(sessionId)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at')
    setViewingMessages(data ?? [])
  }

  const returnToCurrentSession = () => setViewingSessionId(null)

  const deleteSession = async (sessionId: string) => {
    await supabase.from('messages').delete().eq('session_id', sessionId)
    await supabase.from('sessions').delete().eq('id', sessionId)
    if (viewingSessionId === sessionId) setViewingSessionId(null)
    setDeleteConfirmSessionId(null)
    await fetchSessions()
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

      const { data: freshFilm } = await supabase.from('films').select('*').eq('id', filmId).single()
      if (freshFilm) setFilm(freshFilm)

      const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      const openingResponse = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filmId, messages: [], filmMemory: freshMemory, sessionType: 'SCRIPT_UPLOAD', filmTitle: film?.title, currentMode: film?.current_mode ?? null })
      })
      const openingData = await openingResponse.json()
      const openingText = openingData.content

      await supabase.from('messages').insert({ role: 'assistant', content: openingText, film_id: filmId, session_id: activeSessionId })

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

    // Auto-title: fire on the first user message in this session
    const isFirstUserMessage = activeSessionId && !messages.some(m => m.role === 'user')
    if (isFirstUserMessage) {
      fetch('/api/sessions/auto-title', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, firstMessage: t }),
      }).then(r => r.json()).then(data => {
        if (data.title) {
          setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: data.title } : s))
        }
      }).catch(() => {})
    }

    const userMessage = { role: 'user', content: t, film_id: filmId, session_id: activeSessionId }
    await supabase.from('messages').insert(userMessage)
    const updated = [...messages, { id: Date.now().toString(), role: 'user', content: t }]
    setMessages(updated)

    const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()

    // Conversational mode detection
    const MODE_NAME_MAP: Array<{ names: string[]; key: string | null }> = [
      { names: ['discovery'], key: null },
      { names: ['producer'], key: 'producer' },
      { names: ['director'], key: 'director' },
      { names: ['narrator'], key: 'narrator' },
      { names: ['cinematographer'], key: 'cinematographer' },
      { names: ['ai specialist', 'ai_specialist'], key: 'ai_specialist' },
      { names: ['editor'], key: 'editor' },
    ]
    const SWITCH_PREFIXES = ['switch to', 'go to', 'take me to', "let's talk to", 'as the']
    const lowerText = t.toLowerCase()
    let switchedModeValue: string | null | undefined = undefined
    outer: for (const { names, key } of MODE_NAME_MAP) {
      for (const name of names) {
        if (name === 'discovery' && /back to discovery/.test(lowerText)) {
          switchedModeValue = null; break outer
        }
        for (const prefix of SWITCH_PREFIXES) {
          if (lowerText.includes(`${prefix} ${name}`)) {
            switchedModeValue = key; break outer
          }
        }
        if (lowerText.includes(`${name} mode`)) {
          switchedModeValue = key; break outer
        }
      }
    }
    if (switchedModeValue !== undefined) {
      await switchMode(switchedModeValue, true)
    }

    // Use the just-switched mode value if available — setFilm is async and the
    // film closure won't reflect the update until the next render.
    const effectiveMode = switchedModeValue !== undefined ? switchedModeValue : (film?.current_mode ?? null)

    // Find any IN REVIEW document for the current mode to enable staleness detection
    const currentModeForStale = effectiveMode
    const inReviewDocument = (() => {
      if (!currentModeForStale) return null
      const modeDocs = ARCHIVE_DOCUMENTS.filter(d => d.mode === currentModeForStale)
      for (const doc of modeDocs) {
        const isGenerated = film?.documents_generated?.some(d => d.document === doc.gateId)
        const gateEntry = film?.gates_closed?.find(g => g.gate === doc.gateId)
        const isApproved = !!gateEntry && gateEntry.status !== 'reopened'
        if (isGenerated && !isApproved) {
          const content = film?.documents_content?.[doc.gateId]
          if (content) return { type: doc.gateId, content }
        }
      }
      return null
    })()

    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filmId, messages: updated.filter(m => (m as any).type !== 'mode_divider').map(m => ({ role: m.role, content: m.content })), filmMemory: memoryData, sessionType: 'RETURNING', filmTitle: film?.title, currentMode: effectiveMode, gatesClosed: film?.gates_closed ?? [], inReviewDocument })
    })
    const data = await response.json()

    await supabase.from('messages').insert({ role: 'assistant', content: data.content, film_id: filmId, session_id: activeSessionId })
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.content, mode: effectiveMode }])

    // Write is_stale flag when staleness nudge was fired
    if (data.stale_document_id) {
      const updatedStale = { ...(film?.documents_stale ?? {}), [data.stale_document_id]: true }
      await supabase.from('films').update({ documents_stale: updatedStale }).eq('id', filmId)
      setFilm(prev => prev ? { ...prev, documents_stale: updatedStale } : null)
    }

    if (data.memory) {
      if (memoryData) {
        const allPortrait = data.portrait ?? {}
        const filmCorrections: string[] = data.corrections ?? []
        // In production modes, portrait updates are gated to discovery.
        // Exception: explicit corrections always apply regardless of mode.
        // Exception: first-time writes (no existing value) always apply regardless of mode.
        const existingPortraitKeys = memoryData ? Object.keys(memoryData).filter(k => {
          const field = (memoryData as any)[k]
          return field && (typeof field === 'object') && field.value && field.value !== ''
        }) : []

        const portraitToMerge = film?.current_mode
          ? Object.fromEntries(
              Object.entries(allPortrait).filter(([k]) =>
                filmCorrections.includes(k) || !existingPortraitKeys.includes(k)
              )
            )
          : allPortrait
        await mergeMemory(data.memory, portraitToMerge, memoryData, filmId, supabase, 'studio', filmCorrections)
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
    // Story 3 — snapshot the document text at the moment of approval.
    // This survives any future regeneration and can be recovered if the gate is reopened.
    const approvedContent = film?.documents_content?.[gateId]
    const newGate: GateClosed = {
      gate: gateId,
      closed_at: new Date().toISOString(),
      ...(clearedBy ? { cleared_by: clearedBy } : {}),
      ...(approvedContent ? { approved_content: approvedContent } : {}),
    }
    const existing = film?.gates_closed ?? []
    const updated = existing.some(g => g.gate === gateId)
      ? existing.map(g => g.gate === gateId ? newGate : g)
      : [...existing, newGate]
    await supabase.from('films').update({ gates_closed: updated }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, gates_closed: updated } : null)

    // Fire extraction pass after gate closes
    const documentContent = film?.documents_content?.[gateId] ?? film?.gates_closed?.find(g => g.gate === gateId)?.approved_content ?? ''
    if (documentContent) {
      const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      const extractionResponse = await fetch('/api/gate-approval-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateId,
          filmId,
          filmTitle: film?.title ?? '',
          documentContent,
          filmMemory: freshMemory,
          sourceType: 'matinee_generated',
        }),
      })
      const extractionResult = await extractionResponse.json()
      const { data: freshFilm } = await supabase
        .from('films')
        .select('*')
        .eq('id', filmId)
        .single()
      if (freshFilm) {
        // Patch confidence directly from API response if Supabase re-fetch hasn't caught up
        if (extractionResult?.confidence && freshFilm.gates_closed) {
          freshFilm.gates_closed = freshFilm.gates_closed.map((g: GateClosed) =>
            g.gate === gateId
              ? { ...g, confidence: { ...extractionResult.confidence, last_evaluated: new Date().toISOString() } }
              : g
          )
        }
        setFilm(freshFilm)
      }
      await refreshPortrait()
    }
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

  // Returns true if at least one assistant response has been delivered in the given mode.
  // Assistant messages receive `mode` on the first reply after a mode switch (line ~925).
  const checkConversationExists = (modeId: string): boolean =>
    messages.some(m => (m as any).mode === modeId && m.role === 'assistant')

  const generateDocument = async (gateId: GateId, owningMode: string) => {
    setGenerating(gateId)
    setGenerateError(null)
    // Reset staleness before generating
    const staleReset = { ...(film?.documents_stale ?? {}), [gateId]: false }
    await supabase.from('films').update({ documents_stale: staleReset }).eq('id', filmId)
    setFilm(prev => prev ? { ...prev, documents_stale: staleReset } : null)
    try {
      const { data: memoryData } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()

      // Story 1 — pass current document content so regeneration refines rather than replaces.
      const existingDocumentContent = film?.documents_content?.[gateId] ?? undefined

      // Story 2 — a gate with status 'reopened' was explicitly reopened by the filmmaker;
      // pass forceRegenerate so the server-side lock check permits the write.
      const gateEntry = film?.gates_closed?.find(g => g.gate === gateId)
      const forceRegenerate = gateEntry?.status === 'reopened'

      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateId,
          filmId,
          filmTitle: film?.title,
          filmMemory: memoryData,
          portrait: memoryData,
          gatesClosed: film?.gates_closed ?? [],
          closedDocumentContent: film?.documents_content ?? {},
          existingDocumentContent,
          forceRegenerate,
        })
      })

      const data = await response.json()

      if (!data.success) {
        setGenerateError(gateId)
        return
      }

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
        await supabase.from('messages').insert({ role: 'assistant', content: data.summary, film_id: filmId, session_id: activeSessionId })
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

  const approveGateFromImport = async (gateId: GateId, filename: string, documentContent: string) => {
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

    // Fire extraction pass after gate closes — best-effort, gate closure is primary
    if (documentContent) {
      try {
        const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
        const extractionResponse = await fetch('/api/gate-approval-extraction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gateId,
            filmId,
            filmTitle: film?.title ?? '',
            documentContent,
            filmMemory: freshMemory,
            sourceType: 'filmmaker_uploaded',
          }),
        })
        const extractionResult = await extractionResponse.json()
        const { data: freshFilm } = await supabase
          .from('films')
          .select('*')
          .eq('id', filmId)
          .single()
        if (freshFilm) {
          if (extractionResult?.confidence && freshFilm.gates_closed) {
            freshFilm.gates_closed = freshFilm.gates_closed.map((g: GateClosed) =>
              g.gate === gateId
                ? { ...g, confidence: { ...extractionResult.confidence, last_evaluated: new Date().toISOString() } }
                : g
            )
          }
          setFilm(freshFilm)
        }
      } catch (err) {
        console.error('gate-approval-extraction failed:', err)
      } finally {
        await refreshPortrait()
      }
    }
  }

  const confirmImport = async () => {
    if (!importPending) return
    const { gateId, filename, summary, extractedPortrait } = importPending
    setImportConfirming(true)
    try {
      const { data: existingMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      if (existingMemory) {
        await mergeMemory({}, extractedPortrait, existingMemory, filmId, supabase, 'import')
      }

      const { data: freshMemory } = await supabase.from('film_memory').select('*').eq('film_id', filmId).single()
      let documentContent = summary
      try {
        const genResponse = await fetch('/api/generate-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gateId,
            filmTitle: film?.title,
            filmMemory: freshMemory,
            portrait: freshMemory,
            gatesClosed: film?.gates_closed ?? [],
            closedDocumentContent: film?.documents_content ?? {},
            importedContent: summary,
          })
        })
        const genData = await genResponse.json()
        if (genData.success) documentContent = genData.content
      } catch {}

      const updatedContent = { ...(film?.documents_content ?? {}), [gateId]: documentContent }
      const newGenerated: DocumentGenerated = { document: gateId, generated_at: new Date().toISOString(), source: 'import' }
      const updatedGenerated = [...(film?.documents_generated ?? []), newGenerated]
      await supabase.from('films').update({ documents_content: updatedContent, documents_generated: updatedGenerated }).eq('id', filmId)
      setFilm(prev => prev ? { ...prev, documents_content: updatedContent, documents_generated: updatedGenerated } : null)

      await approveGateFromImport(gateId, filename, documentContent)

      if (contextPanelOpen && contextTab === 'portrait') await refreshPortrait()
      setImportPending(null)
      setImportDiscussing(false)
    } finally {
      setImportConfirming(false)
    }
  }

  const discardImport = () => {
    setImportPending(null)
    setImportDiscussing(false)
    if (importFileInputRef.current) importFileInputRef.current.value = ''
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) return (
    <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '0.2em', fontSize: '0.85rem' }}>
      Setting the scene...
    </main>
  )

  // ── BLOCKED SCREEN ─────────────────────────────────────────────────────────
  if (filmBlocked && film) {
    return (
      <main style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', system-ui, sans-serif", color: 'var(--fg)', position: 'relative' }}>
        <span style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '13px', fontStyle: 'italic', color: 'var(--fg-dim)', whiteSpace: 'nowrap' }}>
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
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: 'var(--fg)',
        position: 'relative',
      }}>

        {/* Film title — pinned top-centre */}
        <span style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "'DM Sans', system-ui, sans-serif",
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
              fontFamily: "'DM Sans', system-ui, sans-serif",
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
              fontFamily: "'DM Sans', system-ui, sans-serif",
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
  const canPin = viewportWidth - 220 - 400 >= 600

  // ── MAIN STUDIO ────────────────────────────────────────────────────────────
  return (
    <main style={{ backgroundColor: 'var(--bg)', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', system-ui, sans-serif", color: 'var(--fg)', overflow: 'hidden' }}>

      {/* ── HEADER STRIP ── */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 2rem', height: '44px', flexShrink: 0,
        borderBottom: '1px solid var(--line)', backgroundColor: 'var(--bg-elev)',
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '15px', fontWeight: 500,
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
          width: railCollapsed ? '52px' : '220px',
          flexShrink: 0,
          height: '100%',
          backgroundColor: 'var(--bg-elev)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflow: railCollapsed ? 'visible' : 'hidden',
          transition: 'width 0.2s ease',
        }}>
          {/* Film title row */}
          {railCollapsed ? (
            <div style={{ height: '48px', borderBottom: '1px solid var(--line)', flexShrink: 0 }} />
          ) : (
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
                  fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '13px', fontStyle: 'italic',
                  color: 'var(--fg-dim)', outline: 'none', cursor: 'text',
                  display: 'block', lineHeight: 1.5,
                }}
              >
                {film?.title}
              </span>
            </div>
          )}

          {/* Scrollable area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Mode list */}
            <div>
              {MODE_CONFIG.map(({ key, label, Icon }) => {
                const modeValue = key === 'discovery' ? null : key
                const isActive = (film?.current_mode ?? null) === modeValue
                const isHov = hoveredMode === key
                const modeDocs = modeValue !== null ? ARCHIVE_DOCUMENTS.filter(d => d.mode === modeValue) : []
                let isGated = false
                if (modeDocs.length > 0) {
                  const firstDoc = modeDocs[0]
                  const genPrereq = GATE_GENERATION_PREREQUISITES[firstDoc.gateId]
                  if (genPrereq) {
                    isGated = !isPrereqMet(genPrereq, film?.gates_closed)
                  }
                }
                const iconColor = isActive ? 'var(--accent)' : 'var(--fg-dim-2)'
                const bgColor = isActive ? 'rgba(200,169,110,0.07)' : isHov ? 'var(--bg-elev-2)' : 'transparent'
                const handleModeClick = async () => {
                  await switchMode(modeValue, true)
                }

                if (railCollapsed) {
                  return (
                    <div
                      key={key}
                      onClick={handleModeClick}
                      onMouseEnter={() => setHoveredMode(key)}
                      onMouseLeave={() => setHoveredMode(null)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '8px 0', cursor: 'pointer',
                        backgroundColor: bgColor, position: 'relative',
                      }}
                    >
                      <Icon size={16} strokeWidth={1.5} color={iconColor} />
                      {isActive && (
                        <span style={{
                          position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                          width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent)',
                        }} />
                      )}
                      {isHov && (
                        <div style={{
                          position: 'absolute', left: '46px',
                          backgroundColor: 'var(--bg-elev)', border: '1px solid var(--line)',
                          color: 'var(--fg)', fontSize: '10px', letterSpacing: '0.07em',
                          textTransform: 'uppercase', padding: '3px 8px',
                          borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 50,
                          pointerEvents: 'none',
                        }}>
                          {label}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div
                    key={key}
                    onClick={handleModeClick}
                    onMouseEnter={() => setHoveredMode(key)}
                    onMouseLeave={() => setHoveredMode(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '7px 14px', cursor: 'pointer',
                      backgroundColor: bgColor,
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} color={iconColor} />
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: isActive ? 'var(--fg)' : 'var(--fg-dim-2)',
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    {isActive && (
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent)', flexShrink: 0 }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sessions section */}
            {!railCollapsed && (
              <div style={{ borderTop: '1px solid var(--line)', marginTop: '6px', paddingTop: '6px', position: 'relative' }}>

                {/* New Conversation button */}
                <div style={{ padding: '0 14px 6px' }}>
                  <button
                    onClick={startNewConversation}
                    style={{
                      width: '100%', background: 'transparent',
                      border: '1px solid var(--line)',
                      color: 'var(--fg-dim)',
                      fontFamily: 'var(--font-mono)', fontSize: '9px',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '5px 0', cursor: 'pointer', borderRadius: '2px',
                    }}
                  >
                    + New Conversation
                  </button>
                </div>

                {/* Session rows */}
                {sessions.slice(0, visibleSessionCount).map(session => {
                  const isActive = session.id === activeSessionId
                  const isViewing = session.id === viewingSessionId
                  const sessionDate = new Date(session.created_at)
                  const dateLabel = sessionDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                  const timeLabel = sessionDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  const modeLabel = session.mode_at_creation
                    ? session.mode_at_creation.charAt(0).toUpperCase() + session.mode_at_creation.slice(1)
                    : 'Discovery'
                  const defaultTitle = `${dateLabel} · ${modeLabel}`
                  const displayTitle = session.title || defaultTitle

                  return (
                    <div
                      key={session.id}
                      onClick={() => { if (isActive) { if (viewingSessionId) returnToCurrentSession() } else { viewSession(session.id) } }}
                      style={{
                        padding: '7px 14px 7px 12px',
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                        backgroundColor: isViewing ? 'var(--bg-elev-2)' : 'transparent',
                        cursor: isActive && !viewingSessionId ? 'default' : 'pointer',
                      }}
                    >
                      {/* Indicator dot */}
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
                        backgroundColor: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                      }} />

                      {/* Name + timestamp */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onClick={e => e.stopPropagation()}
                          onBlur={async (e) => {
                            const newTitle = e.currentTarget.textContent?.trim()
                            if (!newTitle || newTitle === displayTitle) return
                            await supabase.from('sessions').update({ title: newTitle }).eq('id', session.id)
                            await fetchSessions()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
                            e.stopPropagation()
                          }}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.04em',
                            color: isActive ? 'var(--fg)' : 'var(--fg-dim)',
                            display: 'block', lineHeight: 1.4, outline: 'none', cursor: 'text',
                            overflow: 'hidden', whiteSpace: 'nowrap',
                          }}
                        >
                          {displayTitle}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px',
                          color: 'var(--fg-dim-2)', display: 'block', marginTop: '2px',
                        }}>
                          {dateLabel} · {timeLabel}
                        </span>
                      </div>

                      {/* ••• menu — past sessions only */}
                      {!isActive && (
                        <span
                          onClick={e => { e.stopPropagation(); setDeleteConfirmSessionId(session.id) }}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--fg-dim-2)', cursor: 'pointer',
                            letterSpacing: '0.05em', padding: '2px 0', flexShrink: 0,
                          }}
                        >
                          •••
                        </span>
                      )}
                    </div>
                  )
                })}

                {/* More button */}
                {sessions.length > visibleSessionCount && (
                  <div
                    onClick={() => setVisibleSessionCount(prev => prev + 5)}
                    style={{
                      padding: '4px 14px 8px 26px',
                      fontFamily: 'var(--font-mono)', fontSize: '9px',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--fg-dim-2)', cursor: 'pointer',
                    }}
                  >
                    More ↓
                  </div>
                )}

                {/* Delete confirmation overlay */}
                {deleteConfirmSessionId && sessions.find(s => s.id === deleteConfirmSessionId && !s.is_active) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: 'var(--bg-elev)', zIndex: 20,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: '16px 14px',
                  }}>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: '10px',
                      color: 'var(--fg)', marginBottom: '6px',
                    }}>
                      Delete this session?
                    </p>
                    <p style={{
                      fontFamily: 'var(--font-mono)', fontSize: '9px',
                      color: 'var(--fg-dim)', marginBottom: '12px', lineHeight: 1.5,
                    }}>
                      Messages deleted. Film Memory unaffected.
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => deleteSession(deleteConfirmSessionId)}
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px',
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          backgroundColor: 'transparent', border: '1px solid var(--line)',
                          color: 'var(--fg)', padding: '4px 10px', cursor: 'pointer', borderRadius: '2px',
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSessionId(null)}
                        style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px',
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          backgroundColor: 'transparent', border: 'none',
                          color: 'var(--fg-dim)', padding: '4px 8px', cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Chevron toggle at bottom */}
          <div
            onClick={() => setRailCollapsed(prev => !prev)}
            style={{
              borderTop: '1px solid var(--line)', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              justifyContent: railCollapsed ? 'center' : 'flex-end',
              padding: railCollapsed ? '8px 0' : '8px 12px',
            }}
          >
            {railCollapsed
              ? <ChevronRight size={14} strokeWidth={1.5} color="var(--fg-dim-2)" />
              : <ChevronLeft size={14} strokeWidth={1.5} color="var(--fg-dim-2)" />
            }
          </div>

        </div>

        {/* ── CONVERSATION ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, backgroundColor: 'var(--bg)', position: 'relative' }}>
          {/* Overlay — closes floating panel on outside click */}
          {contextPanelOpen && !panelDocked && (
            <div
              onClick={() => setContextPanelOpen(false)}
              style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: 'default' }}
            />
          )}

          {/* Past session banner */}
          {viewingSessionId && (
            <div
              onClick={returnToCurrentSession}
              style={{
                padding: '10px 3rem', flexShrink: 0,
                backgroundColor: 'var(--bg-elev)', borderBottom: '1px solid var(--line)',
                fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em',
                color: 'var(--fg-dim)', cursor: 'pointer',
              }}
            >
              Past session · Return to current conversation →
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 3rem 2rem' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {(viewingSessionId ? viewingMessages : messages).map((msg, i, arr) => {
                if ((msg as any).type === 'mode_divider') {
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      margin: '2rem 0', color: 'var(--fg-dim-2)',
                    }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--fg-dim-2)', opacity: 0.25 }} />
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '8px',
                        letterSpacing: '0.22em', textTransform: 'uppercase',
                        color: 'var(--fg-dim-2)', whiteSpace: 'nowrap',
                      }}>
                        {(msg as any).mode}
                      </span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--fg-dim-2)', opacity: 0.25 }} />
                    </div>
                  )
                }
                const isUser = msg.role === 'user'
                // Show separator before a Matinee message that follows a user message
                const showSeparator = !isUser && i > 0 && (arr[i - 1] as any).type !== 'mode_divider' && arr[i - 1].role === 'user'
                return (
                  <div key={i}>
                    {showSeparator && (
                      <hr style={{
                        border: 'none', borderTop: '1px solid var(--line)',
                        margin: '24px 0', width: '100%'
                      }} />
                    )}
                    {isUser ? (
                      <div style={{ marginLeft: '2%', paddingLeft: '1rem', borderLeft: '2px solid var(--accent-dim)', marginBottom: '1.5rem', marginTop: i === 0 ? 0 : '1.5rem' }}>
                        <p style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--fg-dim)', fontWeight: 400, margin: 0 }}>
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '1.5rem' }}>
                        {(msg as any).mode !== undefined && (
                          <p style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            color: 'var(--fg-dim)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            marginBottom: '0.4rem',
                            opacity: 0.5
                          }}>
                            {(msg as any).mode === null ? 'Discovery' : (msg as any).mode}
                          </p>
                        )}
                        <p style={{ fontSize: '16px', lineHeight: 1.65, color: 'var(--fg)', fontWeight: 300, margin: 0 }}>
                          {msg.content}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* THINKING — animated dots */}
              {thinking && !viewingSessionId && (
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
              {importPending && !importDiscussing && !viewingSessionId && (
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

          {/* INPUT — hidden when viewing a past session */}
          {!viewingSessionId && <div style={{ borderTop: '1px solid var(--line)', padding: '1.25rem 3rem 1.75rem', flexShrink: 0 }}>
  <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <input
      ref={inputRef}
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && sendMessage()}
      placeholder="Speak..."
      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '15px', outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    />
    <span
      onClick={() => sendMessage()}
      style={{ color: input.trim() ? 'var(--accent)' : '#706C68', cursor: 'pointer', fontSize: '1.1rem', transition: 'color 0.2s' }}
    >
      →
    </span>
  </div>
</div>}
        </div>

        {/* ── CONTEXT PANEL ── */}
        <div style={{
          position: 'relative',
          flexShrink: 0,
          width: contextPanelOpen && panelDocked ? '400px' : '32px',
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
              fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.06em',
              color: !contextPanelOpen && stripHovered ? 'var(--fg)' : '#8A8682',
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              marginBottom: '8px',
              transition: `color var(--dur-fast) var(--ease-stage)`,
              overflow: 'hidden', maxHeight: '160px', whiteSpace: 'nowrap',
            }}>
              {film?.title || 'UNTITLED FILM'}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1,
              color: !contextPanelOpen && stripHovered ? 'var(--fg)' : '#8A8682',
              transition: `color var(--dur-fast) var(--ease-stage)`,
            }}>
              ‹
            </span>
          </div>

          {/* Open panel — floating (position:absolute, z-index:10) or docked (z-index:2) */}
          {contextPanelOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '400px',
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
                      fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.06em',
                      textTransform: 'uppercase', cursor: 'pointer',
                      color: isActive ? '#F0EDE3' : '#8A8682',
                      borderBottom: isActive ? '2px solid #C4974A' : 'none',
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
                        return (
                          <>
                            {fieldsToRender.map((field, idx) => {
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
                                                color: 'var(--fg)', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.78rem',
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
                                                  color: 'var(--fg)', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.78rem',
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
                            })}

                            {/* Gate document fields — docked state only */}
                            {panelDocked && (
                              <>
                                <div style={{ height: '1px', background: 'var(--line)', margin: '0.5rem 0 1.5rem' }} />
                                <p style={{ fontSize: '0.52rem', letterSpacing: '0.16em', color: 'var(--fg-dim-2)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                                  From your gate documents
                                </p>
                                {PORTRAIT_GATE_FIELDS.map((gf, gfIdx) => {
                                  const gfRaw = filmMemory[gf.key]
                                  const gfValue = getPortraitValue(gfRaw)
                                  return (
                                    <div key={gf.key} style={{ marginBottom: '1.5rem' }}>
                                      <p style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                        {gf.label}
                                      </p>
                                      {gfValue ? (
                                        <p style={{ fontSize: '0.82rem', lineHeight: 1.85, color: '#a8a098', whiteSpace: 'pre-wrap', margin: 0 }}>
                                          {typeof gfValue === 'string' ? gfValue : ''}
                                        </p>
                                      ) : (
                                        <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: '0.75rem' }}>
                                          <p style={{ fontSize: '0.78rem', lineHeight: 1.7, color: 'var(--fg-dim)', fontStyle: 'italic', margin: 0 }}>
                                            Awaiting gate approval.
                                          </p>
                                        </div>
                                      )}
                                      {gfIdx < PORTRAIT_GATE_FIELDS.length - 1 && (
                                        <div style={{ height: '1px', background: 'var(--line)', marginTop: '1.5rem' }} />
                                      )}
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </>
                        )
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
                      <div style={{ padding: '20px 1rem 6px 12px', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent-dim)' }}>
                        Source Documents
                      </div>

                      {/* Script row */}
                      <div style={{ padding: '0.45rem 1rem 0.45rem 20px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ScrollText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />
                            {film?.source_documents?.script?.current ? (
                              <span
                                onClick={() => setOpenSourceDocument({ type: 'script', data: film.source_documents!.script! })}
                                style={{ fontSize: '13px', color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
                              >
                                {film.source_documents.script.current.filename}
                              </span>
                            ) : (
                              <span style={{ fontSize: '13px', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
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
                        <div key={doc.id} style={{ padding: '0.45rem 1rem 0.45rem 20px', borderBottom: '1px solid var(--line)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FileText size={10} color="var(--fg-dim)" style={{ flexShrink: 0 }} />
                              <span
                                onClick={() => setOpenSourceDocument({ type: 'research', data: doc })}
                                style={{ fontSize: '13px', color: 'var(--fg)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)' }}
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
                        <div style={{ padding: '0.45rem 1rem 0.45rem 20px' }}>
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
                                    await sendMessage(`I've uploaded a research document: ${f.name}`)
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div
                            onClick={() => setShowAllArchive(prev => !prev)}
                            style={{ padding: '6px 12px', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer' }}
                          >
                            {showAllArchive ? 'Current mode only' : 'Show all'}
                          </div>
                        </div>
                        {(showAllArchive
                          ? ['producer', 'director', 'narrator', 'cinematographer', 'ai_specialist', 'editor']
                          : [film.current_mode]
                        ).map(mode => (
                          <div key={mode} style={{ marginBottom: '0.75rem' }}>
                            <div style={{ fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--accent-dim)', padding: '20px 1rem 6px 12px' }}>
                              {mode.replace('_', ' ')}
                            </div>
                            {ARCHIVE_DOCUMENTS.filter(d => d.mode === mode).map(doc => {
                              const isGenerated = film.documents_generated?.some(d => d.document === doc.gateId)
                              const gateEntry = film.gates_closed?.find(g => g.gate === doc.gateId)
                              const isReopened = gateEntry?.status === 'reopened'
                              const isApproved = !!gateEntry && !isReopened
                              const hasPendingImport = importPending?.gateId === doc.gateId
                              const genPrereqArchive = GATE_GENERATION_PREREQUISITES[doc.gateId]
                              const prereqMetArchive = isPrereqMet(genPrereqArchive, film.gates_closed)
                              const gateState: 'OPEN' | 'IN REVIEW' | 'LOCKED' | 'REOPENED' | 'UNAVAILABLE' =
                                isReopened    ? 'REOPENED'    :
                                isApproved    ? 'LOCKED'      :
                                !prereqMetArchive ? 'UNAVAILABLE' :
                                (isGenerated || hasPendingImport) ? 'IN REVIEW' : 'OPEN'
                              const stateColor =
                                gateState === 'LOCKED'      ? 'var(--accent)' :
                                gateState === 'REOPENED'    ? 'var(--gate-review)' :
                                gateState === 'IN REVIEW'   ? 'var(--fg)' :
                                gateState === 'UNAVAILABLE' ? 'var(--fg-dim-2)' :
                                                              'var(--fg-dim)'
                              const iconColor =
                                gateState === 'LOCKED'      ? 'var(--accent)' :
                                gateState === 'REOPENED'    ? 'var(--gate-review)' :
                                gateState === 'IN REVIEW'   ? 'var(--fg-dim)' :
                                                              'var(--fg-dim)'

                              const genPrereqDoc = GATE_GENERATION_PREREQUISITES[doc.gateId]
                              const prereqMetDoc = isPrereqMet(genPrereqDoc, film.gates_closed)
                              const isClickable = isGenerated || prereqMetDoc
                              const prereqTooltip = gateState === 'UNAVAILABLE' && genPrereqDoc
                                ? Array.isArray(genPrereqDoc)
                                  ? `${doc.label} requires all Department Briefs to be closed first.`
                                  : `${doc.label} requires ${GATE_LABELS[genPrereqDoc]} to be closed first.`
                                : null
                              const gateConfidence = gateEntry?.confidence
                              const showConfidence = !!(gateConfidence?.last_evaluated)

                              return (
                                <div key={doc.gateId} ref={el => { archiveRowRefs.current[doc.gateId] = el ?? undefined }} style={{ padding: '0.45rem 1rem 0.45rem 20px', borderBottom: '1px solid var(--line)', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                    {ARCHIVE_ICON_MAP[doc.gateId](iconColor)}

                                    {/* Document name + optional tooltip for blocked gates */}
                                    {isClickable ? (
                                      <span
                                        onClick={() => setOpenDocument(doc.gateId)}
                                        style={{ fontSize: '13px', color: isApproved ? 'var(--accent)' : isGenerated ? 'var(--fg)' : 'var(--fg-dim)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--line)', flex: 1, fontStyle: isGenerated ? 'normal' : 'italic' }}
                                      >
                                        {doc.label}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '13px', color: 'var(--fg-dim)', fontStyle: 'italic', flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{doc.label}</span>
                                        {prereqTooltip && (
                                          <span
                                            style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
                                            onMouseEnter={() => setTooltipGate(doc.gateId)}
                                            onMouseLeave={() => setTooltipGate(null)}
                                          >
                                            <Info size={11} color="var(--fg-dim-2)" style={{ display: 'block' }} />
                                            {tooltipGate === doc.gateId && (
                                              <span style={{
                                                position: 'absolute', bottom: '130%', left: '50%',
                                                transform: 'translateX(-50%)',
                                                backgroundColor: 'var(--bg-elev)', border: '1px solid var(--line)',
                                                padding: '6px 10px', width: '200px',
                                                fontSize: '0.65rem', lineHeight: 1.5,
                                                color: 'var(--fg-dim)', zIndex: 30,
                                                pointerEvents: 'none',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                              }}>
                                                {prereqTooltip}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </span>
                                    )}

                                    {/* Confidence indicators — only when last_evaluated is set */}
                                    {showConfidence && gateConfidence && (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                        {(['coverage', 'clarity', 'consistency'] as const).map(dim => {
                                          const level = gateConfidence[dim]
                                          return (
                                            <span key={dim} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                              {level !== 'strong' && (
                                                <span style={{
                                                  width: '5px', height: '5px', borderRadius: '50%', display: 'block',
                                                  backgroundColor: level === 'needs_attention'
                                                    ? 'rgba(194,154,80,0.65)'
                                                    : 'rgba(140,134,130,0.4)',
                                                }} />
                                              )}
                                              <span style={{
                                                fontSize: '0.44rem', letterSpacing: '0.04em',
                                                color: level === 'needs_attention'
                                                  ? 'rgba(194,154,80,0.75)'
                                                  : level === 'strong'
                                                  ? 'rgba(140,134,130,0.55)'
                                                  : 'var(--fg-dim-2)',
                                                textTransform: 'uppercase', lineHeight: 1,
                                              }}>
                                                {dim === 'coverage' ? 'COV' : dim === 'clarity' ? 'CLR' : 'CON'}
                                              </span>
                                            </span>
                                          )
                                        })}
                                      </div>
                                    )}

                                    {/* State pill */}
                                    {gateState === 'UNAVAILABLE' ? (
                                      <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-dim-2)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                                        Unavailable
                                      </span>
                                    ) : (
                                      <span className={`gate-pill ${gateState === 'LOCKED' ? 'gate-pill-closed' : gateState === 'IN REVIEW' || gateState === 'REOPENED' ? 'gate-pill-review' : 'gate-pill-open'}`}>
                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                                        {gateState === 'LOCKED' ? 'Closed' : gateState === 'IN REVIEW' ? 'In Review' : gateState === 'REOPENED' ? 'Reopened' : 'Open'}
                                      </span>
                                    )}
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

              {/* MEMORY TAB */}
              {contextTab === 'memory' && (
                <div style={{ padding: '1rem 1rem 2rem' }}>
                  {!filmMemory ? (
                    <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                      As your film takes shape, Matinee's memory will surface here.
                    </p>
                  ) : (
                    (() => {
                      // Normalize filmmakers_words to entries array
                      const wordsRaw = filmMemory.filmmakers_words
                      let wordEntries: FilmakersWordsEntry[] = []
                      if (Array.isArray(wordsRaw)) {
                        wordEntries = wordsRaw.map(item =>
                          typeof item === 'string'
                            ? { text: item, session_id: null, mode: 'pre-migration', captured_at: null }
                            : item as FilmakersWordsEntry
                        )
                      } else if (typeof wordsRaw === 'string' && wordsRaw.trim()) {
                        const phrases = wordsRaw.split('|').map((p: string) => p.trim()).filter(Boolean)
                        wordEntries = phrases.map((p: string) => ({ text: p, session_id: null, mode: 'pre-migration', captured_at: null }))
                      }

                      // Expand pre-migration pipe-delimited entries into individual display entries
                      const expandedEntries: FilmakersWordsEntry[] = []
                      for (const entry of wordEntries) {
                        if (entry.mode === 'pre-migration' && entry.text.includes('|')) {
                          const phrases = entry.text.split('|').map(p => p.trim()).filter(Boolean)
                          for (const phrase of phrases) {
                            expandedEntries.push({ text: phrase, session_id: null, mode: 'pre-migration', captured_at: null })
                          }
                        } else {
                          expandedEntries.push(entry)
                        }
                      }

                      const openFlags = Array.isArray(filmMemory.continuity_flags)
                        ? filmMemory.continuity_flags.filter(f => f.status === 'open')
                        : []
                      const toneSignals = Array.isArray(filmMemory.tone_signals) ? filmMemory.tone_signals : []
                      const hasUnresolved = !!(filmMemory.unresolved_threads && filmMemory.unresolved_threads.trim())
                      const hasContent = expandedEntries.length > 0 || hasUnresolved || openFlags.length > 0 || toneSignals.length > 0

                      if (!hasContent) {
                        return (
                          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                            As your film takes shape, Matinee's memory will surface here.
                          </p>
                        )
                      }

                      const displayWords = showAllWords ? expandedEntries : expandedEntries.slice(-3)

                      return (
                        <>
                          {/* Section 1 — Your words */}
                          {expandedEntries.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                              <p style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                Your words
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {displayWords.map((entry, idx) => (
                                  <div key={idx} style={{ borderLeft: '1px solid var(--line)', paddingLeft: '0.75rem' }}>
                                    <p style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#a8a098', margin: 0, fontStyle: 'italic' }}>
                                      "{entry.text}"
                                    </p>
                                    {!(entry.captured_at === null && entry.mode === 'pre-migration') && (
                                      <p style={{ fontSize: '0.6rem', color: 'var(--fg-dim-2)', margin: '0.25rem 0 0' }}>
                                        {entry.mode.charAt(0).toUpperCase() + entry.mode.slice(1)}
                                        {entry.captured_at && ` · ${formatDate(entry.captured_at)}`}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {expandedEntries.length > 3 && (
                                <span
                                  onClick={() => setShowAllWords(prev => !prev)}
                                  style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', cursor: 'pointer', display: 'block', marginTop: '0.75rem', fontStyle: 'italic' }}
                                >
                                  {showAllWords ? 'Show fewer' : `Show all (${expandedEntries.length})`}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Section 2 — What's still open */}
                          {hasUnresolved && (
                            <div style={{ marginBottom: '2rem' }}>
                              <p style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                What's still open
                              </p>
                              <p style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#a8a098', whiteSpace: 'pre-wrap', margin: 0 }}>
                                {filmMemory.unresolved_threads}
                              </p>
                            </div>
                          )}

                          {/* Section 3 — Tensions Matinee is holding */}
                          {openFlags.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                              <p style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                Tensions Matinee is holding
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {openFlags.map((item, idx) => (
                                  <p key={idx} style={{ fontSize: '0.82rem', lineHeight: 1.75, color: '#a8a098', margin: 0 }}>
                                    {item.flag}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Section 4 — Tone — Matinee's read */}
                          {toneSignals.length > 0 && (
                            <div style={{ marginBottom: '2rem' }}>
                              <p style={{ fontSize: '0.55rem', letterSpacing: '0.18em', color: 'var(--accent-dim)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                Tone — Matinee's read
                              </p>
                              <p style={{ fontSize: '0.65rem', color: 'var(--fg-dim)', fontStyle: 'italic', margin: '0 0 0.75rem' }}>
                                Matinee's observation — not a committed decision.
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {toneSignals.map((item, idx) => (
                                  <p key={idx} style={{ fontSize: '0.82rem', lineHeight: 1.6, color: '#a8a098', margin: 0 }}>
                                    {item.signal}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    })()
                  )}
                </div>
              )}

              {/* PLACEHOLDER TABS */}
              {['brief', 'treatment', 'segments', 'shot_list_tab', 'images', 'edit_plan_tab'].includes(contextTab) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem' }}>
                  <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '13px', fontStyle: 'italic', color: 'var(--fg-dim)', textAlign: 'center' }}>
                    Coming in the next story.
                  </p>
                </div>
              )}

            </div>
            </div>
          )}
        </div>
      </div>

      {/* CONVERSATION WARNING MODAL */}
      {conversationWarningGate && (() => {
        const warningDoc = ARCHIVE_DOCUMENTS.find(d => d.gateId === conversationWarningGate)
        if (!warningDoc) return null
        const modeLabel = MODE_CONFIG.find(m => m.key === warningDoc.mode)?.label ?? warningDoc.mode
        const pendingGate = conversationWarningGate
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ background: 'var(--bg-elev)', maxWidth: '480px', width: '100%', border: '1px solid var(--line)', padding: '2rem 2.5rem' }}>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.75, color: 'var(--fg)', fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: '1rem' }}>
                This document will be generated from your Film Memory alone.
              </p>
              <p style={{ fontSize: '0.84rem', lineHeight: 1.75, color: 'var(--fg-dim)', fontFamily: "'DM Sans', system-ui, sans-serif", marginBottom: '1.75rem' }}>
                A conversation with Matinee in {modeLabel} mode will make it richer and more specific to your vision.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => { setConversationWarningGate(null); generateDocument(pendingGate, warningDoc.mode) }}
                  style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', background: 'transparent', border: '1px solid var(--line)', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Generate Anyway
                </button>
                <button
                  onClick={() => { setConversationWarningGate(null); setOpenDocument(null); switchMode(warningDoc.mode) }}
                  style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bg)', background: 'var(--accent)', border: 'none', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Go to {modeLabel}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
        const genPrereq = GATE_GENERATION_PREREQUISITES[openDocument]
        const prereqMet = isPrereqMet(genPrereq, film?.gates_closed)
        const approvalPrereq = GATE_APPROVAL_PREREQUISITES[openDocument]
        const approvalPrereqMet = isPrereqMet(approvalPrereq, film?.gates_closed)
        const isOwningMode = film?.current_mode === doc.mode
        const canGenerate = prereqMet && isOwningMode
        const canApprove = approvalPrereqMet
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
                  <span className={`gate-pill ${gateState === 'LOCKED' ? 'gate-pill-closed' : gateState === 'IN REVIEW' ? 'gate-pill-review' : 'gate-pill-open'}`}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
                    {gateState === 'LOCKED' ? 'Closed' : gateState === 'IN REVIEW' ? 'In Review' : 'Open'}
                  </span>
                  <button
                    onClick={() => { setOpenDocument(null); setGenerateError(null) }}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', fontSize: '1rem', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Staleness banner — shown when IN REVIEW and is_stale */}
              {gateState === 'IN REVIEW' && film?.documents_stale?.[openDocument] && (
                <div style={{
                  borderLeft: '2px solid var(--gate-review)',
                  backgroundColor: 'rgba(200, 149, 110, 0.15)',
                  color: 'var(--gate-review)',
                  fontSize: '0.85rem',
                  padding: '0.75rem 1rem',
                  margin: '0 3rem',
                  flexShrink: 0,
                }}>
                  This document is out of date. The conversation has moved. Regenerate before approving.
                </div>
              )}

              {/* Content — scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 3rem' }}>
                {isGenerated ? (
                  <div className="doc-prose" style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    <ReactMarkdown>{film?.documents_content?.[openDocument] ?? ''}</ReactMarkdown>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg-dim)', fontStyle: 'italic', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    This document hasn&apos;t been generated yet.
                  </p>
                )}
              </div>

              {/* Footer — fixed */}
              <div style={{ borderTop: '1px solid var(--line)', padding: '1rem 3rem', flexShrink: 0 }}>
                {activeFlag && (
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--gate-review)', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>{doc.label} was generated after {GATE_LABELS[activeFlag]} was approved. It may reflect the previous version.</span>
                    <button onClick={() => dismissRippleFlag(activeFlag, openDocument)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--gate-review)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.64rem', fontFamily: "'DM Sans', system-ui, sans-serif", flexShrink: 0 }}>
                      Dismiss
                    </button>
                  </div>
                )}
                {!prereqMet && genPrereq && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                    Needs {Array.isArray(genPrereq) ? 'all Department Briefs' : GATE_LABELS[genPrereq]} approved first.
                  </p>
                )}
                {prereqMet && !isOwningMode && !isGenerated && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                    Switch to {doc.mode.replace('_', ' ')} mode to generate.
                  </p>
                )}
                {hasPendingImport && importDiscussing && (
                  <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.75rem' }}>
                    <button onClick={confirmImport} disabled={importConfirming} style={{ background: 'none', border: 'none', padding: 0, color: importConfirming ? 'var(--fg-dim)' : 'var(--accent)', cursor: importConfirming ? 'default' : 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.64rem', letterSpacing: '0.06em' }}>
                      {importConfirming ? 'Closing...' : 'Close gate'}
                    </button>
                    <button onClick={discardImport} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--fg-dim)', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '0.64rem' }}>
                      Discard
                    </button>
                  </div>
                )}
                {generateError === openDocument && (
                  <p style={{ marginBottom: '0.75rem', fontSize: '0.64rem', color: 'var(--gate-review)', fontStyle: 'italic' }}>
                    The document could not be produced. The portrait may not have enough to build from. Try again after adding more to the conversation.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {gateState === 'OPEN' && (
                    <>
                      <button
                        onClick={() => {
                          if (!canGenerate) return
                          if (!checkConversationExists(doc.mode)) {
                            setConversationWarningGate(openDocument)
                            return
                          }
                          generateDocument(openDocument, doc.mode)
                        }}
                        disabled={generating === openDocument || !canGenerate}
                        style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: canGenerate ? 'var(--bg)' : 'var(--fg-dim)', background: canGenerate ? 'var(--accent)' : 'transparent', border: `1px solid ${canGenerate ? 'var(--accent)' : 'var(--line)'}`, padding: '0.5rem 1.25rem', cursor: canGenerate ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                      >
                        {generating === openDocument ? 'Generating...' : 'Generate'}
                      </button>
                      <label style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', padding: '0.5rem 1.25rem', border: '1px solid var(--line)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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
                  {gateState === 'IN REVIEW' && (
                    <>
                      <button
                        onClick={() => generateDocument(openDocument, doc.mode)}
                        disabled={generating === openDocument || !canGenerate}
                        style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: canGenerate ? 'var(--fg)' : 'var(--fg-dim-2)', background: 'transparent', border: `1px solid var(--line)`, padding: '0.5rem 1.25rem', cursor: canGenerate ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                      >
                        {generating === openDocument ? 'Generating...' : 'Regenerate'}
                      </button>
                      {!hasPendingImport && canApprove && (
                        <button
                          onClick={() => approveGate(openDocument)}
                          style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--bg)', background: 'var(--accent)', border: 'none', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        >
                          Approve
                        </button>
                      )}
                      {!hasPendingImport && !canApprove && approvalPrereq && (
                        <p style={{ fontSize: '0.64rem', color: 'var(--fg-dim)', fontStyle: 'italic' }}>
                          Approve {Array.isArray(approvalPrereq) ? 'prerequisites' : GATE_LABELS[approvalPrereq]} first.
                        </p>
                      )}
                    </>
                  )}
                  {gateState === 'LOCKED' && (
                    <button
                      onClick={() => reopenGate(openDocument)}
                      style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-dim)', background: 'none', border: '1px solid var(--line)', padding: '0.5rem 1.25rem', cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}
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
              <div style={{ fontSize: '0.84rem', lineHeight: 1.85, color: 'var(--fg)', whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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
                    <label style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', cursor: 'pointer', padding: '0.5rem 1.25rem', border: '1px solid var(--line)', display: 'inline-block', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
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
