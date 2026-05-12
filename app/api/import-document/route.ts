import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mergeMemoryFromExtraction } from '@/lib/filmMemory'

export const maxDuration = 60

type GateId = 'film_brief' | 'treatment' | 'department_briefs' | 'mode_selection_brief' | 'hook_draft' | 'script_lock' | 'audio_direction' | 'consistency_lock' | 'shot_list' | 'camera_light_plan' | 'visual_prompt_package' | 'edit_plan' | 'music_cue_sheet'

const GATE_DOC_TYPE: Partial<Record<GateId, 'script' | 'brief' | 'treatment' | 'department_brief'>> = {
  film_brief: 'brief',
  treatment: 'treatment',
  department_briefs: 'department_brief',
  script_lock: 'script',
}

function buildSpecialistExtractionPrompt(docType: 'script' | 'brief' | 'treatment' | 'department_brief'): string {
  const base = `You are reading a filmmaker's document. Extract what you can into Film Memory and Film Portrait fields.

Return a single JSON object with this exact shape:
{
  "memory": {
    "emotional_core": string | null,
    "characters": object | null,
    "decisions_made": string | null,
    "filmmakers_words": string | null,
    "unresolved_threads": string | null
  },
  "portrait": {
    "portrait_logline": string | null,
    "portrait_emotional_core": string | null,
    "portrait_story": string | null,
    "portrait_world": string | null,
    "portrait_subjects": string | null,
    "portrait_themes": string | null,
    "portrait_approach": string | null,
    "portrait_tone": string | null,
    "portrait_visual_world": string | null,
    "portrait_audience": string | null,
    "portrait_comparable_films": string | null,
    "portrait_target_length": string | null
  }
}

portrait_directors_intent is never extracted — omit it entirely.
Use null for any field you cannot fill from this document. Do not invent or infer beyond what is written.`

  const instructions: Record<typeof docType, string> = {
    script: `This is a narrative script or screenplay draft.
Extract: emotional core, characters and their arcs, tone, the filmmaker's distinctive language and phrasing, unresolved dramatic threads.
Prioritise portrait_emotional_core, portrait_story, portrait_subjects, portrait_tone.`,

    brief: `This is a strategic planning document — a Film Brief or production brief.
Extract: the emotional premise, narrative approach, intended audience, distribution context, target length, and what success looks like for this film.
Prioritise portrait_approach, portrait_story, portrait_audience, portrait_target_length, portrait_comparable_films.
Do not read sections like budget, schedule, or crew as Film Memory — focus only on creative and editorial intent.`,

    treatment: `This is a Director's Treatment — a set of directorial decisions about how the film will be made.
Extract: the director's defined visual world, tone, the film's emotional logic, and any explicit creative commitments.
Prioritise portrait_visual_world, portrait_tone, portrait_themes, portrait_emotional_core.
Capture the director's exact language — these are deliberate choices, not drafts.`,

    department_brief: `This is a production handoff document for a department or collaborator.
Extract whatever Film Portrait signal is present, but treat this as a supporting document.
Do not overwrite strong creative intent with operational language.
Populate only fields where the document contains clear, direct creative information.`,
  }

  return `${instructions[docType]}\n\n${base}`
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filmId = formData.get('filmId') as string | null
    const gateId = formData.get('gateId') as string | null

    if (!file || !filmId || !gateId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const isPDF = fileName.endsWith('.pdf')
    const isDOCX = fileName.endsWith('.docx') || fileName.endsWith('.doc')

    if (!isPDF && !isDOCX) {
      return NextResponse.json(
        { error: 'Please upload a PDF or Word document.' },
        { status: 400 }
      )
    }

    const { data: existingMemory } = await supabaseAdmin
      .from('film_memory').select('*').eq('film_id', filmId).single()

    const existingMemoryBlock = existingMemory
      ? `WHAT YOU ALREADY KNOW ABOUT THIS FILM:
- Emotional core: ${existingMemory.emotional_core || 'Nothing yet'}
- Characters: ${existingMemory.characters ? JSON.stringify(existingMemory.characters) : 'Not yet discovered'}
- Decisions made: ${existingMemory.decisions_made || 'None yet'}
- The filmmaker's own words: ${existingMemory.filmmakers_words || 'None captured yet'}
- What is still unresolved: ${existingMemory.unresolved_threads || 'Everything is open'}

`
      : ''

    const now = new Date().toISOString()
    const docType = GATE_DOC_TYPE[gateId as GateId] ?? 'script'
    const extractionPrompt = buildSpecialistExtractionPrompt(docType)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let extracted: { memory: any; portrait: any }
    let rawText: string

    if (isPDF) {
      const base64 = buffer.toString('base64')

      const pdfPrompt = `${extractionPrompt}

Also include a "raw_text" key at the top level of your JSON response containing the full readable text of this document, suitable for display.`

      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64
                  }
                },
                { type: 'text', text: pdfPrompt }
              ]
            }
          ]
        })
      })

      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude PDF import error:', aiData.error)
        return NextResponse.json({ error: 'Could not read the document right now. Try again.' }, { status: 500 })
      }

      let parsed: { memory: any; portrait: any; raw_text?: string }
      try {
        const clean = (aiData.content[0].text as string).replace(/```json|```/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        console.error('Could not parse Claude PDF import response:', aiData.content[0].text)
        return NextResponse.json({ error: 'Something went wrong reading the document. Try again.' }, { status: 500 })
      }

      rawText = parsed.raw_text ?? aiData.content[0].text
      extracted = { memory: parsed.memory, portrait: parsed.portrait }

    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value.slice(0, 30000)

      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [
            {
              role: 'user',
              content: `${extractionPrompt}\n\nDOCUMENT:\n${rawText}`
            }
          ]
        })
      })

      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude DOCX import error:', aiData.error)
        return NextResponse.json({ error: 'Could not read the document right now. Try again.' }, { status: 500 })
      }

      try {
        const clean = (aiData.content[0].text as string).replace(/```json|```/g, '').trim()
        extracted = JSON.parse(clean)
      } catch {
        console.error('Could not parse Claude DOCX import response:', aiData.content[0].text)
        return NextResponse.json({ error: 'Something went wrong reading the document. Try again.' }, { status: 500 })
      }
    }

    if (extracted.portrait) delete extracted.portrait['portrait_directors_intent']

    const merged = mergeMemoryFromExtraction(existingMemory ?? {}, extracted)
    const memoryPayload = { ...merged, updated_at: now }

    if (existingMemory) {
      await supabaseAdmin.from('film_memory').update(memoryPayload).eq('film_id', filmId)
    } else {
      await supabaseAdmin.from('film_memory').insert({ ...memoryPayload, film_id: filmId })
    }

    return NextResponse.json({ content: rawText })

  } catch (error) {
    console.error('Import document error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
