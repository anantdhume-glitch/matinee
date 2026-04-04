import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  if (fileName.endsWith('.pdf')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    return data.text
  }
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  throw new Error('Unsupported file type')
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filmId = formData.get('filmId') as string | null

    if (!file || !filmId) {
      return NextResponse.json({ error: 'Missing file or filmId' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = file.name.toLowerCase()

    let scriptText: string
    try {
      scriptText = await extractText(buffer, fileName)
    } catch {
      return NextResponse.json(
        { error: 'Could not read this file. Please try a PDF or Word document.' },
        { status: 400 }
      )
    }

    // 30k chars covers most feature-length scripts without hitting context limits
    const truncated = scriptText.slice(0, 30000)

    const prompt = `You are reading a film script to extract its creative essence for a filmmaker's companion. Study it carefully. Return ONLY valid JSON with no preamble, no explanation, no markdown fences.

{
  "emotional_core": "The emotional heart of this film — what it is trying to make the audience feel. Not the plot. The feeling it wants to leave behind. 2-3 sentences.",
  "characters": [{"name": "Character name", "description": "Who this character is — their emotional truth, what they are carrying, not just their role in the story"}],
  "decisions_made": "The creative choices already made in the script — tone, structure, what kind of film this is and what it has decided not to be. 2-3 sentences.",
  "filmmakers_words": "The most powerful, specific phrases from the script — dialogue or direction that captures the soul of the film exactly. 2-4 direct quotes from the script.",
  "unresolved_threads": "What the script leaves open — tensions, questions, things a director will need to interpret and solve. 2-3 sentences."
}

SCRIPT:
${truncated}`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const aiData = await aiResponse.json()

    if (aiData.error) {
      return NextResponse.json(
        { error: 'Could not read your script right now. Try again.' },
        { status: 500 }
      )
    }

    const rawText = aiData.content[0].text.trim()

    let extracted: any
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      return NextResponse.json(
        { error: 'Something went wrong reading your script.' },
        { status: 500 }
      )
    }

    const memoryPayload = {
      emotional_core: extracted.emotional_core || '',
      characters: extracted.characters || [],
      decisions_made: extracted.decisions_made || '',
      filmmakers_words: extracted.filmmakers_words || '',
      unresolved_threads: extracted.unresolved_threads || '',
      updated_at: new Date().toISOString()
    }

    const { data: existing } = await supabaseAdmin
      .from('film_memory').select('id').eq('film_id', filmId).single()

    if (existing) {
      await supabaseAdmin.from('film_memory').update(memoryPayload).eq('film_id', filmId)
    } else {
      await supabaseAdmin.from('film_memory').insert({ ...memoryPayload, film_id: filmId })
    }

    return NextResponse.json({
      success: true,
      emotional_core: extracted.emotional_core
    })

  } catch (error) {
    console.error('Parse script error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}