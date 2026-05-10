import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildExtractionPrompt, mergeMemoryFromExtraction } from '@/lib/filmMemory'

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
    const extractionPrompt = buildExtractionPrompt(existingMemoryBlock, now)

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
