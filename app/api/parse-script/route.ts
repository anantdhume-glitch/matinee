import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

function mergeMemory(existing: Record<string, any>, extracted: { memory: any; portrait: any }): Record<string, any> {
  const merged: Record<string, any> = { ...existing }

  // Legacy five fields
  for (const field of ['emotional_core', 'decisions_made', 'unresolved_threads']) {
    const newVal = extracted.memory?.[field] as string | undefined
    const existingVal = existing[field] as string | undefined
    if (newVal && (!existingVal || newVal.length > existingVal.length)) {
      merged[field] = newVal
    }
  }

  const ec = existing?.characters || []
  const nc = extracted.memory?.characters || []
  if (JSON.stringify(nc).length > JSON.stringify(ec).length) merged.characters = nc

  const ew = (existing?.filmmakers_words || '') as string
  const nw = (extracted.memory?.filmmakers_words || '') as string
  if (!ew) {
    merged.filmmakers_words = nw
  } else if (nw) {
    const existingPhrases = ew.split('|').map(p => p.trim()).filter(Boolean)
    const newPhrases = nw.split('|').map(p => p.trim()).filter(Boolean)
    for (const phrase of newPhrases) {
      if (!existingPhrases.some(p =>
        p.toLowerCase().includes(phrase.toLowerCase()) ||
        phrase.toLowerCase().includes(p.toLowerCase())
      )) {
        existingPhrases.push(phrase)
      }
    }
    merged.filmmakers_words = existingPhrases.join(' | ')
  }

  // Portrait text fields — longer .value wins
  for (const field of PORTRAIT_TEXT_FIELDS) {
    const newField = extracted.portrait?.[field]
    if (!newField?.value) continue
    const existingValue = (existing[field]?.value ?? '') as string
    if (newField.value.length > existingValue.length) {
      merged[field] = { ...newField, history: appendHistory(existing[field]) }
    }
  }

  // portrait_unresolved_questions — append, deduplicate by question text
  const newQuestions: Array<{ question: string; category: string; added_at: string; resolved?: boolean; resolved_at?: string }> =
    extracted.portrait?.portrait_unresolved_questions?.value ?? []
  if (newQuestions.length > 0) {
    const existingQField = existing.portrait_unresolved_questions
    const existingQuestions: Array<{ question: string; category: string; added_at: string; resolved?: boolean; resolved_at?: string }> =
      existingQField?.value ?? []
    const existingTexts = new Set(existingQuestions.map(q => q.question))
    const toAdd = newQuestions.filter(q => !existingTexts.has(q.question))
    if (toAdd.length > 0 || !existingQField) {
      const updatedHistory = toAdd.length > 0
        ? [...(existingQField?.history ?? []), {
            questions_added: toAdd,
            changed_by: 'script_upload',
            changed_at: new Date().toISOString(),
          }]
        : (existingQField?.history ?? [])
      merged.portrait_unresolved_questions = {
        value: [...existingQuestions, ...toAdd],
        created_by: 'script_upload',
        created_in_mode: 'script_upload',
        updated_at: new Date().toISOString(),
        history: updatedHistory,
      }
    }
  }

  return merged
}

const EXTRACTION_PROMPT = (existingMemoryBlock: string, now: string) => `You are reading a film script or treatment. Extract everything you can learn about this film and return it as a single JSON object with two keys: "memory" and "portrait".

${existingMemoryBlock}The "memory" object contains these five fields:
- emotional_core: The soul of the film — what it does to an audience emotionally, not a plot summary
- characters: Who the key people are and what they are becoming — the emotional truth of each person
- decisions_made: Any explicit creative choices visible in the script — form, structure, approach
- filmmakers_words: Exact phrases or sentences from the script that feel like the filmmaker's own voice — distinctive, specific language. Return as a pipe-separated string of individual phrases.
- unresolved_threads: What the film leaves open — unanswered questions, unresolved tensions

The "portrait" object contains these thirteen fields. Each field must follow this exact shape:
{ "value": "...", "created_by": "script_upload", "created_in_mode": "script_upload", "updated_at": "${now}" }

Portrait fields to extract:
- portrait_logline: One sentence. What the film is. Precise and specific.
- portrait_emotional_core: The soul of the film — the thematic question it asks, what it does to an audience
- portrait_story: The narrative arc — where it begins, where it turns, where it ends
- portrait_world: The physical, historical, and atmospheric environment the film inhabits
- portrait_subjects: The key people in the film and their significance
- portrait_themes: What the film argues beneath the surface story
- portrait_approach: How the film is being told — observation, testimony, reconstruction, argument, portrait, other
- portrait_tone: The emotional temperature — the feeling of being inside this film
- portrait_visual_world: Visual instincts — palette, light quality, camera relationship to subject
- portrait_audience: Who this film is for and where they will watch it
- portrait_unresolved_questions: An array of open questions this film has not yet answered. Use this shape: { "value": [{ "question": "...", "category": "Historical|Narrative|Strategic", "added_at": "${now}" }], "created_by": "script_upload", "created_in_mode": "script_upload", "updated_at": "${now}" }
- portrait_comparable_films: Films that share this film's tone, approach, or visual sensibility
- portrait_target_length: A specific number in minutes, if determinable from the script

Do not extract portrait_directors_intent. That field belongs to the filmmaker alone.

If you cannot determine a value for a field, omit that field from the portrait object entirely — do not return null or an empty string.

Return only the JSON object. No preamble, no explanation, no markdown formatting.`

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filmId = formData.get('filmId') as string | null

    if (!file || !filmId) {
      return NextResponse.json({ error: 'Missing file or filmId' }, { status: 400 })
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
    const prompt = EXTRACTION_PROMPT(existingMemoryBlock, now)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let scriptText = ''

    if (isPDF) {
      const base64 = buffer.toString('base64')

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
                { type: 'text', text: prompt }
              ]
            }
          ]
        })
      })

      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude PDF read error:', aiData.error)
        return NextResponse.json({ error: 'Could not read your script right now. Try again.' }, { status: 500 })
      }
      scriptText = aiData.content[0].text

    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const docText = result.value.slice(0, 30000)

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
              content: `${prompt}\n\nSCRIPT:\n${docText}`
            }
          ]
        })
      })

      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude DOCX read error:', aiData.error)
        return NextResponse.json({ error: 'Could not read your script right now. Try again.' }, { status: 500 })
      }
      scriptText = aiData.content[0].text
    }

    let extracted: { memory: any; portrait: any }
    try {
      const clean = scriptText.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      console.error('Could not parse Claude script response:', scriptText)
      return NextResponse.json({ error: 'Something went wrong reading your script. Try again.' }, { status: 500 })
    }

    if (extracted.portrait) delete extracted.portrait['portrait_directors_intent']

    const merged = mergeMemory(existingMemory ?? {}, extracted)
    const memoryPayload = { ...merged, updated_at: now }

    if (existingMemory) {
      await supabaseAdmin.from('film_memory').update(memoryPayload).eq('film_id', filmId)
    } else {
      await supabaseAdmin.from('film_memory').insert({ ...memoryPayload, film_id: filmId })
    }

    return NextResponse.json({ success: true, emotional_core: extracted.memory?.emotional_core })

  } catch (error) {
    console.error('Parse script error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
