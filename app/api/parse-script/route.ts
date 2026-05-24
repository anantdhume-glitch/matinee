import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildExtractionPrompt, mergeMemoryFromExtraction } from '@/lib/filmMemory'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
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

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Please upload a document under 10MB.' },
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
    const prompt = buildExtractionPrompt(existingMemoryBlock, now)

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

    const merged = mergeMemoryFromExtraction(existingMemory ?? {}, extracted)
    const memoryPayload = { ...merged, updated_at: now }

    if (existingMemory) {
      await supabaseAdmin.from('film_memory').update(memoryPayload).eq('film_id', filmId)
    } else {
      await supabaseAdmin.from('film_memory').insert({ ...memoryPayload, film_id: filmId })
    }

    // Persist script to source_documents
    const { data: filmRow } = await supabaseAdmin
      .from('films')
      .select('source_documents')
      .eq('id', filmId)
      .single()

    const existing = filmRow?.source_documents ?? {}
    const currentScript = existing.script?.current ?? null

    const newScript = {
      filename: file.name,
      extracted_text: scriptText,
      uploaded_at: now,
    }

    const updatedScript = {
      current: newScript,
      history: currentScript
        ? [...(existing.script?.history ?? []), currentScript]
        : (existing.script?.history ?? []),
    }

    await supabaseAdmin
      .from('films')
      .update({ source_documents: { ...existing, script: updatedScript } })
      .eq('id', filmId)

    return NextResponse.json({ success: true, emotional_core: extracted.memory?.emotional_core })

  } catch (error) {
    console.error('Parse script error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
