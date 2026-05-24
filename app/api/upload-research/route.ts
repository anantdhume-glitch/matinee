import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      return NextResponse.json({ error: 'Please upload a PDF or Word document.' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Please upload a document under 10MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    let extractedText = ''

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
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              { type: 'text', text: 'Extract the full text of this document. Return only the extracted text, nothing else. No preamble, no commentary.' }
            ]
          }]
        })
      })
      const aiData = await aiResponse.json()
      if (aiData.error) {
        return NextResponse.json({ error: 'Could not read your document right now. Try again.' }, { status: 500 })
      }
      extractedText = aiData.content[0].text
    } else {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value.slice(0, 30000)
    }

    const now = new Date().toISOString()
    const newDoc = {
      id: crypto.randomUUID(),
      filename: file.name,
      extracted_text: extractedText,
      uploaded_at: now,
    }

    const { data: filmRow } = await supabaseAdmin
      .from('films')
      .select('source_documents')
      .eq('id', filmId)
      .single()

    const existing = filmRow?.source_documents ?? {}
    const existingResearch = existing.research ?? []

    await supabaseAdmin
      .from('films')
      .update({
        source_documents: {
          ...existing,
          research: [...existingResearch, newDoc],
        }
      })
      .eq('id', filmId)

    return NextResponse.json({ success: true, filename: file.name })

  } catch (error) {
    console.error('Upload research error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
