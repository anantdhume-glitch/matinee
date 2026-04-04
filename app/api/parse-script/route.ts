import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
          max_tokens: 4000,
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
                {
                  type: 'text',
                  text: `You are reading a film script to extract its creative essence for a filmmaker's companion. Study it carefully. Return ONLY valid JSON with no preamble, no explanation, no markdown fences, no backticks.

{
  "emotional_core": "The emotional heart of this film — what it is trying to make the audience feel. Not the plot. The feeling it wants to leave behind. 2-3 sentences.",
  "characters": [{"name": "Character name", "description": "Who this character is — their emotional truth, what they are carrying, not just their role in the story"}],
  "decisions_made": "The creative choices already made in the script — tone, structure, what kind of film this is and what it has decided not to be. 2-3 sentences.",
  "filmmakers_words": "The most powerful, specific phrases from the script — dialogue or stage direction that captures the soul of the film exactly. 2-4 examples.",
  "unresolved_threads": "What the script leaves open — tensions, questions, things a director will need to interpret and solve. 2-3 sentences."
}`
                }
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
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: `You are reading a film script to extract its creative essence. Return ONLY valid JSON, no preamble, no backticks.

{
  "emotional_core": "The emotional heart of this film. 2-3 sentences.",
  "characters": [{"name": "name", "description": "emotional truth of this character"}],
  "decisions_made": "Creative choices already made in the script. 2-3 sentences.",
  "filmmakers_words": "Most powerful phrases from the script. 2-4 examples.",
  "unresolved_threads": "What the script leaves open for a director to interpret. 2-3 sentences."
}

SCRIPT:
${docText}`
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

    let extracted: any
    try {
      const clean = scriptText.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      console.error('Could not parse Claude script response:', scriptText)
      return NextResponse.json({ error: 'Something went wrong reading your script. Try again.' }, { status: 500 })
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

    return NextResponse.json({ success: true, emotional_core: extracted.emotional_core })

  } catch (error) {
    console.error('Parse script error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}