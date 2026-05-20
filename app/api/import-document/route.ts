import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getExtractionPrompt(gateId: string, filmTitle: string, existingMemoryBlock: string): string {
  const ctx = existingMemoryBlock ? `${existingMemoryBlock}\n` : ''

  if (gateId === 'film_brief') {
    return `${ctx}You are reading an externally produced Film Brief for a film called "${filmTitle}".

Extract everything relevant to the following Film Portrait fields:
- portrait_logline: The logline — what this film is, in one sentence
- portrait_emotional_core: The emotional core — what the film makes the audience feel, not what it is about
- portrait_story: The story — beginning, turning point, and end
- portrait_subjects: The subjects — who the people are and why they matter
- portrait_themes: The themes — what the film argues beneath the story
- portrait_approach: The approach — how the film is being told (observation, testimony, reconstruction, etc.)
- portrait_tone: The tone — emotional temperature of the film
- portrait_audience: The audience — who this is for and where they will watch it
- portrait_target_length: Target length — how long the film should be
- portrait_comparable_films: Comparable films — in tone, approach, or visual world

Write a one-paragraph summary in the voice of a thoughtful film collaborator: what the brief revealed clearly, and what was missing or unclear. Plain language. No bullet points in the summary.

Return only a JSON object with this exact shape. No preamble. No explanation outside the JSON:
{
  "extractedPortrait": {
    "portrait_logline": "string or null",
    "portrait_emotional_core": "string or null",
    "portrait_story": "string or null",
    "portrait_subjects": "string or null",
    "portrait_themes": "string or null",
    "portrait_approach": "string or null",
    "portrait_tone": "string or null",
    "portrait_audience": "string or null",
    "portrait_target_length": "string or null",
    "portrait_comparable_films": "string or null"
  },
  "fieldsAbsent": ["field keys where value is null"],
  "summary": "..."
}`
  }

  if (gateId === 'treatment') {
    return `${ctx}You are reading an externally produced Director's Treatment for a film called "${filmTitle}".

Extract everything relevant to the following Film Portrait fields:
- portrait_story: The story — structure, turning points, emotional arc
- portrait_world: The world — physical, atmospheric, historical setting
- portrait_subjects: The subjects — who the people are and why they matter
- portrait_themes: The themes — what the film argues beneath the story
- portrait_approach: The approach — observational, testimony, reconstruction, etc.
- portrait_visual_world: The visual world — light, palette, camera relationship
- portrait_tone: The tone — emotional temperature
- portrait_comparable_films: Comparable films — in tone, approach, or visual world

Write a one-paragraph summary in the voice of a thoughtful film collaborator: what the treatment revealed clearly, and what was missing or unclear. Plain language. No bullet points in the summary.

Return only a JSON object with this exact shape. No preamble. No explanation outside the JSON:
{
  "extractedPortrait": {
    "portrait_story": "string or null",
    "portrait_world": "string or null",
    "portrait_subjects": "string or null",
    "portrait_themes": "string or null",
    "portrait_approach": "string or null",
    "portrait_visual_world": "string or null",
    "portrait_tone": "string or null",
    "portrait_comparable_films": "string or null"
  },
  "fieldsAbsent": ["field keys where value is null"],
  "summary": "..."
}`
  }

  if (gateId === 'department_briefs') {
    return `${ctx}You are reading an externally produced set of Department Briefs for a film called "${filmTitle}".

These briefs represent the Director's instructions to the Narrator, Cinematographer, AI Specialist, Editor, and Sound teams.

Extract everything relevant to the following Film Portrait fields:
- portrait_visual_world: The visual world — light, palette, camera relationship, texture
- portrait_tone: The tone — emotional temperature and pacing character
- portrait_approach: The approach — how the film is being told
- portrait_world: The world — physical, atmospheric, historical setting
- portrait_subjects: The subjects — who the people are and why they matter
- portrait_comparable_films: Comparable films — in tone, approach, or visual world

Write a one-paragraph summary in the voice of a thoughtful film collaborator: what the briefs revealed clearly about the film's direction, and what was missing or unclear. Plain language. No bullet points in the summary.

Return only a JSON object with this exact shape. No preamble. No explanation outside the JSON:
{
  "extractedPortrait": {
    "portrait_visual_world": "string or null",
    "portrait_tone": "string or null",
    "portrait_approach": "string or null",
    "portrait_world": "string or null",
    "portrait_subjects": "string or null",
    "portrait_comparable_films": "string or null"
  },
  "fieldsAbsent": ["field keys where value is null"],
  "summary": "..."
}`
  }

  // Generic fallback for all other gate IDs
  return `${ctx}You are reading an externally produced production document for a film called "${filmTitle}".

Extract everything relevant to the following Film Portrait fields:
- portrait_logline: The logline
- portrait_emotional_core: The emotional core — what the film makes the audience feel
- portrait_story: The story structure
- portrait_world: The world — physical, atmospheric, historical setting
- portrait_subjects: The subjects
- portrait_themes: The themes
- portrait_approach: The approach
- portrait_tone: The tone
- portrait_visual_world: The visual world
- portrait_audience: The audience
- portrait_comparable_films: Comparable films
- portrait_target_length: Target length

Write a one-paragraph summary in the voice of a thoughtful film collaborator: what the document revealed clearly, and what was missing or unclear. Plain language. No bullet points in the summary.

Return only a JSON object with this exact shape. No preamble. No explanation outside the JSON:
{
  "extractedPortrait": {
    "portrait_logline": "string or null",
    "portrait_emotional_core": "string or null",
    "portrait_story": "string or null",
    "portrait_world": "string or null",
    "portrait_subjects": "string or null",
    "portrait_themes": "string or null",
    "portrait_approach": "string or null",
    "portrait_tone": "string or null",
    "portrait_visual_world": "string or null",
    "portrait_audience": "string or null",
    "portrait_comparable_films": "string or null",
    "portrait_target_length": "string or null"
  },
  "fieldsAbsent": ["field keys where value is null"],
  "summary": "..."
}`
}

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

    const [{ data: filmRow }, { data: existingMemory }] = await Promise.all([
      supabaseAdmin.from('films').select('title').eq('id', filmId).single(),
      supabaseAdmin.from('film_memory').select('*').eq('film_id', filmId).single(),
    ])

    const filmTitle = filmRow?.title ?? 'Untitled Film'

    const existingMemoryBlock = existingMemory
      ? `WHAT YOU ALREADY KNOW ABOUT THIS FILM:
- Emotional core: ${existingMemory.emotional_core || 'Nothing yet'}
- Characters: ${existingMemory.characters ? JSON.stringify(existingMemory.characters) : 'Not yet discovered'}
- Decisions made: ${existingMemory.decisions_made || 'None yet'}
- The filmmaker's own words: ${existingMemory.filmmakers_words || 'None captured yet'}
- What is still unresolved: ${existingMemory.unresolved_threads || 'Everything is open'}

`
      : ''

    const prompt = getExtractionPrompt(gateId, filmTitle, existingMemoryBlock)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    let rawResponse: string

    if (isPDF) {
      const base64 = buffer.toString('base64')
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
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
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      })
      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude PDF import error:', aiData.error)
        return NextResponse.json({ error: 'Could not read the document right now. Try again.' }, { status: 500 })
      }
      rawResponse = aiData.content[0].text

    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      const docText = result.value.slice(0, 30000)
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          messages: [{ role: 'user', content: `${prompt}\n\nDOCUMENT:\n${docText}` }],
        }),
      })
      const aiData = await aiResponse.json()
      if (aiData.error) {
        console.error('Claude DOCX import error:', aiData.error)
        return NextResponse.json({ error: 'Could not read the document right now. Try again.' }, { status: 500 })
      }
      rawResponse = aiData.content[0].text
    }

    let parsed: { extractedPortrait: Record<string, string | null>; fieldsAbsent: string[]; summary: string }
    try {
      const clean = rawResponse.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('Could not parse import-document response:', rawResponse)
      return NextResponse.json({ error: 'Something went wrong reading the document. Try again.' }, { status: 500 })
    }

    const { extractedPortrait, fieldsAbsent, summary } = parsed
    const fieldsUpdated = Object.entries(extractedPortrait)
      .filter(([, v]) => v !== null && v !== '')
      .map(([k]) => k)

    return NextResponse.json({ summary, fieldsUpdated, fieldsAbsent, extractedPortrait })

  } catch (error) {
    console.error('Import document error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
