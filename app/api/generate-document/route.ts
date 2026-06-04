import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { buildPortraitBlock, referenceDocumentsSection } from '@/lib/portrait'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type GateId =
  | 'film_brief'
  | 'treatment'
  | 'mode_selection_brief'
  | 'hook_draft'
  | 'consistency_lock'
  | 'shot_list'
  | 'camera_light_plan'
  | 'visual_prompt_package'
  | 'edit_plan'
  | 'music_cue_sheet'

function buildBasePrompt(
  gateId: GateId,
  filmTitle: string,
  portrait: Record<string, any> | null,
  closedDocumentContent: Record<string, string>,
  referenceBlock: string,
  importedContent?: string
): string {
  const portraitBlock = buildPortraitBlock(portrait)
  const refSection = referenceDocumentsSection(referenceBlock)
  const importedSection = importedContent
    ? `\nIMPORTED DOCUMENT:\n${importedContent.slice(0, 6000)}\n`
    : ''

  switch (gateId) {
    case 'film_brief':
      return `You are producing a Film Brief for "${filmTitle}".

A Film Brief contains exactly five elements. Produce each one as a short paragraph — no headers, no bullets, no preamble. The document reads as a committed statement of what this film is and why it exists.

Draw exclusively from the Film Portrait below. Do not invent. Do not qualify. Do not assess readiness — the filmmaker has requested this document and it will be produced now.${importedSection}

${portraitBlock}${refSection}

THE FIVE ELEMENTS — produce them in this order:

1. Emotional premise — what this film makes the audience feel, and why that matters. Draw from portrait fields: Emotional Core, Themes.

2. Narrative approach — the mode of storytelling this film uses. Draw from: Approach, Story.

3. Target length — a specific number in minutes. Draw from: Target Length. If absent, write "To be defined by the filmmaker."

4. What this film is for — its purpose, distinct from its subject. Why it needs to exist. Draw from: Emotional Core, Audience, Themes.

5. What success looks like — the filmmaker's own definition, not platform metrics. Draw from: Audience, Unresolved Questions. If absent, write "To be defined by the filmmaker."

Produce the document. Nothing before it. Nothing after it.`

    case 'treatment':
      return `You are producing a Director's Treatment for "${filmTitle}".

A Treatment contains seven decisions. Produce each as a paragraph — no headers, no numbering, no bullets. The document reads as a complete visual and structural commitment that a cinematographer could pick up and build from immediately.

${portraitBlock}

FILM BRIEF:
${closedDocumentContent['film_brief'] ?? ''}${importedSection}${refSection}

THE SEVEN DECISIONS — produce them in this order, each as a paragraph:

1. Visual world — the photographic language of this film: light quality, colour palette, camera distance and movement, the texture of the image. Not mood — the actual look.
2. Tonal register — the emotional temperature of the film moment to moment: how heavy, how light, how much it breathes.
3. Structural approach — how the film moves: where it accelerates, where it holds, what governs its shape.
4. The central image — one image that contains the film's meaning. Everything else in the film orbits it.
5. What the film withholds — what it never shows or says directly. The space it leaves for the audience to fill.
6. The filmmaker's presence — how much of the maker is felt inside the film. Invisible observer or felt voice.
7. Opening and closing — where the film begins and exactly where it ends. Not the first scene and last scene — the first feeling and the last feeling.

Produce the document. Nothing before it. Nothing after it.`

    case 'mode_selection_brief':
      return `You are producing a Mode Selection Brief for "${filmTitle}".

A Mode Selection Brief makes one decision: which narrative mode this film speaks in. It commits to that choice and explains why it serves this particular film. It is not a menu of options. It is a short document — three to five paragraphs — written as a committed statement.

${portraitBlock}

DIRECTOR'S TREATMENT:
${closedDocumentContent['treatment'] ?? ''}${importedSection}${refSection}

Produce the Mode Selection Brief. Name the narrative mode in the first sentence. Then explain why this mode — not another — is the right voice for this film, drawing from what the portrait and treatment establish about tone, approach, and emotional territory. End with one sentence about what this mode asks of the audience.

Nothing before the document. Nothing after it.`

    case 'hook_draft':
      return `You are producing the Hook Draft for "${filmTitle}".

The Hook is the first words the audience hears. It is written as a single unit of narration — not a description of what the hook will do, not a paragraph of setup. The hook itself.

${portraitBlock}

MODE SELECTION BRIEF:
${closedDocumentContent['mode_selection_brief'] ?? ''}${importedSection}${refSection}

Rules:
- Earn attention in the first sentence. The audience decides whether to stay in the first ten words.
- Contain the film's emotional core without naming it directly.
- End at exactly the right moment — not a beat too late.
- Written in the narrative mode established by the Mode Selection Brief.
- Maximum 150 words.

Produce the hook. Nothing before it. Nothing after it.`

    case 'consistency_lock':
      return `You are producing a Consistency Lock for "${filmTitle}".

A Consistency Lock defines how one specific subject or location looks across every generated image. It is a visual constitution — once approved, every AI Specialist session for this subject builds from it and cannot deviate without flagging it first.

${portraitBlock}

DIRECTOR'S TREATMENT:
${closedDocumentContent['treatment'] ?? ''}${importedSection}${refSection}

The lock contains exactly these sections, each as a short block of prompt-ready language:

SUBJECT: [name of the subject or location]
PHYSICAL DESCRIPTION: [specific physical details — what the subject looks like, in enough detail to reproduce across multiple generation sessions]
COLOUR PALETTE: [dominant colours, temperature, saturation]
LIGHT QUALITY: [typical light source, direction, hardness, colour temperature]
CAMERA RELATIONSHIP: [distance, angle, the camera's stance toward this subject]
WHAT MUST NEVER CHANGE: [the constants — the details that make this subject recognisable across all shots]
WHAT MAY VARY: [elements that can shift between shots without breaking consistency]

Every line must be directly usable in an image generation prompt. No impressionistic or general language.

Produce the Consistency Lock. Nothing before it. Nothing after it.`

    case 'shot_list':
      return `You are producing a Shot List for "${filmTitle}".

A Shot List defines every shot in one segment. It is the building material for the Camera & Light Plan. It contains no camera or light language — that belongs in the Camera & Light Plan.

${portraitBlock}

CONSISTENCY LOCK:
${closedDocumentContent['consistency_lock'] ?? ''}

DIRECTOR'S TREATMENT:
${closedDocumentContent['treatment'] ?? ''}${importedSection}${refSection}

Produce the Shot List as a structured table with these columns:
SHOT # | SUBJECT | SHOT TYPE | CAMERA ANGLE | WHAT THE SHOT SHOWS

Shot types: wide, medium, close, extreme close, detail.
Camera angles: eye level, low angle, high angle, overhead, dutch.
"What the shot shows" — one sentence, concrete and specific. What is in the frame. Not what the shot means.

Every subject must reference the approved Consistency Lock by name.

Produce the Shot List. Nothing before it. Nothing after it.`

    case 'camera_light_plan':
      return `You are producing a Camera & Light Plan for "${filmTitle}".

A Camera & Light Plan translates an approved Shot List into precise visual production language ready for AI Specialist prompt generation. Every element must be directly usable in an image generation prompt.

${portraitBlock}

SHOT LIST:
${closedDocumentContent['shot_list'] ?? ''}

CONSISTENCY LOCK:
${closedDocumentContent['consistency_lock'] ?? ''}${importedSection}${refSection}

Produce the Camera & Light Plan as a structured table with these columns:
SHOT # | CAMERA POSITION & ANGLE | LENS CHARACTER | LIGHT SOURCE & DIRECTION | LIGHT QUALITY & COLOUR TEMP | ATMOSPHERE | SHADOW BEHAVIOUR

Lens character: wide, standard, telephoto — described in visual terms, not millimetres.
Light quality: hard, soft, diffused, raking, flat — with colour temperature where relevant.
Atmosphere: haze, dust, grain, weather, air quality.
Shadow behaviour: long, short, absent, soft-edged, hard-edged.

No impressionistic language. No sentences. Every cell is a precise descriptor string.

Produce the Camera & Light Plan. Nothing before it. Nothing after it.`

    case 'visual_prompt_package':
      return `You are producing a Visual Prompt Package for "${filmTitle}".

A Visual Prompt Package is a structured, generation-ready prompt for one specific shot. It is copy-pasteable into any image generation tool. Every word earns its place or it is cut.

CONSISTENCY LOCK:
${closedDocumentContent['consistency_lock'] ?? ''}

CAMERA & LIGHT PLAN:
${closedDocumentContent['camera_light_plan'] ?? ''}${importedSection}${refSection}

Produce the Visual Prompt Package in exactly this structure:

SUBJECT: [draw from Consistency Lock — physical description, key visual constants, what must not change]
SETTING: [draw from Consistency Lock for this location — architecture, landscape, environment]
CAMERA: [draw from Camera & Light Plan for this shot — position, angle, lens character]
LIGHT: [draw from Camera & Light Plan for this shot — source, direction, quality, colour temperature, shadow behaviour]
ATMOSPHERE: [draw from Camera & Light Plan — haze, dust, grain, weather, texture. Append one comparable film reference if it sharpens the visual register]

NEGATIVE PROMPT: [five to eight descriptors — the most important things this shot must not contain, drawn from the Consistency Lock's WHAT MUST NEVER CHANGE field]

Each section is a dense, comma-separated string of precise visual descriptors. No verbs. No sentences. No impressionistic language.

Produce the Visual Prompt Package. Nothing before it. Nothing after it.`

    case 'edit_plan':
      return `You are producing an Edit Plan for "${filmTitle}".

An Edit Plan defines the assembly strategy for the film. Every note must be actionable in a DaVinci Resolve timeline — no impressionistic language.

${portraitBlock}

SCRIPT LOCK:
${closedDocumentContent['script_lock'] ?? ''}

AUDIO DIRECTION:
${closedDocumentContent['audio_direction'] ?? ''}${importedSection}${refSection}

The Edit Plan contains exactly these sections, each written as a short prose block:

ASSEMBLY APPROACH — the overarching logic of how the film is cut. What principle governs the edit.
NARRATION-TO-IMAGE RELATIONSHIP — how each narration segment maps to its visual sequence. Where narration leads and where image leads.
PACING NOTES — where the cut breathes and where it drives. Specific to each segment.
TRANSITION LOGIC — what connects segments and why. Cut, dissolve, hold, silence.
HELD SHOT LOGIC — which shots are held and what they are holding for. A held shot is a statement of confidence — name what each one earns.

Produce the Edit Plan. Nothing before it. Nothing after it.`

    case 'music_cue_sheet':
      return `You are producing a Music Cue Sheet for "${filmTitle}".

A Music Cue Sheet maps music placement against the approved Edit Plan. Every cue is positioned precisely against the narration and cut structure. Mood is described precisely — never in single generic emotion words.

EDIT PLAN:
${closedDocumentContent['edit_plan'] ?? ''}

SCRIPT LOCK:
${closedDocumentContent['script_lock'] ?? ''}${importedSection}${refSection}

Produce the Music Cue Sheet as a structured table with these columns:
CUE # | PLACEMENT | MOOD & REGISTER | APPROX DURATION | ENTRY LOGIC | EXIT LOGIC | TRANSITION BEHAVIOUR

Placement: which segment, which beat — specific enough to locate in the Edit Plan.
Mood & register: two to four descriptors. Not "sad" — "sparse, unresolved, fading." Not "triumphant" — "expansive, unhurried, arriving."
Entry logic: how the cue begins relative to the cut — before, on, or after.
Exit logic: how the cue ends — fades under narration, cuts hard, resolves.
Transition behaviour: whether music carries across a cut or stops with it.

Every cue must be traceable to a specific moment in the Edit Plan.

Produce the Music Cue Sheet. Nothing before it. Nothing after it.`

    default:
      return `You are producing a document for "${filmTitle}".

${portraitBlock}${importedSection}${refSection}

Produce the document directly from the source material above. Nothing before it. Nothing after it.`
  }
}

// Story 1 — Self-reference in regeneration.
// Wraps buildBasePrompt and appends the existing-version block when
// existingDocumentContent is present so regeneration refines rather than replaces.
function buildGenerationPrompt(
  gateId: GateId,
  filmTitle: string,
  portrait: Record<string, any> | null,
  closedDocumentContent: Record<string, string>,
  referenceBlock: string,
  importedContent?: string,
  existingDocumentContent?: string
): string {
  const base = buildBasePrompt(gateId, filmTitle, portrait, closedDocumentContent, referenceBlock, importedContent)
  if (!existingDocumentContent) return base
  return `${base}

EXISTING VERSION — previously generated and reviewed by the filmmaker:
${existingDocumentContent}

Honour everything already written. Fill any gaps. Revise only what the filmmaker has explicitly asked to change. Do not rewrite from scratch.`
}

export async function POST(req: NextRequest) {
  try {
    const {
      gateId,
      filmId,
      filmTitle,
      filmMemory,
      portrait,
      gatesClosed,
      referenceBlock,
      importedContent,
      closedDocumentContent,
      existingDocumentContent,
      forceRegenerate,
    } = await req.json()

    // Story 2 — Gate lock enforcement.
    // A gate with closed_at and no 'reopened' status is LOCKED.
    // Refuse generation unless the caller has explicitly passed forceRegenerate.
    if (filmId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: filmRow } = await supabase
        .from('films')
        .select('gates_closed')
        .eq('id', filmId)
        .single()
      if (filmRow?.gates_closed) {
        const gateEntry = (filmRow.gates_closed as any[]).find((g: any) => g.gate === gateId)
        const isLocked = gateEntry && gateEntry.closed_at && gateEntry.status !== 'reopened'
        if (isLocked && !forceRegenerate) {
          return NextResponse.json(
            { content: '', success: false, error: 'gate_locked' },
            { status: 403 }
          )
        }
      }
    }

    const source = portrait ?? filmMemory
    const prompt = buildGenerationPrompt(
      gateId as GateId,
      filmTitle ?? 'Untitled Film',
      source,
      closedDocumentContent ?? {},
      referenceBlock ?? '',
      importedContent,
      existingDocumentContent
    )

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: prompt,
      messages: [{ role: 'user', content: 'Produce the document.' }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    if (content.trim().length < 100) {
      return NextResponse.json({ content: '', success: false })
    }

    return NextResponse.json({ content, success: true })

  } catch (error) {
    console.error('generate-document error:', error)
    return NextResponse.json({ content: '', success: false }, { status: 500 })
  }
}
